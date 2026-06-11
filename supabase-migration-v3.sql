-- ============================================================
--  Soyo88 — v3 migration: Teams (organizations, work cards, leads)
--  Run AFTER v1 schema and v2 migration. Safe to run twice.
--  Supabase -> SQL Editor -> New query -> paste all -> Run.
-- ============================================================

-- ---------- Organizations ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

-- ---------- Members (one row per rep; carries their WORK CARD) ----------
create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'rep' check (role in ('admin', 'rep')),
  -- the work card: a separate shareable identity from the personal profile
  work_share_id uuid not null unique default gen_random_uuid(),
  title text,
  work_email text,
  work_phone text,
  headline text,
  card_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ---------- Invites (matched by email; no tokens needed) ----------
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  org_name text not null,
  email text not null,
  role text not null default 'rep' check (role in ('admin', 'rep')),
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

-- ---------- Leads (captures that flow to the company) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rep_user_id uuid not null references auth.users (id) on delete cascade,
  lead_user_id uuid references auth.users (id) on delete set null,
  name text not null,
  email text,
  company text,
  role text,
  phone text,
  note text,
  source text not null default 'quick_capture', -- or 'connection'
  created_at timestamptz not null default now()
);

create index if not exists leads_org_idx on public.leads (org_id, created_at desc);

-- ============================================================
--  Helper: the orgs the signed-in user belongs to.
--  (security definer avoids recursive RLS on org_members)
-- ============================================================
create or replace function public.my_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select org_id from public.org_members where user_id = auth.uid();
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.org_invites enable row level security;
alter table public.leads enable row level security;

drop policy if exists "orgs - member select" on public.organizations;
create policy "orgs - member select" on public.organizations
  for select using (id in (select public.my_org_ids()));

drop policy if exists "members - org select" on public.org_members;
create policy "members - org select" on public.org_members
  for select using (org_id in (select public.my_org_ids()));

drop policy if exists "members - own update" on public.org_members;
create policy "members - own update" on public.org_members
  for update using (user_id = auth.uid());

drop policy if exists "invites - mine or org" on public.org_invites;
create policy "invites - mine or org" on public.org_invites
  for select using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or org_id in (select public.my_org_ids())
  );

drop policy if exists "invites - admin insert" on public.org_invites;
create policy "invites - admin insert" on public.org_invites
  for insert with check (public.is_org_admin(org_id));

drop policy if exists "invites - admin delete" on public.org_invites;
create policy "invites - admin delete" on public.org_invites
  for delete using (public.is_org_admin(org_id));

drop policy if exists "leads - org select" on public.leads;
create policy "leads - org select" on public.leads
  for select using (org_id in (select public.my_org_ids()));

drop policy if exists "leads - admin delete" on public.leads;
create policy "leads - admin delete" on public.leads
  for delete using (public.is_org_admin(org_id));

-- ============================================================
--  Create an org (caller becomes admin in one step)
-- ============================================================
create or replace function public.create_organization(p_name text, p_domain text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_org uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name required'; end if;

  insert into organizations (name, domain, created_by)
  values (trim(p_name), nullif(trim(p_domain), ''), v_me)
  returning id into v_org;

  insert into org_members (org_id, user_id, role)
  values (v_org, v_me, 'admin');

  return v_org;
end;
$$;

-- ============================================================
--  Accept an invite addressed to my email
-- ============================================================
create or replace function public.accept_invite(p_invite uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv record;
  v_member uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;

  select * into v_inv from org_invites
  where id = p_invite and accepted = false and lower(email) = v_email;
  if v_inv is null then raise exception 'Invite not found for your email'; end if;

  insert into org_members (org_id, user_id, role)
  values (v_inv.org_id, v_me, v_inv.role)
  on conflict (org_id, user_id) do nothing;

  select id into v_member from org_members
  where org_id = v_inv.org_id and user_id = v_me;

  update org_invites set accepted = true where id = p_invite;
  return v_member;
end;
$$;

-- ============================================================
--  Public read of a WORK card by its share id (anon allowed)
-- ============================================================
create or replace function public.get_work_card(p_share_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'share_id', m.work_share_id,
    'full_name', coalesce(p.full_name, 'Unnamed'),
    'avatar_url', case when p.share_avatar then p.avatar_url end,
    'title', m.title,
    'work_email', m.work_email,
    'work_phone', m.work_phone,
    'headline', m.headline,
    'org_name', o.name
  )
  from org_members m
  join organizations o on o.id = m.org_id
  left join profiles p on p.id = m.user_id
  where m.work_share_id = p_share_id and m.card_active;
$$;

-- ============================================================
--  Quick capture: a visitor (no account) shares their info
--  with the rep's company. Anon-callable, insert-only.
-- ============================================================
create or replace function public.capture_lead(
  p_share_id uuid,
  p_name text,
  p_email text,
  p_company text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m record;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'Name required'; end if;
  if length(coalesce(p_name,'')) > 200 or length(coalesce(p_email,'')) > 200
     or length(coalesce(p_company,'')) > 200 or length(coalesce(p_note,'')) > 2000 then
    raise exception 'Input too long';
  end if;

  select * into v_m from org_members
  where work_share_id = p_share_id and card_active;
  if v_m is null then raise exception 'Card not found'; end if;

  insert into leads (org_id, rep_user_id, name, email, company, note, source)
  values (v_m.org_id, v_m.user_id, trim(p_name), nullif(trim(p_email), ''),
          nullif(trim(p_company), ''), nullif(trim(p_note), ''), 'quick_capture');
end;
$$;

-- ============================================================
--  Signed-in user connects with a WORK card:
--  1) rep's work card -> my contacts
--  2) my shared profile -> rep's contacts
--  3) my shared profile -> company leads (disclosed on the page)
-- ============================================================
create or replace function public.connect_with_work(p_share_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_m record;
  v_org text;
  v_my_contact uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;

  select * into v_m from org_members
  where work_share_id = p_share_id and card_active;
  if v_m is null then raise exception 'Card not found'; end if;
  if v_m.user_id = v_me then raise exception 'Cannot connect with yourself'; end if;

  select name into v_org from organizations where id = v_m.org_id;
  insert into profiles (id) values (v_me) on conflict (id) do nothing;

  -- 1) rep into MY contacts (work identity)
  select id into v_my_contact from contacts
  where user_id = v_me and linked_user_id = v_m.user_id;
  if v_my_contact is null then
    insert into contacts (user_id, linked_user_id, source, name, company, role,
                          email, phone, professional_notes, avatar_url, last_contacted_at)
    select v_me, v_m.user_id, 'connection',
           coalesce(p.full_name, 'New contact'), v_org, v_m.title,
           v_m.work_email, v_m.work_phone, v_m.headline,
           case when p.share_avatar then p.avatar_url end, current_date
    from profiles p where p.id = v_m.user_id
    returning id into v_my_contact;
  end if;

  -- 2) me into the REP's contacts (my sharing rules)
  if not exists (select 1 from contacts where user_id = v_m.user_id and linked_user_id = v_me) then
    insert into contacts (user_id, linked_user_id, source, name, company, role,
                          email, phone, professional_notes, personal_notes, avatar_url, last_contacted_at)
    select v_m.user_id, me.id, 'connection',
           coalesce(me.full_name, 'New contact'),
           case when me.share_company then me.company end,
           case when me.share_role then me.role end,
           case when me.share_work_email then me.work_email end,
           case when me.share_phone then me.phone end,
           case when me.share_job_overview then me.job_overview end,
           case when me.share_personal_overview then me.personal_overview end,
           case when me.share_avatar then me.avatar_url end,
           current_date
    from profiles me where me.id = v_me;
  end if;

  -- 3) me into the company's LEADS (consent shown on connect page)
  insert into leads (org_id, rep_user_id, lead_user_id, name, email, company, role, phone, source)
  select v_m.org_id, v_m.user_id, v_me,
         coalesce(me.full_name, 'New contact'),
         case when me.share_work_email then me.work_email end,
         case when me.share_company then me.company end,
         case when me.share_role then me.role end,
         case when me.share_phone then me.phone end,
         'connection'
  from profiles me where me.id = v_me
  on conflict do nothing;

  return v_my_contact;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.connect_with_work(uuid) to authenticated;
grant execute on function public.get_work_card(uuid) to anon, authenticated;
grant execute on function public.capture_lead(uuid, text, text, text, text) to anon, authenticated;
-- v2's personal-card reader must also work for logged-out visitors now:
grant execute on function public.get_shared_profile(uuid) to anon, authenticated;
