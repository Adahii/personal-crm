-- ============================================================
--  Rolodex — v2 migration: profiles, sharing & QR connections
--  Run this AFTER supabase-schema.sql.
--  Supabase -> SQL Editor -> New query -> paste all -> Run.
--  Safe to run more than once.
-- ============================================================

-- ---------- Your own shareable profile (one row per user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  share_id uuid not null unique default gen_random_uuid(),
  full_name text,
  avatar_url text,
  phone text,
  work_email text,
  role text,
  company text,
  job_overview text,
  personal_overview text,
  -- which fields are handed over when someone adds you
  share_avatar boolean not null default true,
  share_phone boolean not null default true,
  share_work_email boolean not null default true,
  share_role boolean not null default true,
  share_company boolean not null default true,
  share_job_overview boolean not null default true,
  share_personal_overview boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile - select" on public.profiles;
create policy "own profile - select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "own profile - insert" on public.profiles;
create policy "own profile - insert" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "own profile - update" on public.profiles;
create policy "own profile - update" on public.profiles
  for update using (auth.uid() = id);

-- ---------- Extend contacts so they can come from a connection ----------
alter table public.contacts add column if not exists avatar_url text;
alter table public.contacts add column if not exists linked_user_id uuid
  references auth.users (id) on delete set null;
alter table public.contacts add column if not exists source text not null default 'manual';

-- Stop the same person being added twice via QR.
create unique index if not exists contacts_user_linked_uniq
  on public.contacts (user_id, linked_user_id)
  where linked_user_id is not null;

-- ============================================================
--  Read a stranger's SHARED profile by their share link.
--  Returns only the fields they chose to share. Name always.
-- ============================================================
create or replace function public.get_shared_profile(p_share_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'share_id', p.share_id,
    'full_name', coalesce(p.full_name, 'Unnamed'),
    'avatar_url', case when p.share_avatar then p.avatar_url end,
    'role', case when p.share_role then p.role end,
    'company', case when p.share_company then p.company end,
    'work_email', case when p.share_work_email then p.work_email end,
    'phone', case when p.share_phone then p.phone end,
    'job_overview', case when p.share_job_overview then p.job_overview end,
    'personal_overview', case when p.share_personal_overview then p.personal_overview end
  )
  from public.profiles p
  where p.share_id = p_share_id;
$$;

-- ============================================================
--  The mutual add. Caller scans p_share_id; this writes a
--  contact into BOTH people's lists, each respecting the other
--  person's sharing choices. Runs with elevated rights so it
--  can write the reciprocal row — that is the only thing
--  allowed to touch another user's contacts.
-- ============================================================
create or replace function public.connect_with(p_share_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_other uuid;
  v_my_contact uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_other from public.profiles where share_id = p_share_id;
  if v_other is null then
    raise exception 'Profile not found';
  end if;
  if v_other = v_me then
    raise exception 'Cannot connect with yourself';
  end if;

  -- Make sure the caller has a profile row so the reciprocal add has data.
  insert into public.profiles (id) values (v_me) on conflict (id) do nothing;

  -- 1) Add the OTHER person into MY contacts (their sharing rules).
  select id into v_my_contact
  from public.contacts
  where user_id = v_me and linked_user_id = v_other;

  if v_my_contact is null then
    insert into public.contacts (
      user_id, linked_user_id, source, name, company, role,
      email, phone, professional_notes, personal_notes, avatar_url, last_contacted_at
    )
    select
      v_me, p.id, 'connection',
      coalesce(p.full_name, 'New contact'),
      case when p.share_company then p.company end,
      case when p.share_role then p.role end,
      case when p.share_work_email then p.work_email end,
      case when p.share_phone then p.phone end,
      case when p.share_job_overview then p.job_overview end,
      case when p.share_personal_overview then p.personal_overview end,
      case when p.share_avatar then p.avatar_url end,
      current_date
    from public.profiles p
    where p.id = v_other
    returning id into v_my_contact;
  end if;

  -- 2) Add ME into the OTHER person's contacts (my sharing rules).
  if not exists (
    select 1 from public.contacts
    where user_id = v_other and linked_user_id = v_me
  ) then
    insert into public.contacts (
      user_id, linked_user_id, source, name, company, role,
      email, phone, professional_notes, personal_notes, avatar_url, last_contacted_at
    )
    select
      v_other, me.id, 'connection',
      coalesce(me.full_name, 'New contact'),
      case when me.share_company then me.company end,
      case when me.share_role then me.role end,
      case when me.share_work_email then me.work_email end,
      case when me.share_phone then me.phone end,
      case when me.share_job_overview then me.job_overview end,
      case when me.share_personal_overview then me.personal_overview end,
      case when me.share_avatar then me.avatar_url end,
      current_date
    from public.profiles me
    where me.id = v_me;
  end if;

  return v_my_contact;
end;
$$;

grant execute on function public.get_shared_profile(uuid) to authenticated;
grant execute on function public.connect_with(uuid) to authenticated;

-- ============================================================
--  Public bucket for profile photos (avatars are low-sensitivity
--  and meant to be shown). Uploaded files still write-protected
--  to their owner.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own update" on storage.objects;
create policy "avatars own update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
