-- Safe migration for existing Duplios deployments.
-- Run this instead of rerunning supabase/schema.sql on a database that already has customer data.

create table if not exists customer_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text not null default 'manual',
  stage text not null default 'lead',
  interests text[] not null default '{}',
  product_focus text,
  purchase_cadence_days integer not null default 30,
  last_purchase_at timestamptz,
  next_purchase_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_profiles_tenant_email_unique
on customer_profiles (tenant_id, lower(email))
where email is not null;

create index if not exists customer_profiles_follow_up_idx
on customer_profiles (tenant_id, next_follow_up_at);

create index if not exists customer_profiles_stage_idx
on customer_profiles (tenant_id, stage);

create table if not exists customer_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customer_profiles(id) on delete cascade,
  product text not null,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'USD',
  purchased_at timestamptz not null default now(),
  next_purchase_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists customer_purchases_customer_idx
on customer_purchases (customer_id, purchased_at desc);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_uid uuid references profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_tenant_created_idx
on audit_logs (tenant_id, created_at desc);

alter table customer_profiles enable row level security;
alter table customer_purchases enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "members manage own customers" on customer_profiles;
create policy "members manage own customers"
on customer_profiles for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

drop policy if exists "leaders read tenant customers" on customer_profiles;
create policy "leaders read tenant customers"
on customer_profiles for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

drop policy if exists "members manage own customer purchases" on customer_purchases;
create policy "members manage own customer purchases"
on customer_purchases for all
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from customer_profiles
    where customer_profiles.id = customer_purchases.customer_id
    and customer_profiles.owner_uid = auth.uid()
  )
)
with check (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from customer_profiles
    where customer_profiles.id = customer_purchases.customer_id
    and customer_profiles.owner_uid = auth.uid()
  )
);

drop policy if exists "leaders read tenant customer purchases" on customer_purchases;
create policy "leaders read tenant customer purchases"
on customer_purchases for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

drop policy if exists "tenant admins read audit logs" on audit_logs;
create policy "tenant admins read audit logs"
on audit_logs for select
using (tenant_id = current_tenant_id() and current_app_role() in ('admin', 'superadmin'));
