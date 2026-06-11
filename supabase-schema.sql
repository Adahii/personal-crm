-- ============================================================
--  Rolodex — database schema
--  Run this in Supabase: Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- ---------- Contacts ----------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  company text,
  industry text,
  role text,
  email text,
  phone text,
  location text,
  tags text[] default '{}',
  personal_notes text,
  professional_notes text,
  last_contacted_at date,
  created_at timestamptz not null default now()
);

create index if not exists contacts_user_idx on public.contacts (user_id);

-- ---------- Interactions (conversation log) ----------
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  occurred_on date not null default current_date,
  topics text,
  next_steps text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists interactions_contact_idx on public.interactions (contact_id);

-- ---------- Attachments (metadata; files live in Storage) ----------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists attachments_contact_idx on public.attachments (contact_id);

-- ============================================================
--  Row Level Security — every row is scoped to its owner
-- ============================================================
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;
alter table public.attachments enable row level security;

-- Contacts
create policy "own contacts - select" on public.contacts
  for select using (auth.uid() = user_id);
create policy "own contacts - insert" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "own contacts - update" on public.contacts
  for update using (auth.uid() = user_id);
create policy "own contacts - delete" on public.contacts
  for delete using (auth.uid() = user_id);

-- Interactions
create policy "own interactions - select" on public.interactions
  for select using (auth.uid() = user_id);
create policy "own interactions - insert" on public.interactions
  for insert with check (auth.uid() = user_id);
create policy "own interactions - update" on public.interactions
  for update using (auth.uid() = user_id);
create policy "own interactions - delete" on public.interactions
  for delete using (auth.uid() = user_id);

-- Attachments
create policy "own attachments - select" on public.attachments
  for select using (auth.uid() = user_id);
create policy "own attachments - insert" on public.attachments
  for insert with check (auth.uid() = user_id);
create policy "own attachments - delete" on public.attachments
  for delete using (auth.uid() = user_id);

-- ============================================================
--  Storage bucket for uploaded files
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Files are stored under  {user_id}/{contact_id}/{filename}
-- so the first path segment must match the signed-in user.
create policy "own files - select" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files - insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own files - delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
