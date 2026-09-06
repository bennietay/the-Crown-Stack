-- WAAS operating model migration.
-- The current app stores workspace-scoped documents in bos_records; these
-- indexes keep the new collections queryable while preserving the existing RLS.
create index if not exists bos_records_waas_orders_idx on public.bos_records (workspace_id, collection_name, is_soft_deleted) where collection_name = 'waas_orders';
create index if not exists bos_records_waas_websites_idx on public.bos_records (workspace_id, collection_name, is_soft_deleted) where collection_name = 'waas_websites';
create index if not exists bos_records_waas_deployments_idx on public.bos_records (workspace_id, collection_name, is_soft_deleted) where collection_name = 'waas_deployments';
create index if not exists bos_records_waas_support_idx on public.bos_records (workspace_id, collection_name, is_soft_deleted) where collection_name = 'waas_support_tickets';
create index if not exists bos_records_waas_templates_idx on public.bos_records (workspace_id, collection_name, is_soft_deleted) where collection_name = 'waas_templates';

comment on table public.bos_records is 'Workspace-scoped document store. WAAS collections: waas_plans, waas_templates, waas_orders, waas_onboardings, waas_websites, waas_deployments, waas_deployment_steps, waas_support_tickets, waas_activities.';
