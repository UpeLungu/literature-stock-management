-- Phase 1: authentication, user profiles, roles and congregation access.

create type public.app_role as enum ('admin', 'literature_servant', 'read_only');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'literature_servant',
  congregation_key text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  if not exists (select 1 from public.profiles) then
    assigned_role := 'admin';
  else
    assigned_role := 'literature_servant';
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), assigned_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for users created before this migration.
insert into public.profiles (id, full_name, role)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
       case when row_number() over (order by u.created_at) = 1 then 'admin'::public.app_role
            else 'literature_servant'::public.app_role end
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.current_congregation_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select congregation_key from public.profiles where id = auth.uid() and active = true
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_profile_role() = 'admin');

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

-- Replace the temporary open MVP stock policies with authenticated role-aware policies.
drop policy if exists "mvp read stock periods" on public.stock_count_periods;
drop policy if exists "mvp write stock periods" on public.stock_count_periods;
drop policy if exists "mvp read stock items" on public.stock_count_items;
drop policy if exists "mvp write stock items" on public.stock_count_items;

drop policy if exists "authenticated read permitted periods" on public.stock_count_periods;
create policy "authenticated read permitted periods"
on public.stock_count_periods for select
to authenticated
using (
  public.current_profile_role() = 'admin'
  or congregation_key = public.current_congregation_key()
);

drop policy if exists "servants write own periods" on public.stock_count_periods;
create policy "servants write own periods"
on public.stock_count_periods for all
to authenticated
using (
  public.current_profile_role() = 'admin'
  or (
    public.current_profile_role() = 'literature_servant'
    and congregation_key = public.current_congregation_key()
  )
)
with check (
  public.current_profile_role() = 'admin'
  or (
    public.current_profile_role() = 'literature_servant'
    and congregation_key = public.current_congregation_key()
  )
);

drop policy if exists "authenticated read permitted items" on public.stock_count_items;
create policy "authenticated read permitted items"
on public.stock_count_items for select
to authenticated
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

drop policy if exists "servants write own items" on public.stock_count_items;
create policy "servants write own items"
on public.stock_count_items for all
to authenticated
using (
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
)
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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.stock_count_periods to authenticated;
grant select, insert, update, delete on public.stock_count_items to authenticated;

notify pgrst, 'reload schema';