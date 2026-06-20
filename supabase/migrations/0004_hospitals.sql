-- 0004_hospitals.sql — Hospital Directory (community placement logistics).
--
-- Decision (20 Jun 2026): anonymous writes + moderation. Anyone can read
-- PUBLISHED tips and reference cards. Submissions (incl. anonymous) go through a
-- moderation queue: they are insert-only via a SECURITY DEFINER RPC, forced to
-- status='pending'/unpublished, and nothing is publicly visible until a global
-- moderator approves it. Voting is anonymous, deduped best-effort by a client
-- device token via an RPC (no login). Global moderators are flagged on
-- profiles.is_moderator. Best-effort only — production hardening (rate limiting,
-- captcha, IP heuristics) is a follow-up; the moderation gate is the real guard.
--
-- New SECURITY DEFINER functions pin `search_path = ''` and fully-qualify objects
-- so they do NOT add to the existing mutable-search_path advisory (CLAUDE.md A4).

-- Global moderator flag (default false; deny-by-default).
alter table profiles add column if not exists is_moderator boolean not null default false;

-- hospitals (reference; slug as id; world-readable)
create table if not exists hospitals (
  id         text primary key,            -- slug, e.g. 'royal-melbourne'
  name       text not null,
  location   text not null,
  region     text not null,
  intro      text not null,
  curated_by text not null default 'Lachlan',
  created_at timestamptz not null default now()
);
alter table hospitals enable row level security;
drop policy if exists "hospitals are world-readable" on hospitals;
create policy "hospitals are world-readable" on hospitals for select using (true);

-- hospital_reference_cards (official sources; world-readable)
create table if not exists hospital_reference_cards (
  id           uuid primary key default gen_random_uuid(),
  hospital_id  text not null references hospitals(id) on delete cascade,
  category     text not null,
  text         text not null,
  source_url   text not null,
  source_label text not null,
  created_at   timestamptz not null default now()
);
alter table hospital_reference_cards enable row level security;
drop policy if exists "hospital reference cards are world-readable" on hospital_reference_cards;
create policy "hospital reference cards are world-readable"
  on hospital_reference_cards for select using (true);

-- hospital_tips (community + seeded; only PUBLISHED rows are world-readable)
create table if not exists hospital_tips (
  id                uuid primary key default gen_random_uuid(),
  hospital_id       text not null references hospitals(id) on delete cascade,
  category          text not null
                    check (category in ('Transit','StreetCheat','WardLogistics','ShiftFuel','Expectations')),
  sub_category      text,
  text              text not null check (char_length(text) between 1 and 300),
  upvotes           integer not null default 0,
  downvotes         integer not null default 0,
  verification_date date not null default current_date,
  submitted_by      text not null default 'Anonymous',
  submitted_at      timestamptz not null default now(),
  verified_by       text,
  confidence_level  text check (confidence_level in ('High','Medium','Low')),
  status            text not null default 'pending'
                    check (status in ('pending','published','rejected')),
  is_published      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table hospital_tips enable row level security;
drop trigger if exists hospital_tips_updated_at on hospital_tips;
create trigger hospital_tips_updated_at before update on hospital_tips
  for each row execute function set_updated_at();
create index if not exists hospital_tips_hospital_idx on hospital_tips (hospital_id) where is_published;
create index if not exists hospital_tips_status_idx on hospital_tips (status);

-- Moderator check is an inline profiles subquery (no SECURITY DEFINER function
-- exposed over the REST API). It's governed by profiles' own owner-only RLS: a
-- caller reads only their own is_moderator flag; anon (auth.uid() null) → false.

-- Public reads of published tips; moderators see everything (incl. the queue).
drop policy if exists "hospital tips: published are public" on hospital_tips;
create policy "hospital tips: published are public" on hospital_tips
  for select using (
    is_published
    or coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );
-- Moderators can update (approve/reject/edit). No insert/delete policy → direct
-- writes are denied; submissions only flow through submit_hospital_tip().
drop policy if exists "hospital tips: moderators update" on hospital_tips;
create policy "hospital tips: moderators update" on hospital_tips
  for update using (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  ) with check (
    coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
  );

-- hospital_tip_votes (best-effort anonymous dedupe by client token; private).
-- RLS enabled with NO policies → all direct access denied; only the definer RPC
-- below touches it.
create table if not exists hospital_tip_votes (
  tip_id      uuid not null references hospital_tips(id) on delete cascade,
  voter_token text not null,
  direction   smallint not null check (direction in (-1, 1)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (tip_id, voter_token)
);
alter table hospital_tip_votes enable row level security;

-- Submit a tip (anyone, incl. anonymous). Always queued: pending, unpublished,
-- never self-verified. Validates inputs server-side.
create or replace function public.submit_hospital_tip(
  p_hospital_id       text,
  p_category          text,
  p_text              text,
  p_sub_category      text default null,
  p_confidence        text default null,
  p_verification_date date default null,
  p_anonymous         boolean default true
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.hospitals h where h.id = p_hospital_id) then
    raise exception 'Unknown hospital';
  end if;
  if p_category not in ('Transit','StreetCheat','WardLogistics','ShiftFuel','Expectations') then
    raise exception 'Unknown category';
  end if;
  if p_text is null or char_length(btrim(p_text)) = 0 then
    raise exception 'Tip text required';
  end if;
  if char_length(p_text) > 300 then
    raise exception 'Tip too long';
  end if;
  if p_confidence is not null and p_confidence not in ('High','Medium','Low') then
    raise exception 'Bad confidence';
  end if;
  if coalesce(p_verification_date, current_date) > current_date then
    raise exception 'Date in the future';
  end if;

  insert into public.hospital_tips
    (hospital_id, category, sub_category, text, verification_date,
     submitted_by, confidence_level, status, is_published, verified_by)
  values
    (p_hospital_id, p_category,
     nullif(btrim(coalesce(p_sub_category, '')), ''),
     btrim(p_text),
     coalesce(p_verification_date, current_date),
     case when p_anonymous then 'Anonymous' else 'Student' end,
     p_confidence, 'pending', false, null)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.submit_hospital_tip(text, text, text, text, text, date, boolean)
  to anon, authenticated;

-- Cast / toggle a vote (anyone). Best-effort dedupe by (tip, token). Adjusts the
-- tip's aggregate counts incrementally so seeded baselines are preserved.
create or replace function public.cast_hospital_vote(
  p_tip uuid, p_token text, p_dir smallint
)
returns table (upvotes integer, downvotes integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_old smallint;
begin
  if p_dir not in (-1, 1) then
    raise exception 'Bad direction';
  end if;
  if p_token is null or char_length(p_token) not between 8 and 64 then
    raise exception 'Bad token';
  end if;
  if not exists (select 1 from public.hospital_tips t where t.id = p_tip and t.is_published) then
    raise exception 'Unknown tip';
  end if;

  select v.direction into v_old from public.hospital_tip_votes v
    where v.tip_id = p_tip and v.voter_token = p_token;

  -- Table aliased as h on the RHS so the column (not the RETURNS TABLE OUT var of
  -- the same name) is referenced — otherwise `set upvotes = upvotes + 1` is ambiguous.
  if v_old is null then
    insert into public.hospital_tip_votes (tip_id, voter_token, direction)
      values (p_tip, p_token, p_dir);
    if p_dir = 1 then
      update public.hospital_tips as h set upvotes = h.upvotes + 1 where h.id = p_tip;
    else
      update public.hospital_tips as h set downvotes = h.downvotes + 1 where h.id = p_tip;
    end if;
  elsif v_old = p_dir then
    delete from public.hospital_tip_votes where tip_id = p_tip and voter_token = p_token;
    if p_dir = 1 then
      update public.hospital_tips as h set upvotes = greatest(h.upvotes - 1, 0) where h.id = p_tip;
    else
      update public.hospital_tips as h set downvotes = greatest(h.downvotes - 1, 0) where h.id = p_tip;
    end if;
  else
    update public.hospital_tip_votes set direction = p_dir, updated_at = now()
      where tip_id = p_tip and voter_token = p_token;
    if p_dir = 1 then
      update public.hospital_tips as h
        set upvotes = h.upvotes + 1, downvotes = greatest(h.downvotes - 1, 0) where h.id = p_tip;
    else
      update public.hospital_tips as h
        set downvotes = h.downvotes + 1, upvotes = greatest(h.upvotes - 1, 0) where h.id = p_tip;
    end if;
  end if;

  return query select t.upvotes, t.downvotes from public.hospital_tips t where t.id = p_tip;
end;
$$;
grant execute on function public.cast_hospital_vote(uuid, text, smallint) to anon, authenticated;
