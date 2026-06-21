-- v1 core-loop data model (spec §3, §5). Additive + idempotent.
-- Adds: structured 3-prompt reflection + draft state, ANSAT 23-item structure,
-- skill library + skill→ANSAT map (reference), skills_logged + identifier_flags
-- (owner-scoped). "ANSAT" naming is internal only; the UI renders "NMBA standards".

-- 1) Reflection: three soft prompts + draft state. body becomes optional
--    (the editor now writes the structured fields; body keeps a short summary).
alter table reflections add column if not exists what_happened text;
alter table reflections add column if not exists so_what       text;
alter table reflections add column if not exists now_what      text;
alter table reflections add column if not exists status        text not null default 'saved';
alter table reflections alter column body drop not null;

-- Item-level mapping on the standards join (e.g. "2.3 communicates effectively").
alter table reflection_standards add column if not exists item_code text;

-- 2) ANSAT items — 23-item structure under the 7 standards (internal naming OK).
create table if not exists ansat_items (
  code        text primary key,
  standard_id smallint not null references ansat_standards(id),
  ordinal     smallint not null,
  label       text not null
);
alter table ansat_items enable row level security;
drop policy if exists "ansat_items world-readable" on ansat_items;
create policy "ansat_items world-readable" on ansat_items for select using (true);

-- 3) Skill library (reference, world-readable).
create table if not exists skill_library (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text,
  track      text not null default 'RN',
  created_at timestamptz not null default now(),
  unique (name, track)
);
alter table skill_library enable row level security;
drop policy if exists "skill_library world-readable" on skill_library;
create policy "skill_library world-readable" on skill_library for select using (true);

-- 4) skill → ANSAT map (reference). The clinician-authored moat; starter content seeded.
create table if not exists skill_ansat_map (
  skill_id    uuid not null references skill_library(id) on delete cascade,
  standard_id smallint not null references ansat_standards(id),
  item_code   text references ansat_items(code),
  primary key (skill_id, standard_id)
);
alter table skill_ansat_map enable row level security;
drop policy if exists "skill_ansat_map world-readable" on skill_ansat_map;
create policy "skill_ansat_map world-readable" on skill_ansat_map for select using (true);

-- 5) Skills logged by a student (owner-scoped). reflection_id NULL = standalone
--    "just log a skill". raw_text = free-text fallback, queued for normalisation.
create table if not exists skills_logged (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  reflection_id uuid references reflections(id) on delete cascade,
  skill_id      uuid references skill_library(id),
  raw_text      text,
  status        text not null default 'new',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
alter table skills_logged enable row level security;
drop policy if exists "skills_logged: owner only" on skills_logged;
create policy "skills_logged: owner only" on skills_logged
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists skills_logged_user_idx on skills_logged(user_id);
create index if not exists skills_logged_reflection_idx on skills_logged(reflection_id);

-- 6) Identifier flags (owner-scoped) — the "to review" pill persists (spec §4).
create table if not exists identifier_flags (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  reflection_id uuid not null references reflections(id) on delete cascade,
  label         text not null,
  kind          text not null,
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);
alter table identifier_flags enable row level security;
drop policy if exists "identifier_flags: owner only" on identifier_flags;
create policy "identifier_flags: owner only" on identifier_flags
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists identifier_flags_reflection_idx on identifier_flags(reflection_id);
