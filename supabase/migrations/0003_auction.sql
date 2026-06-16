-- Blind reverse-auction & arbitrage logic.
-- All writes to bids/job settlement go through these SECURITY DEFINER RPCs so
-- bid visibility is never leaked to other drivers or to the operator.

-- ----------------------------------------------------------------------------
-- place_bid: submit a blind bid lower than the current lowest (or the cap).
-- ----------------------------------------------------------------------------
create or replace function place_bid(p_job_id uuid, p_amount numeric)
returns bids
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  current_low numeric;
  result bids;
begin
  select * into j from jobs where id = p_job_id for update;
  if j is null then raise exception 'Job not found'; end if;
  if j.status <> 'open' then raise exception 'Job is not open for bids'; end if;
  if now() > j.expires_at then raise exception 'Bidding window has closed'; end if;

  -- Eligibility (verified driver, region + vehicle match).
  if not driver_eligible_for_job(j) then
    raise exception 'You are not eligible to bid on this job';
  end if;

  if p_amount <= 0 then raise exception 'Bid must be positive'; end if;
  if p_amount > j.max_price_cap then
    raise exception 'Bid cannot exceed the operator cap';   -- never bid higher
  end if;

  -- Reverse auction: must beat the current lowest active bid.
  select min(amount) into current_low from bids where job_id = p_job_id and status = 'active';
  if current_low is not null and p_amount >= current_low then
    raise exception 'Bid must be lower than the current leading bid';
  end if;

  insert into bids (job_id, driver_id, amount, is_buy_now, status)
  values (p_job_id, auth.uid(), p_amount, false, 'active')
  on conflict (job_id, driver_id)
  do update set amount = excluded.amount, created_at = now(), status = 'active'
  returning * into result;

  return result;  -- caller only ever receives their OWN bid row
end $$;

-- ----------------------------------------------------------------------------
-- buy_it_now: instantly secure the job at the full cap, then settle.
-- ----------------------------------------------------------------------------
create or replace function buy_it_now(p_job_id uuid)
returns jobs
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  b bids;
begin
  select * into j from jobs where id = p_job_id for update;
  if j is null then raise exception 'Job not found'; end if;
  if j.status <> 'open' then raise exception 'Job is no longer available'; end if;
  if not driver_eligible_for_job(j) then
    raise exception 'You are not eligible for this job';
  end if;

  insert into bids (job_id, driver_id, amount, is_buy_now, status)
  values (p_job_id, auth.uid(), j.max_price_cap, true, 'active')
  on conflict (job_id, driver_id)
  do update set amount = j.max_price_cap, is_buy_now = true, status = 'active'
  returning * into b;

  return settle_job(p_job_id);
end $$;

-- ----------------------------------------------------------------------------
-- settle_job: pick the lowest active bid as winner, stamp arbitrage spread,
--             mark losers, and open the escrow payment record.
-- ----------------------------------------------------------------------------
create or replace function settle_job(p_job_id uuid)
returns jobs
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  winner bids;
  spread numeric;
begin
  select * into j from jobs where id = p_job_id for update;
  if j is null then raise exception 'Job not found'; end if;
  if j.status not in ('open', 'pending_settlement') then
    raise exception 'Job already settled';
  end if;

  -- Lowest bid wins; ties broken by earliest submission.
  select * into winner
  from bids
  where job_id = p_job_id and status = 'active'
  order by amount asc, created_at asc
  limit 1;

  if winner is null then
    update jobs set status = 'expired' where id = p_job_id returning * into j;
    return j;
  end if;

  spread := j.max_price_cap - winner.amount;   -- platform arbitrage

  update bids set status = 'lost'
   where job_id = p_job_id and id <> winner.id;
  update bids set status = 'won', spread = spread
   where id = winner.id;

  update jobs set
    status = 'awarded',
    winning_bid_id = winner.id,
    awarded_driver_id = winner.driver_id,
    final_payout = winner.amount,
    arbitrage_spread = spread
  where id = p_job_id
  returning * into j;

  -- Escrow ledger: operator is charged the FULL cap (invisible to them).
  insert into payments (job_id, operator_id, driver_id, amount_charged, payout_amount, platform_fee, status)
  values (j.id, j.operator_id, winner.driver_id, j.max_price_cap, winner.amount, spread, 'pending');

  -- NOTE: an edge function (settle-escrow) should now authorize+capture the
  -- operator's card for max_price_cap via Stripe and set payment.status.
  return j;
end $$;

-- ----------------------------------------------------------------------------
-- complete_job: mark the transfer complete and release the escrow payout.
-- ----------------------------------------------------------------------------
create or replace function complete_job(p_job_id uuid)
returns jobs
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
begin
  select * into j from jobs where id = p_job_id for update;
  if j is null then raise exception 'Job not found'; end if;
  if j.status not in ('awarded', 'in_progress') then
    raise exception 'Job is not ready for completion';
  end if;
  -- Only the awarded driver or posting operator may complete.
  if auth.uid() not in (j.awarded_driver_id, j.operator_id) then
    raise exception 'Not authorised to complete this job';
  end if;

  update jobs set status = 'completed' where id = p_job_id returning * into j;
  update payments set status = 'released' where job_id = p_job_id and status in ('held', 'authorized');

  -- NOTE: edge function transfers final_payout to the driver's Connect
  -- account; the platform retains arbitrage_spread.
  return j;
end $$;

-- Expose RPCs to authenticated users.
grant execute on function place_bid(uuid, numeric)  to authenticated;
grant execute on function buy_it_now(uuid)          to authenticated;
grant execute on function complete_job(uuid)        to authenticated;
-- settle_job is internal (called by buy_it_now / a scheduled settler / edge fn).
revoke execute on function settle_job(uuid) from authenticated;
