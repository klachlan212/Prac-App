-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- updated_at trigger function
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- universities (reference, world-readable)
create table universities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  country    text not null default 'AU',
  created_at timestamptz not null default now()
);
alter table universities enable row level security;
create policy "universities are world-readable" on universities for select using (true);

-- profiles
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  university_id uuid references universities(id),
  program       text,
  cohort        text,
  year_level    smallint,
  nurse_track   text not null default 'RN',
  reminder_day  smallint default 0,
  reminder_time time,
  tagging_on    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profiles: owner only" on profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- organizations
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'university',
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table organizations enable row level security;
create trigger organizations_updated_at before update on organizations
  for each row execute function set_updated_at();

-- memberships
create table memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'student',
  cohort     text,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
alter table memberships enable row level security;
create trigger memberships_updated_at before update on memberships
  for each row execute function set_updated_at();
-- Members see their own memberships; org owners/admins see all memberships in their orgs
create policy "memberships: own row" on memberships
  for select using (user_id = auth.uid());
create policy "memberships: admin sees org" on memberships
  for select using (
    exists (
      select 1 from memberships m
      where m.org_id = memberships.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.status = 'active'
    )
  );
create policy "memberships: owner inserts" on memberships
  for insert with check (
    exists (
      select 1 from memberships m
      where m.org_id = memberships.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.status = 'active'
    )
  );

-- invitations
create table invitations (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'student',
  cohort     text,
  token      text not null unique,
  status     text not null default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table invitations enable row level security;
create policy "invitations: admin sees org" on invitations
  for select using (
    exists (
      select 1 from memberships m
      where m.org_id = invitations.org_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
        and m.status = 'active'
    )
  );

-- placements
create table placements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  ward       text,
  hospital   text,
  start_date date,
  end_date   date,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table placements enable row level security;
create policy "placements: owner only" on placements
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create trigger placements_updated_at before update on placements
  for each row execute function set_updated_at();

-- reflections
create table reflections (
  id           uuid primary key default gen_random_uuid(),
  placement_id uuid not null references placements(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  body         text not null,
  reflected_on date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
alter table reflections enable row level security;
create policy "reflections: owner only" on reflections
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create trigger reflections_updated_at before update on reflections
  for each row execute function set_updated_at();

-- ansat_standards (reference, world-readable)
create table ansat_standards (
  id      smallint primary key,
  track   text not null default 'RN',
  ordinal smallint not null,
  title   text not null,
  prompt  text
);
alter table ansat_standards enable row level security;
create policy "ansat_standards are world-readable" on ansat_standards for select using (true);

-- reflection_standards (many-to-many join)
create table reflection_standards (
  reflection_id uuid not null references reflections(id) on delete cascade,
  standard_id   smallint not null references ansat_standards(id),
  primary key (reflection_id, standard_id)
);
alter table reflection_standards enable row level security;
create policy "reflection_standards: owner only" on reflection_standards
  using (
    exists (
      select 1 from reflections r
      where r.id = reflection_standards.reflection_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from reflections r
      where r.id = reflection_standards.reflection_id
        and r.user_id = auth.uid()
    )
  );

-- reflection_tags (on-device derived, owner-scoped)
create table reflection_tags (
  id            uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references reflections(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  label         text not null,
  kind          text not null,
  source        text not null default 'auto',
  created_at    timestamptz not null default now()
);
alter table reflection_tags enable row level security;
create policy "reflection_tags: owner only" on reflection_tags
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin metrics function (counts only, never returns content)
create or replace function get_org_adherence(p_org_id uuid)
returns table (
  user_id            uuid,
  full_name          text,
  cohort             text,
  membership_status  text,
  reflection_count   bigint,
  last_reflected_on  date,
  export_count       bigint,
  on_track           boolean
)
language plpgsql security definer as $$
begin
  -- Verify caller is admin/owner of this org
  if not exists (
    select 1 from memberships m
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
  from memberships mem
  join profiles p on p.id = mem.user_id
  left join placements pl on pl.user_id = p.id and pl.status = 'active'
  left join reflections r on r.placement_id = pl.id
  where mem.org_id = p_org_id
  group by p.id, p.full_name, mem.cohort, mem.status;
end;
$$;
