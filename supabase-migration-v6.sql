-- ============================================================
--  Soyo88 — v6 migration: quality of life
--  Run AFTER v1–v5. Safe to run twice.
-- ============================================================

-- ---------- Private notes on contacts (never shared/synced) ----------
alter table public.contacts add column if not exists private_notes text;

-- ---------- Profile files (resume etc., shared with your card) ----------
alter table public.profiles add column if not exists share_files boolean not null default true;

create table if not exists public.profile_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.profile_files enable row level security;

drop policy if exists "profile files - own all" on public.profile_files;
create policy "profile files - own all" on public.profile_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public bucket (paths contain the owner's uuid + timestamp: unguessable
-- enough for hand-out documents; the share_files toggle controls exposure).
insert into storage.buckets (id, name, public)
values ('profile-files', 'profile-files', true)
on conflict (id) do nothing;

drop policy if exists "profile files public read" on storage.objects;
create policy "profile files public read" on storage.objects
  for select using (bucket_id = 'profile-files');

drop policy if exists "profile files own insert" on storage.objects;
create policy "profile files own insert" on storage.objects
  for insert with check (
    bucket_id = 'profile-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile files own delete" on storage.objects;
create policy "profile files own delete" on storage.objects
  for delete using (
    bucket_id = 'profile-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Shared profile now includes files ----------
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
    'personal_overview', case when p.share_personal_overview then p.personal_overview end,
    'files', case
      when p.share_files then coalesce(
        (select jsonb_agg(jsonb_build_object('name', f.file_name, 'path', f.file_path)
                          order by f.created_at)
         from profile_files f where f.user_id = p.id),
        '[]'::jsonb)
      else '[]'::jsonb
    end
  )
  from public.profiles p
  where p.share_id = p_share_id;
$$;

-- ---------- Live sync: push profile edits into everyone's copy of you ----
-- Touches only the auto-filled columns on LINKED contacts; the owner's
-- private_notes column is never modified.
create or replace function public.sync_profile_to_contacts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_count integer;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;

  update contacts c set
    name = coalesce(p.full_name, c.name),
    company = case when p.share_company then p.company end,
    role = case when p.share_role then p.role end,
    email = case when p.share_work_email then p.work_email end,
    phone = case when p.share_phone then p.phone end,
    professional_notes = case when p.share_job_overview then p.job_overview end,
    personal_notes = case when p.share_personal_overview then p.personal_overview end,
    avatar_url = case when p.share_avatar then p.avatar_url end
  from profiles p
  where p.id = v_me and c.linked_user_id = v_me;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------- A contact's live shared files (linked contacts only) --------
create or replace function public.get_contact_shared_files(p_contact uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case
    when p.share_files then coalesce(
      (select jsonb_agg(jsonb_build_object('name', f.file_name, 'path', f.file_path)
                        order by f.created_at)
       from profile_files f where f.user_id = c.linked_user_id),
      '[]'::jsonb)
    else '[]'::jsonb
  end
  from contacts c
  join profiles p on p.id = c.linked_user_id
  where c.id = p_contact
    and c.user_id = auth.uid()
    and c.linked_user_id is not null;
$$;

-- ---------- Teams can be deleted by their admins ----------
drop policy if exists "orgs - admin delete" on public.organizations;
create policy "orgs - admin delete" on public.organizations
  for delete using (public.is_org_admin(id));

grant execute on function public.sync_profile_to_contacts() to authenticated;
grant execute on function public.get_contact_shared_files(uuid) to authenticated;
grant execute on function public.get_shared_profile(uuid) to anon, authenticated;
