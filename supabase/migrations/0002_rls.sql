-- Row Level Security: enforces blind bidding, verification gating and geofence.

alter table profiles  enable row level security;
alter table jobs      enable row level security;
alter table bids      enable row level security;
alter table locations enable row level security;
alter table payments  enable row level security;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- Vehicle matching rules (Tier 1 broad, Tier 2 precise).
create or replace function vehicle_matches(
  req_category   vehicle_category,
  req_subcategory vehicle_subcategory,
  drv_category   vehicle_category,
  drv_subcategory vehicle_subcategory,
  req_passengers smallint,
  drv_capacity   smallint
) returns boolean
language plpgsql immutable as $$
begin
  if drv_capacity is null or drv_capacity < req_passengers then
    return false;
  end if;

  -- Broad category must be satisfiable by the driver's capacity.
  if req_category = 'large' and coalesce(drv_capacity, 0) < 5 then
    return false;
  end if;

  -- Precise subcategory (Premium). Saloons cannot fulfil Estate requests.
  if req_subcategory is not null then
    if drv_subcategory is null then
      return false;
    end if;
    return case req_subcategory
      when 'estate'    then drv_subcategory in ('estate', 'minibus')
      when 'executive' then drv_subcategory in ('executive', 'minibus')
      when 'minibus'   then drv_subcategory = 'minibus'
      when 'saloon'    then drv_subcategory in ('saloon', 'estate', 'executive')
      else drv_subcategory = req_subcategory
    end;
  end if;

  return true;
end $$;

-- Is the current user a verified driver eligible for this job?
create or replace function driver_eligible_for_job(j jobs) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  d profiles;
begin
  select * into d from profiles where id = auth.uid();
  if d is null or not d.is_driver or not d.driver_verified then
    return false;
  end if;
  if d.licensing_authority <> j.licensing_authority then
    return false;  -- council region match
  end if;
  return vehicle_matches(
    j.vehicle_category, j.vehicle_subcategory,
    d.vehicle_category, d.vehicle_subcategory,
    j.passengers, d.passenger_capacity
  );
end $$;

-- ----------------------------------------------------------------------------
-- profiles: a user manages their own row
-- ----------------------------------------------------------------------------
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_insert_own on profiles for insert with check (id = auth.uid());
create policy profiles_update_own on profiles for update using (id = auth.uid());

-- ----------------------------------------------------------------------------
-- jobs
--   operators: full access to their own jobs
--   drivers:   may only read OPEN jobs they are eligible for
-- ----------------------------------------------------------------------------
create policy jobs_operator_all on jobs
  for all using (operator_id = auth.uid())
  with check (operator_id = auth.uid());

create policy jobs_driver_browse on jobs
  for select using (status = 'open' and driver_eligible_for_job(jobs));

-- ----------------------------------------------------------------------------
-- bids — BLIND: a driver sees ONLY their own bids. Operators see none.
--   Inserts go through place_bid()/buy_it_now() (SECURITY DEFINER) only.
-- ----------------------------------------------------------------------------
create policy bids_select_own on bids
  for select using (driver_id = auth.uid());
-- (No insert/update/delete policies => direct writes are blocked; use RPC.)

-- ----------------------------------------------------------------------------
-- locations — a driver writes & reads only their own position
-- ----------------------------------------------------------------------------
create policy locations_rw_own on locations
  for all using (driver_id = auth.uid())
  with check (driver_id = auth.uid());

-- ----------------------------------------------------------------------------
-- payments — visible to the two counterparties only
-- ----------------------------------------------------------------------------
create policy payments_select_party on payments
  for select using (operator_id = auth.uid() or driver_id = auth.uid());
