-- ===========================================================================
-- Al Furqan parent portal: the database.
--
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste the
-- whole file > Run. It is safe to run again after a change: every statement
-- replaces what it defines.
--
-- Every permission lives here, in row-level security, and not in the website's
-- JavaScript. The website's key is public by design; these rules are what stop
-- one parent seeing another family's children. Change them with care, and
-- test with two parent accounts after any change.
--
--   Parents   see and edit their own details and their own children only.
--             They cannot change a registration's status.
--   Staff     (anyone listed in public.staff) see every family and child,
--             set statuses, and manage resources.
--   Anonymous visitors can do nothing at all, except the keep-alive ping.
--
-- To make someone staff: they sign in to the portal once, then in the
-- dashboard open Authentication > Users, copy their user UID, and run:
--   insert into public.staff (user_id, name) values ('<their-uid>', 'Their name');
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.guardians (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            text,  -- copied from the sign-in account by a trigger, never trusted from the browser
  full_name        text not null check (char_length(full_name) between 2 and 120),
  relationship     text not null check (relationship in ('Mother', 'Father', 'Guardian', 'Other')),
  phone            text not null check (char_length(phone) between 7 and 30),
  emergency_name   text not null check (char_length(emergency_name) between 2 and 120),
  emergency_phone  text not null check (char_length(emergency_phone) between 7 and 30),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  guardian_id    uuid not null default auth.uid() references public.guardians (id) on delete cascade,
  first_name     text not null check (char_length(first_name) between 1 and 80),
  last_name      text not null check (char_length(last_name) between 1 and 80),
  date_of_birth  date not null check (date_of_birth > date '2000-01-01'),
  school_year    text check (char_length(school_year) <= 40),
  quran_level    text check (char_length(quran_level) <= 60),
  medical_notes  text check (char_length(medical_notes) <= 1000),
  photo_consent  boolean not null default false,
  status         text not null default 'pending'
                 check (status in ('pending', 'accepted', 'waiting', 'withdrawn')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists students_guardian_idx on public.students (guardian_id);

create table if not exists public.staff (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  name      text,
  added_at  timestamptz not null default now()
);

-- Resources for registered families: add rows in the Table Editor.
create table if not exists public.resources (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  url          text not null check (url ~ '^(https://|assets/)'),
  description  text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Functions and triggers
-- ---------------------------------------------------------------------------

-- Is the signed-in user on the staff list?
create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- Parents cannot set or change a registration's status, or move a child to
-- another family. New registrations always start as pending.
create or replace function public.students_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.guardian_id := auth.uid();
    elsif new.status is distinct from old.status
       or new.guardian_id is distinct from old.guardian_id then
      raise exception 'Only madrasah staff can change the status of a registration';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists students_guard on public.students;
create trigger students_guard
  before insert or update on public.students
  for each row execute function public.students_guard();

-- The parent's email always comes from their sign-in account.
create or replace function public.guardians_stamp()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  new.email := (select email from auth.users where id = new.id);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guardians_stamp on public.guardians;
create trigger guardians_stamp
  before insert or update on public.guardians
  for each row execute function public.guardians_stamp();

-- Called once a day by .github/workflows/portal-keepalive.yml, so a free
-- Supabase project is not paused for inactivity. Returns nothing sensitive.
create or replace function public.portal_ping()
returns boolean
language sql stable
as $$ select true; $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.guardians enable row level security;
alter table public.students  enable row level security;
alter table public.staff     enable row level security;
alter table public.resources enable row level security;

drop policy if exists "guardians read"   on public.guardians;
drop policy if exists "guardians insert" on public.guardians;
drop policy if exists "guardians update" on public.guardians;
drop policy if exists "guardians delete" on public.guardians;
create policy "guardians read"   on public.guardians for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "guardians insert" on public.guardians for insert to authenticated
  with check (id = auth.uid());
create policy "guardians update" on public.guardians for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "guardians delete" on public.guardians for delete to authenticated
  using (public.is_staff());

drop policy if exists "students read"   on public.students;
drop policy if exists "students insert" on public.students;
drop policy if exists "students update" on public.students;
drop policy if exists "students delete" on public.students;
create policy "students read"   on public.students for select to authenticated
  using (guardian_id = auth.uid() or public.is_staff());
create policy "students insert" on public.students for insert to authenticated
  with check (guardian_id = auth.uid());
create policy "students update" on public.students for update to authenticated
  using (guardian_id = auth.uid() or public.is_staff())
  with check (guardian_id = auth.uid() or public.is_staff());
-- A parent can take back a registration the madrasah has not acted on yet;
-- staff can remove any, for example on a request to delete a family's data.
create policy "students delete" on public.students for delete to authenticated
  using ((guardian_id = auth.uid() and status = 'pending') or public.is_staff());

drop policy if exists "staff read" on public.staff;
create policy "staff read" on public.staff for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
-- No insert, update or delete policies: staff are added in the dashboard only.

drop policy if exists "resources read"  on public.resources;
drop policy if exists "resources write" on public.resources;
create policy "resources read"  on public.resources for select to authenticated using (true);
create policy "resources write" on public.resources for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- Grants. Anonymous visitors get nothing but the ping.
-- ---------------------------------------------------------------------------

revoke all on public.guardians, public.students, public.staff, public.resources from anon;
grant select, insert, update, delete on public.guardians, public.students, public.resources to authenticated;
grant select on public.staff to authenticated;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.portal_ping() to anon, authenticated;
