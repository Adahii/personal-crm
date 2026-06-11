-- ============================================================
--  Soyo88 — v4 migration: events, lead pipeline, team admin
--  Run AFTER v3. Safe to run twice.
-- ============================================================

-- ---------- Events (conferences, fairs, booths) ----------
create table if not exists public.org_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  starts_on date,
  created_at timestamptz not null default now()
);

alter table public.org_events enable row level security;

drop policy if exists "events - member select" on public.org_events;
create policy "events - member select" on public.org_events
  for select using (org_id in (select public.my_org_ids()));
drop policy if exists "events - admin insert" on public.org_events;
create policy "events - admin insert" on public.org_events
  for insert with check (public.is_org_admin(org_id));
drop policy if exists "events - admin delete" on public.org_events;
create policy "events - admin delete" on public.org_events
  for delete using (public.is_org_admin(org_id));

-- ---------- Leads: pipeline status + event attribution ----------
alter table public.leads add column if not exists status text not null default 'new'
  check (status in ('new', 'contacted', 'qualified', 'archived'));
alter table public.leads add column if not exists event_id uuid
  references public.org_events (id) on delete set null;

-- Members can work the pipeline (update status of their org's leads)
drop policy if exists "leads - member update" on public.leads;
create policy "leads - member update" on public.leads
  for update using (org_id in (select public.my_org_ids()));

-- ---------- Reps pick the event they're currently working ----------
alter table public.org_members add column if not exists current_event_id uuid
  references public.org_events (id) on delete set null;

-- ---------- Team admin: manage members & invites ----------
drop policy if exists "members - admin update" on public.org_members;
create policy "members - admin update" on public.org_members
  for update using (public.is_org_admin(org_id));
drop policy if exists "members - admin delete" on public.org_members;
create policy "members - admin delete" on public.org_members
  for delete using (public.is_org_admin(org_id) and user_id <> auth.uid());

-- ============================================================
--  Re-create capture functions so new leads carry the rep's
--  current event automatically.
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

  insert into leads (org_id, rep_user_id, name, email, company, note, source, event_id)
  values (v_m.org_id, v_m.user_id, trim(p_name), nullif(trim(p_email), ''),
          nullif(trim(p_company), ''), nullif(trim(p_note), ''), 'quick_capture',
          v_m.current_event_id);
end;
$$;

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

  insert into leads (org_id, rep_user_id, lead_user_id, name, email, company, role, phone, source, event_id)
  select v_m.org_id, v_m.user_id, v_me,
         coalesce(me.full_name, 'New contact'),
         case when me.share_work_email then me.work_email end,
         case when me.share_company then me.company end,
         case when me.share_role then me.role end,
         case when me.share_phone then me.phone end,
         'connection', v_m.current_event_id
  from profiles me where me.id = v_me
  on conflict do nothing;

  return v_my_contact;
end;
$$;
