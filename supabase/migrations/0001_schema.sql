-- Wasted Miles — core schema
-- Phase 1: Blackpool-geofenced B2B airport-transfer marketplace.

create extension if not exists pgcrypto;
create extension if not exists cube;
create extension if not exists earthdistance;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type licensing_authority as enum ('Blackpool', 'Wyre', 'Fylde');
create type subscription_tier   as enum ('free', 'basic', 'premium');
create type vehicle_category    as enum ('standard', 'large');           -- Tier 1 (<=4 / <=8 pax)
create type vehicle_subcategory as enum ('saloon', 'estate', 'executive', 'minibus'); -- Tier 2
create type job_status          as enum ('open', 'pending_settlement', 'awarded', 'in_progress', 'completed', 'cancelled', 'expired');
create type bid_status          as enum ('active', 'won', 'lost', 'withdrawn');
create type payment_status      as enum ('pending', 'authorized', 'held', 'released', 'refunded', 'failed');

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text,
  email                text,
  is_operator          boolean not null default false,
  is_driver            boolean not null default false,
  subscription_tier    subscription_tier not null default 'free',
  licensing_authority  licensing_authority not null default 'Blackpool',

  -- Stripe
  stripe_customer_id   text,           -- operator: card on file
  stripe_account_id    text,           -- driver: Connect express account

  -- Driver verification (triple licensing lock)
  driver_verified      boolean not null default false,
  phd_licence_number   text,           -- Private Hire Driver badge
  phd_licence_expiry   date,
  vehicle_plate        text,           -- Council vehicle plate
  vehicle_plate_expiry date,
  vehicle_category     vehicle_category,
  vehicle_subcategory  vehicle_subcategory,
  passenger_capacity   smallint check (passenger_capacity between 1 and 8),
  luggage_capacity     smallint check (luggage_capacity between 0 and 12),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- jobs
-- ----------------------------------------------------------------------------
create table jobs (
  id                   uuid primary key default gen_random_uuid(),
  operator_id          uuid not null references profiles (id) on delete cascade,
  licensing_authority  licensing_authority not null default 'Blackpool',

  airport_code         text,                       -- e.g. MAN, LPL
  pickup_label         text not null,
  pickup_lat           double precision not null,
  pickup_lng           double precision not null,
  dropoff_label        text not null,
  dropoff_lat          double precision,
  dropoff_lng          double precision,

  vehicle_category     vehicle_category not null,
  vehicle_subcategory  vehicle_subcategory,        -- premium-only precise match
  passengers           smallint not null default 1 check (passengers between 1 and 8),
  luggage              smallint not null default 0 check (luggage between 0 and 12),

  max_price_cap        numeric(8,2) not null check (max_price_cap > 0),

  pickup_at            timestamptz not null,       -- scheduled pickup time
  expires_at           timestamptz not null,       -- bidding window close

  status               job_status not null default 'open',
  winning_bid_id       uuid,                        -- set on settlement (FK added below)
  awarded_driver_id    uuid references profiles (id),
  final_payout         numeric(8,2),                -- winning bid amount
  arbitrage_spread     numeric(8,2),                -- cap - winning bid (platform revenue)

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index jobs_status_idx       on jobs (status);
create index jobs_authority_idx    on jobs (licensing_authority);
create index jobs_pickup_at_idx    on jobs (pickup_at);
create index jobs_operator_idx     on jobs (operator_id);
-- Geo index for proximity queries (lat/lng -> earth point)
create index jobs_geo_idx on jobs using gist (ll_to_earth(pickup_lat, pickup_lng));

-- ----------------------------------------------------------------------------
-- bids  (blind reverse auction)
-- ----------------------------------------------------------------------------
create table bids (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references jobs (id) on delete cascade,
  driver_id   uuid not null references profiles (id) on delete cascade,
  amount      numeric(8,2) not null check (amount > 0),
  is_buy_now  boolean not null default false,
  status      bid_status not null default 'active',
  spread      numeric(8,2),                          -- cap - amount, stamped on win
  created_at  timestamptz not null default now(),
  -- one active bid per driver per job
  unique (job_id, driver_id)
);

create index bids_job_idx    on bids (job_id);
create index bids_driver_idx on bids (driver_id);

alter table jobs
  add constraint jobs_winning_bid_fk
  foreign key (winning_bid_id) references bids (id) on delete set null;

-- ----------------------------------------------------------------------------
-- locations  (last known driver position for proximity dispatch)
-- ----------------------------------------------------------------------------
create table locations (
  driver_id   uuid primary key references profiles (id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  heading     double precision,
  updated_at  timestamptz not null default now()
);

create index locations_geo_idx on locations using gist (ll_to_earth(lat, lng));

-- ----------------------------------------------------------------------------
-- payments  (Stripe escrow ledger)
-- ----------------------------------------------------------------------------
create table payments (
  id                       uuid primary key default gen_random_uuid(),
  job_id                   uuid not null references jobs (id) on delete cascade,
  operator_id              uuid not null references profiles (id),
  driver_id                uuid references profiles (id),
  amount_charged           numeric(8,2) not null,    -- operator pays the cap
  payout_amount            numeric(8,2),             -- driver receives winning bid
  platform_fee             numeric(8,2),             -- arbitrage spread
  stripe_payment_intent_id text,
  stripe_transfer_id       text,
  status                   payment_status not null default 'pending',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index payments_job_idx on payments (job_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_updated  before update on profiles  for each row execute function set_updated_at();
create trigger jobs_updated      before update on jobs      for each row execute function set_updated_at();
create trigger payments_updated  before update on payments  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Phase-1 guardrails (geofence + subscription gating) on job creation
-- ----------------------------------------------------------------------------
create or replace function enforce_job_guardrails() returns trigger
language plpgsql as $$
declare
  op profiles;
begin
  select * into op from profiles where id = new.operator_id;

  -- Triple licensing lock: Phase 1 is Blackpool-only.
  if new.licensing_authority <> 'Blackpool' then
    raise exception 'Phase 1 launch is restricted to the Blackpool licensing authority';
  end if;

  if not op.is_operator then
    raise exception 'Only operators can post jobs';
  end if;

  -- Tier gating: precise subcategory matching requires Premium.
  if new.vehicle_subcategory is not null and op.subscription_tier <> 'premium' then
    raise exception 'Vehicle subcategory matching requires a Premium subscription';
  end if;

  -- Minibus capped at 8 to avoid PSV/PCV multi-council complexity.
  if new.vehicle_subcategory = 'minibus' and new.passengers > 8 then
    raise exception 'Minibus jobs are capped at 8 passengers';
  end if;

  return new;
end $$;

create trigger jobs_guardrails before insert on jobs
  for each row execute function enforce_job_guardrails();
