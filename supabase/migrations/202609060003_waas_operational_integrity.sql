-- P1 WAAS operational integrity.
-- Keep bos_records as the application document store, but move high-risk
-- operational concerns into typed, indexed tables with workspace RLS.

alter table public.bos_records
  drop constraint if exists bos_records_data_object_check;
alter table public.bos_records
  add constraint bos_records_data_object_check
  check (jsonb_typeof(data) = 'object');

create table if not exists public.waas_assets (
  id text primary key,
  workspace_id text not null references public.bos_workspaces(id) on delete cascade,
  order_id text,
  website_id text,
  ticket_id text,
  original_name text not null,
  storage_path text not null,
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','image/svg+xml','application/pdf')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','ready','quarantined','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waas_subscription_events (
  id text primary key,
  workspace_id text not null references public.bos_workspaces(id) on delete cascade,
  order_id text not null,
  provider text not null check (provider in ('stripe','manual')),
  provider_event_id text not null,
  event_type text not null check (event_type in ('checkout.completed','subscription.created','subscription.updated','subscription.deleted','invoice.paid','invoice.payment_failed','refund.created')),
  status text not null check (status in ('received','processed','ignored','failed')),
  subscription_id text,
  amount numeric(12,2),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_event_id)
);

create table if not exists public.waas_ticket_sla (
  id text primary key,
  workspace_id text not null references public.bos_workspaces(id) on delete cascade,
  ticket_id text not null,
  priority text not null check (priority in ('critical','high','normal','request')),
  response_due_at timestamptz not null,
  resolution_due_at timestamptz not null,
  first_responded_at timestamptz,
  resolved_at timestamptz,
  response_breached boolean not null default false,
  resolution_breached boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, ticket_id)
);

create index if not exists waas_assets_workspace_site_idx on public.waas_assets (workspace_id, website_id, status);
create index if not exists waas_subscription_events_order_idx on public.waas_subscription_events (workspace_id, order_id, occurred_at desc);
create index if not exists waas_ticket_sla_due_idx on public.waas_ticket_sla (workspace_id, resolution_due_at, resolution_breached);

alter table public.waas_assets enable row level security;
alter table public.waas_subscription_events enable row level security;
alter table public.waas_ticket_sla enable row level security;

drop policy if exists waas_assets_member_select on public.waas_assets;
create policy waas_assets_member_select on public.waas_assets for select to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_assets.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active'));
drop policy if exists waas_assets_operator_write on public.waas_assets;
create policy waas_assets_operator_write on public.waas_assets for all to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_assets.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin','operations','support')))
  with check (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_assets.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin','operations','support')));

drop policy if exists waas_subscription_events_admin_select on public.waas_subscription_events;
create policy waas_subscription_events_admin_select on public.waas_subscription_events for select to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_subscription_events.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin','operations')));
drop policy if exists waas_subscription_events_admin_write on public.waas_subscription_events;
create policy waas_subscription_events_admin_write on public.waas_subscription_events for all to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_subscription_events.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin')))
  with check (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_subscription_events.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin')));

drop policy if exists waas_ticket_sla_member_select on public.waas_ticket_sla;
create policy waas_ticket_sla_member_select on public.waas_ticket_sla for select to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_ticket_sla.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active'));
drop policy if exists waas_ticket_sla_operator_write on public.waas_ticket_sla;
create policy waas_ticket_sla_operator_write on public.waas_ticket_sla for all to authenticated
  using (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_ticket_sla.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin','operations','support')))
  with check (exists (select 1 from public.bos_workspace_members m where m.workspace_id = waas_ticket_sla.workspace_id and m.user_id = (select auth.uid()) and m.status = 'active' and m.role in ('workspace_admin','super_admin','operations','support')));

comment on table public.waas_assets is 'Validated WAAS asset metadata; binary content belongs in a private Storage bucket.';
comment on table public.waas_subscription_events is 'Idempotent Stripe/manual subscription lifecycle events.';
comment on table public.waas_ticket_sla is 'Workspace-scoped response and resolution deadlines for WAAS support.';
