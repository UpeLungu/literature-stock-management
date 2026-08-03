-- Complete additive database foundation for the Literature Management System.
-- This migration preserves the existing profiles, stock_count_periods and
-- stock_count_items tables and expands them into the full application model.

create extension if not exists pgcrypto;

-- Shared timestamp trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Congregations are identified by the same stable text keys already used by
-- the browser application and stock_count_periods.
create table if not exists public.congregations (
  congregation_key text primary key,
  name text not null,
  circuit_name text,
  location text,
  language text not null default 'English',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  category_key text primary key,
  name text not null,
  description text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publications (
  publication_key text primary key,
  category_key text not null references public.categories(category_key) on update cascade on delete restrict,
  publication_code text,
  title text not null,
  language text not null default 'English',
  issue_label text,
  publication_year integer check (publication_year is null or publication_year between 1900 and 2200),
  opening_quantity integer not null default 0 check (opening_quantity >= 0),
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_key, title, language, issue_label)
);

-- Application-wide settings. The default row is created below.
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  organization_name text not null default 'Literature Management System',
  default_language text not null default 'English',
  counting_month_offset integer not null default 1 check (counting_month_offset between 0 and 12),
  submission_deadline_day integer check (submission_deadline_day is null or submission_deadline_day between 1 and 31),
  allow_self_signup boolean not null default true,
  require_email_confirmation boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend the existing stock period table without changing its current API.
alter table public.stock_count_periods
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists submitted_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id) on delete set null,
  add column if not exists locked_at timestamptz;

-- Extend existing stock items while preserving publication_key and quantities.
alter table public.stock_count_items
  add column if not exists expected_quantity integer not null default 0 check (expected_quantity >= 0),
  add column if not exists remarks text,
  add column if not exists counted_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- Keep textual keys compatible while introducing relational integrity for new data.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stock_count_periods_congregation_fk'
  ) then
    alter table public.stock_count_periods
      add constraint stock_count_periods_congregation_fk
      foreign key (congregation_key)
      references public.congregations(congregation_key)
      on update cascade
      on delete restrict
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stock_count_items_publication_fk'
  ) then
    alter table public.stock_count_items
      add constraint stock_count_items_publication_fk
      foreign key (publication_key)
      references public.publications(publication_key)
      on update cascade
      on delete restrict
      not valid;
  end if;
end;
$$;

-- Submission history keeps every submit/reopen action instead of only the
-- latest status stored on stock_count_periods.
create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.stock_count_periods(id) on delete cascade,
  event_type text not null check (event_type in ('submitted','reopened','approved','rejected')),
  performed_by uuid references auth.users(id) on delete set null,
  comment text,
  created_at timestamptz not null default now()
);

-- Audit history for administration and stock changes.
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  congregation_key text references public.congregations(congregation_key) on update cascade on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

-- Useful indexes for the dashboard, reports and administration screens.
create index if not exists congregations_active_idx on public.congregations(active, name);
create index if not exists categories_order_idx on public.categories(active, display_order);
create index if not exists publications_category_idx on public.publications(category_key, active, display_order);
create index if not exists stock_periods_congregation_status_idx on public.stock_count_periods(congregation_key, period, status);
create index if not exists stock_items_publication_idx on public.stock_count_items(publication_key);
create index if not exists submission_events_period_idx on public.submission_events(period_id, created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

-- Timestamp triggers.
drop trigger if exists congregations_set_updated_at on public.congregations;
create trigger congregations_set_updated_at before update on public.congregations
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists publications_set_updated_at on public.publications;
create trigger publications_set_updated_at before update on public.publications
for each row execute function public.set_updated_at();

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
for each row execute function public.set_updated_at();

-- Seed the congregation and category keys already used by the current UI.
insert into public.congregations (congregation_key, name, location) values
  ('combined', 'Long Ridge / Mapepe & Chilanga Central', 'Chilanga'),
  ('kabulonga', 'Kabulonga', 'Lusaka'),
  ('matero', 'Matero', 'Lusaka')
on conflict (congregation_key) do update set
  name = excluded.name,
  location = coalesce(public.congregations.location, excluded.location);

insert into public.categories (category_key, name, display_order) values
  ('bibles', 'Bibles', 1),
  ('books', 'Books', 2),
  ('brochures', 'Brochures and Booklets', 3),
  ('tracts', 'Tracts', 4),
  ('magazines', 'Public Magazines', 5),
  ('watchtower', 'Study Watchtower', 6),
  ('workbooks', 'Meeting Workbooks', 7),
  ('daily', 'Examining the Scriptures Daily', 8),
  ('forms', 'Forms and Supplies', 9)
on conflict (category_key) do update set
  name = excluded.name,
  display_order = excluded.display_order;

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

-- RLS foundation. Existing profile helper functions from migration 003 are reused.
alter table public.congregations enable row level security;
alter table public.categories enable row level security;
alter table public.publications enable row level security;
alter table public.app_settings enable row level security;
alter table public.submission_events enable row level security;
alter table public.audit_logs enable row level security;

-- Congregations.
drop policy if exists "authenticated read congregations" on public.congregations;
create policy "authenticated read congregations"
on public.congregations for select to authenticated
using (
  public.current_profile_role() = 'admin'
  or congregation_key = public.current_congregation_key()
);

drop policy if exists "admins manage congregations" on public.congregations;
create policy "admins manage congregations"
on public.congregations for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- Categories and publications are readable by all active authenticated users.
drop policy if exists "authenticated read categories" on public.categories;
create policy "authenticated read categories"
on public.categories for select to authenticated
using (active = true or public.current_profile_role() = 'admin');

drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories"
on public.categories for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "authenticated read publications" on public.publications;
create policy "authenticated read publications"
on public.publications for select to authenticated
using (active = true or public.current_profile_role() = 'admin');

drop policy if exists "admins manage publications" on public.publications;
create policy "admins manage publications"
on public.publications for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- Settings.
drop policy if exists "authenticated read settings" on public.app_settings;
create policy "authenticated read settings"
on public.app_settings for select to authenticated
using (true);

drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings"
on public.app_settings for all to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- Submission events follow the same congregation access as their period.
drop policy if exists "authenticated read permitted submission events" on public.submission_events;
create policy "authenticated read permitted submission events"
on public.submission_events for select to authenticated
using (
  exists (
    select 1 from public.stock_count_periods p
    where p.id = period_id
      and (
        public.current_profile_role() = 'admin'
        or p.congregation_key = public.current_congregation_key()
      )
  )
);

drop policy if exists "staff create permitted submission events" on public.submission_events;
create policy "staff create permitted submission events"
on public.submission_events for insert to authenticated
with check (
  exists (
    select 1 from public.stock_count_periods p
    where p.id = period_id
      and (
        public.current_profile_role() = 'admin'
        or (
          public.current_profile_role() = 'literature_servant'
          and p.congregation_key = public.current_congregation_key()
        )
      )
  )
);

-- Audit logs are administrator-readable. Authenticated users may add their own events.
drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs"
on public.audit_logs for select to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists "authenticated insert audit logs" on public.audit_logs;
create policy "authenticated insert audit logs"
on public.audit_logs for insert to authenticated
with check (user_id = auth.uid());

-- Grants for the authenticated application client.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.congregations to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.publications to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.submission_events to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;

notify pgrst, 'reload schema';
