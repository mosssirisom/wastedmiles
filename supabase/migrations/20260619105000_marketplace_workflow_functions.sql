-- Atomic workflow helpers for Wasted Miles marketplace operations.

create or replace function public.is_verified_operator_member(p_operator_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.operator_members om
    join public.operators o on o.id = om.operator_id
    where om.operator_id = p_operator_id
      and om.user_id = auth.uid()
      and o.status = 'verified'
  );
$$;

create or replace function public.claim_journey_atomic(
  p_journey_id uuid,
  p_claiming_operator_id uuid,
  p_message text default null
)
returns public.journey_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journey public.journeys%rowtype;
  v_claim public.journey_claims%rowtype;
begin
  if not public.is_verified_operator_member(p_claiming_operator_id) then
    raise exception 'Only verified operator members can claim journeys';
  end if;

  select * into v_journey
  from public.journeys
  where id = p_journey_id
  for update;

  if not found then
    raise exception 'Journey not found';
  end if;

  if v_journey.posting_operator_id = p_claiming_operator_id then
    raise exception 'Operators cannot claim their own journey';
  end if;

  if v_journey.status not in ('available', 'empty_return', 'cover_needed', 'urgent') then
    raise exception 'Journey is no longer available';
  end if;

  insert into public.journey_claims (journey_id, claiming_operator_id, message)
  values (p_journey_id, p_claiming_operator_id, p_message)
  on conflict (journey_id, claiming_operator_id)
  do update set
    message = excluded.message,
    status = 'pending',
    updated_at = now()
  returning * into v_claim;

  return v_claim;
end;
$$;

create or replace function public.accept_journey_claim(p_claim_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.journey_claims%rowtype;
  v_journey public.journeys%rowtype;
  v_conversation_id uuid;
begin
  select * into v_claim
  from public.journey_claims
  where id = p_claim_id
  for update;

  if not found then
    raise exception 'Claim not found';
  end if;

  select * into v_journey
  from public.journeys
  where id = v_claim.journey_id
  for update;

  if not exists (
    select 1 from public.operator_members om
    where om.operator_id = v_journey.posting_operator_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'dispatcher')
  ) then
    raise exception 'Only the posting operator can accept this claim';
  end if;

  if v_journey.status not in ('available', 'empty_return', 'cover_needed', 'urgent') then
    raise exception 'Journey is no longer available';
  end if;

  update public.journey_claims
  set status = case when id = p_claim_id then 'accepted' else 'declined' end,
      updated_at = now()
  where journey_id = v_claim.journey_id;

  update public.journeys
  set claimed_by_operator_id = v_claim.claiming_operator_id,
      status = 'claimed',
      updated_at = now()
  where id = v_claim.journey_id;

  insert into public.conversations (journey_id)
  values (v_claim.journey_id)
  returning id into v_conversation_id;

  insert into public.conversation_participants (conversation_id, operator_id)
  values
    (v_conversation_id, v_journey.posting_operator_id),
    (v_conversation_id, v_claim.claiming_operator_id)
  on conflict do nothing;

  return v_conversation_id;
end;
$$;

create or replace function public.complete_journey(p_journey_id uuid)
returns public.journeys
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journey public.journeys%rowtype;
begin
  select * into v_journey
  from public.journeys
  where id = p_journey_id
  for update;

  if not found then
    raise exception 'Journey not found';
  end if;

  if not exists (
    select 1 from public.operator_members om
    where om.user_id = auth.uid()
      and om.operator_id in (v_journey.posting_operator_id, v_journey.claimed_by_operator_id)
  ) then
    raise exception 'Only related operators can complete this journey';
  end if;

  update public.journeys
  set status = 'completed', updated_at = now()
  where id = p_journey_id
  returning * into v_journey;

  update public.operators
  set completed_journeys = completed_journeys + 1
  where id in (v_journey.posting_operator_id, v_journey.claimed_by_operator_id);

  return v_journey;
end;
$$;

grant execute on function public.is_verified_operator_member(uuid) to authenticated;
grant execute on function public.claim_journey_atomic(uuid, uuid, text) to authenticated;
grant execute on function public.accept_journey_claim(uuid) to authenticated;
grant execute on function public.complete_journey(uuid) to authenticated;
