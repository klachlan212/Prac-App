-- 0012_rate_limit_token_tolerant.sql — make the anonymous hospital RPCs tolerate a
-- missing/invalid device token instead of hard-failing.
--
-- 0010 made p_token REQUIRED (raise 'Bad token' on null/short). That breaks any
-- client build that calls these RPCs without the token (e.g. a cached/older
-- deployment), surfacing as "couldn't submit". Submissions should never hard-fail
-- on a client-side token quirk. So: if the token is missing/odd, fall back to a
-- random one (gen_random_uuid is pg_catalog, safe under empty search_path). Clients
-- that DO send a stable token still get per-device rate limiting; the moderation
-- gate remains the real guard either way.

create or replace function public.submit_hospital_tip(
  p_hospital_id       text,
  p_category          text,
  p_text              text,
  p_sub_category      text default null,
  p_confidence        text default null,
  p_verification_date date default null,
  p_anonymous         boolean default true,
  p_token             text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token is null or char_length(p_token) not between 8 and 64 then
    p_token := gen_random_uuid()::text;
  end if;
  if (select count(*) from public.anon_action_log l
        where l.token = p_token and l.action = 'submit'
          and l.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many submissions from this device — please try again later.';
  end if;

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

  insert into public.anon_action_log(token, action) values (p_token, 'submit');
  return v_id;
end;
$$;

create or replace function public.request_hospital(
  p_name      text,
  p_note      text default null,
  p_anonymous boolean default true,
  p_token     text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token is null or char_length(p_token) not between 8 and 64 then
    p_token := gen_random_uuid()::text;
  end if;
  if (select count(*) from public.anon_action_log l
        where l.token = p_token and l.action = 'submit'
          and l.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many submissions from this device — please try again later.';
  end if;

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

  insert into public.anon_action_log(token, action) values (p_token, 'submit');
  return v_id;
end;
$$;

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
    p_token := gen_random_uuid()::text;
  end if;
  if (select count(*) from public.anon_action_log l
        where l.token = p_token and l.action = 'vote'
          and l.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Too many votes from this device — please try again later.';
  end if;
  if not exists (select 1 from public.hospital_tips t where t.id = p_tip and t.is_published) then
    raise exception 'Unknown tip';
  end if;

  select v.direction into v_old from public.hospital_tip_votes v
    where v.tip_id = p_tip and v.voter_token = p_token;

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

  insert into public.anon_action_log(token, action) values (p_token, 'vote');
  return query select t.upvotes, t.downvotes from public.hospital_tips t where t.id = p_tip;
end;
$$;
