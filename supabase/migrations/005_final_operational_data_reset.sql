-- FINAL PRODUCTION RESET
-- Run this once in Supabase SQL Editor after deploying the final-data-reset build.
-- It removes test stock counts and submission history while preserving users,
-- profiles, congregations, categories, publications and application settings.

begin;

-- Child tables first because they reference stock_count_periods.
delete from public.submission_events;
delete from public.stock_count_items;
delete from public.stock_count_periods;

commit;

-- Verification: all three totals should return zero.
select
  (select count(*) from public.stock_count_periods) as stock_count_periods,
  (select count(*) from public.stock_count_items) as stock_count_items,
  (select count(*) from public.submission_events) as submission_events;
