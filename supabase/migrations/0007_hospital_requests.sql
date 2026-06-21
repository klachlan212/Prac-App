-- 0007_hospital_requests.sql — capture "request a new hospital" submissions.
--
-- Same anonymous-write + moderation pattern as hospital_tips (0004): inserts flow
-- ONLY through a SECURITY DEFINER RPC that forces status='pending'; the table's
-- RLS has no insert/delete policy so direct writes are denied; global moderators
-- read + triage the queue. Best-effort only (rate limiting / captcha are a
-- follow-up); the moderation gate is the real guard. The definer fn pins
-- search_path = '' and fully-qualifies objects, so it adds no new advisory (A4).

create table if not exists hospital_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  note         text check (note is null or char_length(note) <= 300),
  submitted_by text not null default 'Anonymous',
  status       text not null default 'pending'
               check (status in ('pending','reviewed','dismissed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table hospital_requests enable row level security;
create index if not exists hospital_requests_status_idx on hospital_requests (status);

drop trigger if exists hospital_requests_updated_at on hospital_requests;
create trigger hospital_requests_updated_at before update on hospital_requests
  for each row execute function set_updated_at();

-- Moderators read + update (triage) the queue. No insert/delete policy → direct
-- writes denied; submissions flow only through request_hospital().
drop policy if exists "hospital requests: moderators read" on hospital_requests;
create policy "hospital requests: moderators read" on hospital_requests
  for select using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
drop policy if exists "hospital requests: moderators update" on hospital_requests;
create policy "hospital requests: moderators update" on hospital_requests
  for update using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  ) with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );

-- Submit a request (anyone, incl. anonymous). Always queued: pending. Validated
-- server-side regardless of client input.
create or replace function public.request_hospital(
  p_name      text,
  p_note      text default null,
  p_anonymous boolean default true
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_name is null or char_length(btrim(p_name)) = 0 then
    raise exception 'Hospital name required';
  end if;
  if char_length(btrim(p_name)) > 120 then
    raise exception 'Hospital name too long';
  end if;
  if p_note is not null and char_length(p_note) > 300 then
    raise exception 'Note too long';
  end if;

  insert into public.hospital_requests (name, note, submitted_by, status)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_note, '')), ''),
    case when p_anonymous then 'Anonymous' else 'Student' end,
    'pending'
  )
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.request_hospital(text, text, boolean) to anon, authenticated;
