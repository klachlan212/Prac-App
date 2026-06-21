-- 0008_security_hardening.sql — audit fixes M2, M3, M6 (mechanical/low-risk).
--
-- M2: read-only reference tables must not rely on RLS alone — revoke write DML
--     from anon/authenticated (RLS only ever exposed SELECT on these).
-- M3: pin `search_path = ''` on the three pre-0004 SECURITY DEFINER functions,
--     matching the 0004/0007 pattern (all objects fully-qualified). CREATE OR
--     REPLACE preserves the existing EXECUTE grants.
-- M6: bound reflection free-text length at the database.

-- ── M2: lock down read-only reference tables ────────────────────────────────
revoke insert, update, delete on
  public.universities,
  public.ansat_standards,
  public.ansat_items,
  public.skill_library,
  public.skill_ansat_map
from anon, authenticated;

-- ── M3: pin search_path on the legacy SECURITY DEFINER functions ────────────
create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invitations%rowtype;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  select * into v_invite from public.invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invitation is for a different email';
  end if;

  insert into public.memberships (org_id, user_id, role, cohort, status)
  values (v_invite.org_id, auth.uid(), v_invite.role, v_invite.cohort, 'active')
  on conflict (org_id, user_id) do update set status = 'active';

  update public.invitations set status = 'accepted' where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

create or replace function public.create_organization(p_name text, p_kind text default 'university')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organizations (name, kind, created_by)
  values (p_name, coalesce(p_kind, 'university'), auth.uid())
  returning id into v_org_id;

  insert into public.memberships (org_id, user_id, role, status)
  values (v_org_id, auth.uid(), 'owner', 'active');

  return v_org_id;
end;
$$;

create or replace function public.get_org_adherence(p_org_id uuid)
returns table (
  user_id uuid, full_name text, cohort text, membership_status text,
  reflection_count bigint, last_reflected_on date, export_count bigint, on_track boolean
)
language plpgsql security definer set search_path = '' as $$
begin
  -- Caller must be an active owner/admin of this org.
  if not exists (
    select 1 from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
      and m.status = 'active'
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id as user_id,
    p.full_name,
    mem.cohort,
    mem.status as membership_status,
    count(r.id) filter (where r.deleted_at is null) as reflection_count,
    max(r.reflected_on) as last_reflected_on,
    0::bigint as export_count,
    (
      max(r.reflected_on) is not null
      and max(r.reflected_on) >= current_date - interval '7 days'
    ) as on_track
  from public.memberships mem
  join public.profiles p on p.id = mem.user_id
  left join public.placements pl on pl.user_id = p.id and pl.status = 'active'
  left join public.reflections r on r.placement_id = pl.id
  where mem.org_id = p_org_id
  group by p.id, p.full_name, mem.cohort, mem.status;
end;
$$;

-- ── M6: bound reflection free-text length (idempotent) ──────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reflections_body_len') then
    alter table public.reflections add constraint reflections_body_len
      check (body is null or char_length(body) <= 10000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reflections_what_happened_len') then
    alter table public.reflections add constraint reflections_what_happened_len
      check (what_happened is null or char_length(what_happened) <= 10000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reflections_so_what_len') then
    alter table public.reflections add constraint reflections_so_what_len
      check (so_what is null or char_length(so_what) <= 10000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reflections_now_what_len') then
    alter table public.reflections add constraint reflections_now_what_len
      check (now_what is null or char_length(now_what) <= 10000);
  end if;
end $$;
