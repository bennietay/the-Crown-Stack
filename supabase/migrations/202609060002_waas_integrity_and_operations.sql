-- WAAS integrity and operational collections.
-- WAAS remains compatible with the existing workspace-scoped bos_records store,
-- while adding database guarantees for idempotency and operational queries.

create unique index if not exists bos_records_workspace_collection_record_uidx
  on public.bos_records (workspace_id, collection_name, record_id);

create index if not exists bos_records_waas_ticket_messages_idx
  on public.bos_records (workspace_id, collection_name, is_soft_deleted)
  where collection_name = 'waas_ticket_messages';

create index if not exists bos_records_waas_update_usage_idx
  on public.bos_records (workspace_id, collection_name, is_soft_deleted)
  where collection_name = 'waas_update_usage';

create index if not exists bos_records_waas_activity_entity_idx
  on public.bos_records (workspace_id, collection_name, is_soft_deleted)
  where collection_name = 'waas_activities';

comment on index bos_records_workspace_collection_record_uidx is
  'Prevents duplicate WAAS/storefront writes and makes upsert idempotency deterministic.';
