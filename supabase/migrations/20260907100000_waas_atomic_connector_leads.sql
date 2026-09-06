-- Persist the idempotency event and lead in one database transaction so a
-- concurrent retry cannot create duplicate CRM records or lose an enquiry.
create or replace function public.ingest_waas_connector_lead(
  p_workspace_id text,
  p_event_id text,
  p_lead_id text,
  p_event_data jsonb,
  p_lead_data jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
  existing_lead_id text;
begin
  insert into public.bos_records (
    workspace_id, collection_name, record_id, data, is_soft_deleted,
    created_at, updated_at
  ) values (
    p_workspace_id, 'waas_connector_events', p_event_id, p_event_data,
    false, now(), now()
  ) on conflict (workspace_id, collection_name, record_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    select data->>'leadId' into existing_lead_id
    from public.bos_records
    where workspace_id = p_workspace_id
      and collection_name = 'waas_connector_events'
      and record_id = p_event_id
      and not is_soft_deleted;
    return jsonb_build_object('leadId', existing_lead_id, 'duplicate', true);
  end if;

  insert into public.bos_records (
    workspace_id, collection_name, record_id, data, is_soft_deleted,
    created_at, updated_at
  ) values (
    p_workspace_id, 'leads', p_lead_id, p_lead_data,
    false, now(), now()
  );

  return jsonb_build_object('leadId', p_lead_id, 'duplicate', false);
end;
$$;

revoke all on function public.ingest_waas_connector_lead(text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_waas_connector_lead(text,text,text,jsonb,jsonb) to service_role;

comment on function public.ingest_waas_connector_lead(text,text,text,jsonb,jsonb) is
  'Atomically deduplicates and persists a managed WordPress enquiry.';
