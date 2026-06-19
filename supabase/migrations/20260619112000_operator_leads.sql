-- Public lead capture for operators joining before full verification.

create table if not exists public.operator_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  email text not null,
  fleet_size text,
  phone text,
  source text not null default 'wasted-miles-web',
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_operator_leads_email on public.operator_leads(email);
create index if not exists idx_operator_leads_status_created on public.operator_leads(status, created_at desc);

alter table public.operator_leads enable row level security;

create policy "anyone can create operator leads" on public.operator_leads
  for insert with check (true);

create policy "authenticated users can read operator leads" on public.operator_leads
  for select using (auth.role() = 'authenticated');
