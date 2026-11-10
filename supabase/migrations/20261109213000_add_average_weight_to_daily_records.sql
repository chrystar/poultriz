alter table public.daily_records
  add column if not exists avg_weight_kg numeric;

notify pgrst, 'reload schema';
