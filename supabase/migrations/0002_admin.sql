-- Bootstrap function for organization creation.
--
-- The memberships RLS insert policy requires the caller to already be an
-- active owner/admin of the org — which is impossible for a brand-new org
-- (chicken-and-egg). This security-definer function creates the organization
-- and the caller's owner membership atomically, then RLS governs everything
-- afterwards. It grants the caller ownership of *only* the org they just made.

create or replace function create_organization(p_name text, p_kind text default 'university')
returns uuid
language plpgsql security definer as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into organizations (name, kind, created_by)
  values (p_name, coalesce(p_kind, 'university'), auth.uid())
  returning id into v_org_id;

  insert into memberships (org_id, user_id, role, status)
  values (v_org_id, auth.uid(), 'owner', 'active');

  return v_org_id;
end;
$$;

-- Accept an organization invitation. A student arriving from an invite (token)
-- is joined to the org on first sign-in (spec §8.2). Security-definer so the
-- new member can be created before they have any membership-based permissions.
-- Validates the token, expiry, and that the invite matches the caller's email.
create or replace function accept_invitation(p_token text)
returns uuid
language plpgsql security definer as $$
declare
  v_invite invitations%rowtype;
  v_email  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  select * into v_invite from invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'Invitation is for a different email';
  end if;

  insert into memberships (org_id, user_id, role, cohort, status)
  values (v_invite.org_id, auth.uid(), v_invite.role, v_invite.cohort, 'active')
  on conflict (org_id, user_id) do update set status = 'active';

  update invitations set status = 'accepted' where id = v_invite.id;

  return v_invite.org_id;
end;
$$;
