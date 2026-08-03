create table if not exists public.stock_count_periods (
  id uuid primary key default gen_random_uuid(),
  congregation_key text not null,
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  status text not null default 'in_progress' check (status in ('in_progress','submitted','reopened')),
  submitted_at timestamptz,
  submitted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (congregation_key, period)
);

create table if not exists public.stock_count_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.stock_count_periods(id) on delete cascade,
  publication_key text not null,
  physical_quantity integer not null default 0 check (physical_quantity >= 0),
  verified boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (period_id, publication_key)
);

alter table public.stock_count_periods enable row level security;
alter table public.stock_count_items enable row level security;

drop policy if exists "mvp read stock periods" on public.stock_count_periods;
create policy "mvp read stock periods" on public.stock_count_periods for select using (true);
drop policy if exists "mvp write stock periods" on public.stock_count_periods;
create policy "mvp write stock periods" on public.stock_count_periods for all using (true) with check (true);
drop policy if exists "mvp read stock items" on public.stock_count_items;
create policy "mvp read stock items" on public.stock_count_items for select using (true);
drop policy if exists "mvp write stock items" on public.stock_count_items;
create policy "mvp write stock items" on public.stock_count_items for all using (true) with check (true);

create index if not exists stock_count_periods_period_idx on public.stock_count_periods(period);
create index if not exists stock_count_items_period_id_idx on public.stock_count_items(period_id);
