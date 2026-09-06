-- Serialize included-update accounting per website/month. The application
-- document store remains the source of truth, but the advisory transaction
-- lock prevents concurrent support agents from overspending an allowance.
create or replace function public.record_waas_update_usage(
  p_workspace_id text,
  p_website_id text,
  p_usage_id text,
  p_usage jsonb,
  p_allowance integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer := 0;
  v_row jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_workspace_id || ':' || p_website_id || ':' || coalesce(p_usage->>'periodStart',''), 0));
  select data into v_row from public.bos_records where workspace_id = p_workspace_id and collection_name = 'waas_update_usage' and record_id = p_usage_id and is_soft_deleted = false;
  if v_row is not null then return v_row; end if;
  if coalesce(p_usage->>'classification','') = 'included' then
    select coalesce(sum(case when (data->>'classification') = 'included' then coalesce((data->>'used')::integer, 0) else 0 end), 0)
      into v_used
      from public.bos_records
     where workspace_id = p_workspace_id and collection_name = 'waas_update_usage'
       and is_soft_deleted = false and data->>'websiteId' = p_website_id
       and data->>'periodStart' = p_usage->>'periodStart';
    if v_used >= greatest(coalesce(p_allowance, 0), 0) then
      raise exception using errcode = 'P0001', message = 'Included update allowance exhausted';
    end if;
  end if;
  v_row := case when coalesce(p_usage->>'classification','') = 'included'
    then jsonb_set(p_usage, '{used}', to_jsonb(v_used + 1), true)
    else p_usage end;
  insert into public.bos_records (workspace_id, collection_name, record_id, data, is_soft_deleted)
  values (p_workspace_id, 'waas_update_usage', p_usage_id, v_row, false)
  on conflict (workspace_id, collection_name, record_id)
  do update set data = excluded.data, is_soft_deleted = false, updated_at = now();
  return v_row;
end;
$$;

revoke all on function public.record_waas_update_usage(text,text,text,jsonb,integer) from public;
grant execute on function public.record_waas_update_usage(text,text,text,jsonb,integer) to service_role;
