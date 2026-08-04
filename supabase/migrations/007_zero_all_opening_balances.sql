-- Final production reset: all publications and stock-count records start at zero.
-- Safe to run after the publication seed migration.

begin;

update public.publications
set opening_quantity = 0
where opening_quantity <> 0;

delete from public.stock_count_items;
delete from public.submission_events;
delete from public.stock_count_periods;

commit;

select
  (select count(*) from public.publications where opening_quantity <> 0) as non_zero_opening_balances,
  (select count(*) from public.stock_count_items) as stock_count_items,
  (select count(*) from public.submission_events) as submission_events,
  (select count(*) from public.stock_count_periods) as stock_count_periods;
