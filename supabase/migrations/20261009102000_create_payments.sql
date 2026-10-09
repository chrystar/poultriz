create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  plan text not null check (plan in ('3_month', 'yearly')),
  amount_kobo integer not null check (amount_kobo > 0),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists payments_user_id_idx on public.payments(user_id);

alter table public.payments enable row level security;
