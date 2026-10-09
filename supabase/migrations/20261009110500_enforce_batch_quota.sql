create or replace function public.create_batch(
  p_name text,
  p_breed text,
  p_source text,
  p_start_date date,
  p_bird_count integer,
  p_cost numeric,
  p_status text,
  p_bird_type text
)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  limits_row public.user_limits%rowtype;
  created_batch public.batches%rowtype;
  created_count integer;
  has_active_plan boolean;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Not authenticated';
  end if;

  if p_name is null or btrim(p_name) = '' or p_bird_count is null or p_bird_count <= 0 then
    raise exception using errcode = '22023', message = 'Invalid batch details';
  end if;

  select *
  into limits_row
  from public.user_limits
  where user_id = current_user_id
  for update;

  if not found then
    insert into public.user_limits (
      user_id,
      batch_quota,
      batches_created_count
    )
    values (current_user_id, 1, 0)
    returning * into limits_row;
  end if;

  select count(*)::integer
  into created_count
  from public.batches
  where user_id = current_user_id;

  has_active_plan :=
    limits_row.plan is not null
    and limits_row.access_until is not null
    and limits_row.access_until > now();

  if created_count >= coalesce(limits_row.batch_quota, 1)
     or (limits_row.plan is not null and not has_active_plan) then
    raise exception using errcode = 'P0001', message = 'Batch quota exceeded';
  end if;

  insert into public.batches (
    user_id,
    name,
    breed,
    source,
    start_date,
    bird_count,
    cost,
    status,
    bird_type
  )
  values (
    current_user_id,
    btrim(p_name),
    p_breed,
    p_source,
    p_start_date,
    p_bird_count,
    coalesce(p_cost, 0),
    p_status,
    p_bird_type
  )
  returning * into created_batch;

  update public.user_limits
  set batches_created_count = created_count + 1,
      updated_at = now()
  where user_id = current_user_id;

  return created_batch;
end;
$$;

revoke insert on table public.batches from anon, authenticated;
grant execute on function public.create_batch(text, text, text, date, integer, numeric, text, text)
  to authenticated;
