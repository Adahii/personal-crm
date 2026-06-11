-- ============================================================
--  Soyo88 — v5 migration: deletable creators + team logs
--  Run AFTER v1–v4. Safe to run twice.
-- ============================================================

-- ---------- Fix: allow deleting a user who created a team ----------
-- The old FK blocked auth-user deletion. The org now survives with
-- created_by cleared (other admins keep running it).
alter table public.organizations alter column created_by drop not null;

do $$
declare
  v_con text;
begin
  select conname into v_con
  from pg_constraint
  where conrelid = 'public.organizations'::regclass
    and confrelid = 'auth.users'::regclass;
  if v_con is not null then
    execute format('alter table public.organizations drop constraint %I', v_con);
  end if;
end $$;

alter table public.organizations
  add constraint organizations_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- ---------- Team-shared conversation logs on captured people ----------
create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  occurred_on date not null default current_date,
  topics text,
  next_steps text,
  created_at timestamptz not null default now()
);

create index if not exists lead_interactions_lead_idx
  on public.lead_interactions (lead_id, occurred_on desc);

alter table public.lead_interactions enable row level security;

drop policy if exists "team logs - org select" on public.lead_interactions;
create policy "team logs - org select" on public.lead_interactions
  for select using (org_id in (select public.my_org_ids()));

drop policy if exists "team logs - member insert" on public.lead_interactions;
create policy "team logs - member insert" on public.lead_interactions
  for insert with check (
    org_id in (select public.my_org_ids())
    and author_user_id = auth.uid()
    and exists (select 1 from public.leads l
                where l.id = lead_id and l.org_id = lead_interactions.org_id)
  );

drop policy if exists "team logs - author or admin delete" on public.lead_interactions;
create policy "team logs - author or admin delete" on public.lead_interactions
  for delete using (
    author_user_id = auth.uid() or public.is_org_admin(org_id)
  );
