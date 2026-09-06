-- Non-destructive catalogue guardrails. Existing historical rows are retained;
-- the application canonicalises active choices and refuses zero-value checkout.
create index if not exists waas_plans_catalog_lookup_idx
  on public.bos_records (workspace_id, collection_name, is_soft_deleted, updated_at desc)
  where collection_name = 'waas_plans';

create index if not exists waas_templates_catalog_lookup_idx
  on public.bos_records (workspace_id, collection_name, is_soft_deleted, updated_at desc)
  where collection_name = 'waas_templates';
