alter table public.batches
  add column if not exists completed_at timestamptz;
