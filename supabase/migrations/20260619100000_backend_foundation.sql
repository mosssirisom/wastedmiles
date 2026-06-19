-- Wasted Miles backend foundation
-- Apply in Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type public.operator_role as enum ('owner', 'dispatcher', 'driver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.operator_status as enum ('pending', 'verified', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('not_started', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journey_status as enum ('draft', 'available', 'empty_return', 'cover_needed', 'urgent', 'claimed', 'matched', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.journey_kind as enum ('standard', 'empty_return', 'cover_request');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.claim_status as enum ('pending', 'accepted', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- core tables ----------
create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  email text,
  phone text,
  website text,
  base_town text,
  base_postcode text,
  service_areas text[] not null default '{}',
  vehicle_types text[] not null default '{}',
  fleet_summary text,
  status public.operator_status not null default 'pending',
  verification_status public.verification_status not null default 'not_started',
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  completed_journeys integer not null default 0 check (completed_journeys >= 0),
  acceptance_rate numeric(5,2) not null default 0 check (acceptance_rate >= 0 and acceptance_rate <= 100),
  on_time_rate numeric(5,2) not null default 0 check (on_time_rate >= 0 and on_time_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_members (
  operator_id uuid not null references public.operators(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.operator_role not null default 'driver',
  created_at timestamptz not null default now(),
  primary key (operator_id, user_id)
);

create table if not exists public.airports (
  id text primary key,
  code text not null unique,
  name text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  posting_operator_id uuid not null references public.operators(id) on delete cascade,
  claimed_by_operator_id uuid references public.operators(id) on delete set null,
  airport_id text references public.airports(id),
  kind public.journey_kind not null default 'standard',
  status public.journey_status not null default 'available',
  pickup_address text not null,
  pickup_town text,
  pickup_postcode text,
  dropoff_address text not null,
  dropoff_town text,
  dropoff_postcode text,
  pickup_time timestamptz not null,
  flight_number text,
  passenger_count integer not null default 1 check (passenger_count > 0),
  luggage_count integer not null default 0 check (luggage_count >= 0),
  seats_available integer check (seats_available is null or seats_available >= 0),
  vehicle_type text not null,
  price_gbp numeric(10,2) not null check (price_gbp >= 0),
  notes text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  response_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journey_claims (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  claiming_operator_id uuid not null references public.operators(id) on delete cascade,
  status public.claim_status not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (journey_id, claiming_operator_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid references public.journeys(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, operator_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_operator_id uuid references public.operators(id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.operator_documents (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  status public.verification_status not null default 'pending',
  rejection_reason text,
  uploaded_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists idx_operator_members_user on public.operator_members(user_id);
create index if not exists idx_journeys_status_pickup on public.journeys(status, pickup_time);
create index if not exists idx_journeys_airport on public.journeys(airport_id);
create index if not exists idx_journeys_posting_operator on public.journeys(posting_operator_id);
create index if not exists idx_journey_claims_journey on public.journey_claims(journey_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);

-- ---------- updated_at triggers ----------
drop trigger if exists trg_operators_updated_at on public.operators;
create trigger trg_operators_updated_at before update on public.operators for each row execute function public.touch_updated_at();

drop trigger if exists trg_journeys_updated_at on public.journeys;
create trigger trg_journeys_updated_at before update on public.journeys for each row execute function public.touch_updated_at();

drop trigger if exists trg_journey_claims_updated_at on public.journey_claims;
create trigger trg_journey_claims_updated_at before update on public.journey_claims for each row execute function public.touch_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations for each row execute function public.touch_updated_at();

-- ---------- matching view ----------
create or replace view public.available_marketplace_journeys as
select
  j.*,
  a.code as airport_code,
  a.name as airport_name,
  o.name as posting_operator_name,
  o.rating as posting_operator_rating,
  o.completed_journeys as posting_operator_completed
from public.journeys j
join public.operators o on o.id = j.posting_operator_id
left join public.airports a on a.id = j.airport_id
where j.status in ('available', 'empty_return', 'cover_needed', 'urgent')
  and j.pickup_time >= now() - interval '2 hours'
  and o.status = 'verified';

-- ---------- RLS ----------
alter table public.operators enable row level security;
alter table public.operator_members enable row level security;
alter table public.airports enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_claims enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.operator_documents enable row level security;

create policy "public can read verified operators" on public.operators
  for select using (status = 'verified' or owner_user_id = auth.uid());

create policy "users can create their operator" on public.operators
  for insert with check (owner_user_id = auth.uid());

create policy "operator owners can update operator" on public.operators
  for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy "members can read own memberships" on public.operator_members
  for select using (user_id = auth.uid() or exists (
    select 1 from public.operator_members om where om.operator_id = operator_members.operator_id and om.user_id = auth.uid()
  ));

create policy "owners can manage members" on public.operator_members
  for all using (exists (
    select 1 from public.operators o where o.id = operator_members.operator_id and o.owner_user_id = auth.uid()
  ));

create policy "airports are public read" on public.airports
  for select using (active = true);

create policy "verified members can read marketplace journeys" on public.journeys
  for select using (
    status in ('available', 'empty_return', 'cover_needed', 'urgent')
    or exists (select 1 from public.operator_members om where om.operator_id in (journeys.posting_operator_id, journeys.claimed_by_operator_id) and om.user_id = auth.uid())
  );

create policy "operators can post journeys" on public.journeys
  for insert with check (exists (
    select 1 from public.operator_members om join public.operators o on o.id = om.operator_id
    where om.operator_id = posting_operator_id and om.user_id = auth.uid() and o.status = 'verified'
  ));

create policy "posting operators can update journeys" on public.journeys
  for update using (exists (
    select 1 from public.operator_members om where om.operator_id = journeys.posting_operator_id and om.user_id = auth.uid()
  ));

create policy "operators can create claims" on public.journey_claims
  for insert with check (exists (
    select 1 from public.operator_members om join public.operators o on o.id = om.operator_id
    where om.operator_id = claiming_operator_id and om.user_id = auth.uid() and o.status = 'verified'
  ));

create policy "operators can read related claims" on public.journey_claims
  for select using (exists (
    select 1 from public.journeys j
    join public.operator_members om on om.operator_id in (j.posting_operator_id, journey_claims.claiming_operator_id)
    where j.id = journey_claims.journey_id and om.user_id = auth.uid()
  ));

create policy "operators can update related claims" on public.journey_claims
  for update using (exists (
    select 1 from public.journeys j
    join public.operator_members om on om.operator_id in (j.posting_operator_id, journey_claims.claiming_operator_id)
    where j.id = journey_claims.journey_id and om.user_id = auth.uid()
  ));

create policy "participants can read conversations" on public.conversations
  for select using (exists (
    select 1 from public.conversation_participants cp
    join public.operator_members om on om.operator_id = cp.operator_id
    where cp.conversation_id = conversations.id and om.user_id = auth.uid()
  ));

create policy "members can read participants" on public.conversation_participants
  for select using (exists (
    select 1 from public.operator_members om where om.operator_id = conversation_participants.operator_id and om.user_id = auth.uid()
  ));

create policy "participants can read messages" on public.messages
  for select using (exists (
    select 1 from public.conversation_participants cp
    join public.operator_members om on om.operator_id = cp.operator_id
    where cp.conversation_id = messages.conversation_id and om.user_id = auth.uid()
  ));

create policy "participants can send messages" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      join public.operator_members om on om.operator_id = cp.operator_id
      where cp.conversation_id = messages.conversation_id and om.user_id = auth.uid()
    )
  );

create policy "operators can manage own documents" on public.operator_documents
  for all using (exists (
    select 1 from public.operator_members om where om.operator_id = operator_documents.operator_id and om.user_id = auth.uid()
  ));

-- ---------- seed airports ----------
insert into public.airports (id, code, name, latitude, longitude) values
  ('manchester', 'MAN', 'Manchester Airport', 53.365000, -2.272000),
  ('liverpool', 'LPL', 'Liverpool John Lennon Airport', 53.336000, -2.850000),
  ('leeds-bradford', 'LBA', 'Leeds Bradford Airport', 53.866000, -1.660000),
  ('birmingham', 'BHX', 'Birmingham Airport', 52.454000, -1.748000),
  ('heathrow', 'LHR', 'Heathrow Airport', 51.470000, -0.454000),
  ('gatwick', 'LGW', 'Gatwick Airport', 51.153000, -0.182000),
  ('luton', 'LTN', 'London Luton Airport', 51.875000, -0.368000),
  ('stansted', 'STN', 'London Stansted Airport', 51.885000, 0.235000),
  ('glasgow', 'GLA', 'Glasgow Airport', 55.872000, -4.433000),
  ('edinburgh', 'EDI', 'Edinburgh Airport', 55.950000, -3.372000)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  latitude = excluded.latitude,
  longitude = excluded.longitude;
