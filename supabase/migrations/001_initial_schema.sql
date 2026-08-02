-- Literature Management System - initial Supabase schema
-- Run this file in Supabase SQL Editor for the project.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'system_admin',
  'circuit_viewer',
  'congregation_admin',
  'literature_servant',
  'viewer'
);

create type public.inventory_status as enum (
  'draft',
  'in_progress',
  'submitted',
  'approved',
  'reopened'
);

create table public.circuits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.congregations (
  id uuid primary key default gen_random_uuid(),
  circuit_id uuid references public.circuits(id) on delete set null,
  name text not null,
  location text,
  language text not null default 'English',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (circuit_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'viewer',
  congregation_id uuid references public.congregations(id) on delete set null,
  circuit_id uuid references public.circuits(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  publication_code text,
  title text not null,
  language text not null default 'English',
  publication_year integer,
  issue_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (title, language, publication_year, issue_label)
);

create table public.inventory_periods (
  id uuid primary key default gen_random_uuid(),
  congregation_id uuid not null references public.congregations(id) on delete cascade,
  year integer not null check (year between 2000 and 2200),
  month integer not null check (month between 1 and 12),
  status public.inventory_status not null default 'draft',
  opened_at timestamptz not null default now(),
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  unique (congregation_id, year, month)
);

create table public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  inventory_period_id uuid not null references public.inventory_periods(id) on delete cascade,
  publication_id uuid not null references public.publications(id) on delete restrict,
  expected_quantity integer not null default 0 check (expected_quantity >= 0),
  physical_quantity integer not null default 0 check (physical_quantity >= 0),
  verified boolean not null default false,
  remarks text,
  counted_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (inventory_period_id, publication_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  congregation_id uuid references public.congregations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index idx_profiles_congregation on public.profiles(congregation_id);
create index idx_publications_category on public.publications(category_id);
create index idx_inventory_periods_congregation_period on public.inventory_periods(congregation_id, year, month);
create index idx_stock_counts_period on public.stock_counts(inventory_period_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger stock_counts_set_updated_at
before update on public.stock_counts
for each row execute function public.set_updated_at();

alter table public.circuits enable row level security;
alter table public.congregations enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.publications enable row level security;
alter table public.inventory_periods enable row level security;
alter table public.stock_counts enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create policy "authenticated users read active categories"
on public.categories for select to authenticated
using (active = true or (select role from public.profiles where id = auth.uid()) = 'system_admin');

create policy "authenticated users read active publications"
on public.publications for select to authenticated
using (active = true or (select role from public.profiles where id = auth.uid()) = 'system_admin');

create policy "users read own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or (select role from public.profiles where id = auth.uid()) = 'system_admin');

create policy "users update own basic profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "users read permitted congregations"
on public.congregations for select to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'system_admin'
  or id = (select congregation_id from public.profiles where id = auth.uid())
  or circuit_id = (select circuit_id from public.profiles where id = auth.uid())
);

create policy "users read permitted inventory periods"
on public.inventory_periods for select to authenticated
using (
  (select role from public.profiles where id = auth.uid()) = 'system_admin'
  or congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  or congregation_id in (
    select id from public.congregations
    where circuit_id = (select circuit_id from public.profiles where id = auth.uid())
  )
);

create policy "congregation staff create inventory periods"
on public.inventory_periods for insert to authenticated
with check (
  congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  and (select role from public.profiles where id = auth.uid()) in ('congregation_admin','literature_servant')
);

create policy "congregation staff update inventory periods"
on public.inventory_periods for update to authenticated
using (
  congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  and (select role from public.profiles where id = auth.uid()) in ('congregation_admin','literature_servant')
)
with check (congregation_id = (select congregation_id from public.profiles where id = auth.uid()));

create policy "users read permitted stock counts"
on public.stock_counts for select to authenticated
using (
  inventory_period_id in (select id from public.inventory_periods)
);

create policy "congregation staff insert stock counts"
on public.stock_counts for insert to authenticated
with check (
  inventory_period_id in (
    select id from public.inventory_periods
    where congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  )
  and (select role from public.profiles where id = auth.uid()) in ('congregation_admin','literature_servant')
);

create policy "congregation staff update stock counts"
on public.stock_counts for update to authenticated
using (
  inventory_period_id in (
    select id from public.inventory_periods
    where congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  )
  and (select role from public.profiles where id = auth.uid()) in ('congregation_admin','literature_servant')
)
with check (
  inventory_period_id in (
    select id from public.inventory_periods
    where congregation_id = (select congregation_id from public.profiles where id = auth.uid())
  )
);

create policy "system admins manage categories"
on public.categories for all to authenticated
using ((select role from public.profiles where id = auth.uid()) = 'system_admin')
with check ((select role from public.profiles where id = auth.uid()) = 'system_admin');

create policy "system admins manage publications"
on public.publications for all to authenticated
using ((select role from public.profiles where id = auth.uid()) = 'system_admin')
with check ((select role from public.profiles where id = auth.uid()) = 'system_admin');

create policy "system admins manage congregations"
on public.congregations for all to authenticated
using ((select role from public.profiles where id = auth.uid()) = 'system_admin')
with check ((select role from public.profiles where id = auth.uid()) = 'system_admin');

insert into public.categories (code, name, display_order) values
  ('bibles', 'Bibles', 1),
  ('books', 'Books', 2),
  ('brochures', 'Brochures & Booklets', 3),
  ('tracts', 'Tracts', 4),
  ('public-magazines', 'Public Magazines', 5),
  ('study-watchtower', 'Study Watchtower', 6),
  ('meeting-workbooks', 'Meeting Workbooks', 7),
  ('daily-text', 'Examining the Scriptures Daily', 8),
  ('forms', 'Forms & Supplies', 9)
on conflict (code) do nothing;

insert into public.circuits (name) values ('Lusaka South') on conflict (name) do nothing;

insert into public.congregations (circuit_id, name, location)
select id, 'Long Ridge / Mapepe & Chilanga Central', 'Chilanga'
from public.circuits where name = 'Lusaka South'
on conflict (circuit_id, name) do nothing;
