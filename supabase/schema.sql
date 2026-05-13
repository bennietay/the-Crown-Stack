-- Fresh install reset block.
-- This makes the schema safe to rerun after a failed/partial setup.
-- Do not run this against a live production database with customer data.
drop view if exists tenant_overview cascade;

drop table if exists ad_campaigns cascade;
drop table if exists seo_settings cascade;
drop table if exists tracking_settings cascade;
drop table if exists appointments cascade;
drop table if exists notification_events cascade;
drop table if exists audit_logs cascade;
drop table if exists notification_rules cascade;
drop table if exists location_pricing_rules cascade;
drop table if exists traffic_revenue_analytics cascade;
drop table if exists access_invites cascade;
drop table if exists checkout_intents cascade;
drop table if exists billing_events cascade;
drop table if exists system_settings cascade;
drop table if exists sales_pages cascade;
drop table if exists landing_pages cascade;
drop table if exists compliance_guardrails cascade;
drop table if exists momentum_scores cascade;
drop table if exists script_personalizations cascade;
drop table if exists duplication_playbook_packages cascade;
drop table if exists sponsor_check_ins cascade;
drop table if exists power_hour_actions cascade;
drop table if exists contact_memory_prompts cascade;
drop table if exists fast_start_plans cascade;
drop table if exists social_outreach_tasks cascade;
drop table if exists automation_sequences cascade;
drop table if exists follow_up_steps cascade;
drop table if exists customer_purchases cascade;
drop table if exists customer_profiles cascade;
drop table if exists lead_records cascade;
drop table if exists team_members cascade;
drop table if exists crm_contacts cascade;
drop table if exists scripts cascade;
drop table if exists profiles cascade;
drop table if exists tenants cascade;

drop function if exists current_app_role() cascade;
drop function if exists current_tier() cascade;
drop function if exists current_tenant_id() cascade;

drop type if exists script_channel cascade;
drop type if exists app_role cascade;
drop type if exists subscription_tier cascade;

create type subscription_tier as enum ('ignite', 'ascent', 'empire');
create type app_role as enum ('new_joiner', 'member', 'leader', 'admin', 'superadmin');
create type script_channel as enum ('dm', 'story', 'sms', 'email');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'trialing',
  tier subscription_tier not null default 'ignite',
  stripe_customer_id text,
  trial_ends_at timestamptz,
  country_code text default 'US',
  currency text default 'USD',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  display_name text not null,
  email text not null,
  tier subscription_tier not null default 'ignite',
  role app_role not null default 'new_joiner',
  is_superadmin boolean not null default false,
  status text not null default 'active',
  mfa_enabled boolean not null default false,
  last_seen_at timestamptz,
  leader_uid uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table scripts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  pushed_by_uid uuid references profiles(id),
  title text not null,
  channel script_channel not null,
  body text not null,
  image_url text,
  visibility text not null default 'tenant',
  updated_at timestamptz not null default now()
);

create table crm_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  name text not null,
  stage text not null default 'new',
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  sponsor_id uuid references team_members(id) on delete set null,
  placement_id uuid references team_members(id) on delete set null,
  display_name text not null,
  email text not null,
  role app_role not null default 'member',
  rank text not null default 'New Builder',
  leg text not null default 'personal',
  sponsor_path uuid[] not null default '{}',
  level integer not null default 0,
  status text not null default 'new',
  joined_at timestamptz not null default now(),
  active_builders integer not null default 0,
  customers integer not null default 0,
  personal_volume numeric(12, 2) not null default 0,
  team_volume numeric(12, 2) not null default 0,
  group_volume numeric(12, 2) not null default 0,
  duplication_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table lead_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  name text not null,
  source text not null,
  stage text not null default 'new',
  temperature text not null default 'warm',
  next_action text not null,
  next_follow_up_at timestamptz not null,
  last_touch_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table customer_profiles (
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

create unique index customer_profiles_tenant_email_unique
on customer_profiles (tenant_id, lower(email))
where email is not null;

create index customer_profiles_follow_up_idx
on customer_profiles (tenant_id, next_follow_up_at);

create index customer_profiles_stage_idx
on customer_profiles (tenant_id, stage);

create table customer_purchases (
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

create index customer_purchases_customer_idx
on customer_purchases (customer_id, purchased_at desc);

create table follow_up_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  day_offset integer not null,
  channel text not null,
  title text not null,
  script text not null,
  goal text not null,
  created_at timestamptz not null default now()
);

create table automation_sequences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table social_outreach_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  platform text not null,
  action text not null,
  target text not null,
  script text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table fast_start_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  day integer not null,
  title text not null,
  objective text not null,
  actions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (tenant_id, day)
);

create table contact_memory_prompts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category text not null,
  prompt text not null,
  examples text[] not null default '{}',
  suggested_count integer not null default 10,
  created_at timestamptz not null default now()
);

create table power_hour_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  title text not null,
  target integer not null default 0,
  completed integer not null default 0,
  script_hint text not null,
  action_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table sponsor_check_ins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  builder_uid uuid references profiles(id) on delete cascade,
  builder_name text not null,
  status text not null default 'on_track',
  blocker text not null,
  recommended_action text not null,
  created_at timestamptz not null default now()
);

create table duplication_playbook_packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  audience text not null,
  checklist text[] not null default '{}',
  script_ids uuid[] not null default '{}',
  resource_titles text[] not null default '{}',
  pushed_to integer not null default 0,
  created_at timestamptz not null default now()
);

create table script_personalizations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  prospect_type text not null,
  relationship text not null,
  tone text not null,
  objection text,
  generated_script text not null,
  created_at timestamptz not null default now()
);

create table momentum_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  builder_uid uuid references profiles(id) on delete cascade,
  builder_name text not null,
  actions_completed integer not null default 0,
  follow_ups_sent integer not null default 0,
  demos_booked integer not null default 0,
  streak_days integer not null default 0,
  duplication_score integer not null default 0,
  score_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table compliance_guardrails (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  type text not null,
  title text not null,
  guidance text not null,
  severity text not null default 'medium',
  created_at timestamptz not null default now()
);

create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_uid uuid not null references profiles(id) on delete cascade,
  slug text not null,
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  unique (tenant_id, slug)
);

create table sales_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade unique,
  headline text not null,
  subheadline text not null,
  primary_cta text not null,
  proof_points text[] not null default '{}',
  offer_stack text[] not null default '{}',
  features jsonb not null default '[]'::jsonb,
  testimonials jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

create table system_settings (
  key text primary key,
  value text not null,
  scope text not null default 'platform',
  updated_at timestamptz not null default now()
);

create table billing_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  stripe_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table checkout_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  email text not null,
  tier subscription_tier not null,
  stripe_checkout_session_id text not null unique,
  status text not null default 'created',
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table access_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role app_role not null,
  tier subscription_tier not null,
  status text not null default 'pending',
  invited_by uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table traffic_revenue_analytics (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  visitors integer not null default 0,
  signups integer not null default 0,
  trials integer not null default 0,
  paid_conversions integer not null default 0,
  revenue numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table location_pricing_rules (
  id text primary key,
  country_code text not null,
  currency text not null,
  ignite_price numeric(10, 2) not null,
  ascent_price numeric(10, 2) not null,
  empire_price numeric(10, 2) not null,
  tax_mode text not null default 'stripe_tax',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notification_rules (
  id text primary key,
  trigger text not null,
  channel text not null,
  audience text not null,
  subject text not null,
  body text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notification_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  rule_id text references notification_rules(id) on delete set null,
  event_type text not null,
  recipient_email text,
  channel text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_uid uuid references profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_created_idx
on audit_logs (tenant_id, created_at desc);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  prospect_name text not null,
  prospect_email text not null,
  scheduled_at timestamptz not null,
  source text not null default 'sales_page',
  created_at timestamptz not null default now()
);

create table tracking_settings (
  id text primary key default 'platform',
  google_analytics_id text,
  meta_pixel_id text,
  tiktok_pixel_id text,
  linkedin_partner_id text,
  consent_mode text not null default 'basic',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table seo_settings (
  id text primary key default 'platform',
  title text not null,
  description text not null,
  canonical_url text,
  og_image_url text,
  keywords text[] not null default '{}',
  content_clusters jsonb not null default '[]',
  answer_engine_prompts text[] not null default '{}',
  schema_types text[] not null default '{}',
  entity_signals text[] not null default '{}',
  ai_overview_targets text[] not null default '{}',
  competitor_keywords text[] not null default '{}',
  local_markets text[] not null default '{}',
  llms_txt_enabled boolean not null default true,
  faq_coverage boolean not null default true,
  answer_engine_summary text,
  lead_magnets jsonb not null default '[]',
  sitemap_enabled boolean not null default true,
  robots_mode text not null default 'index',
  updated_at timestamptz not null default now()
);

create table ad_campaigns (
  id text primary key,
  platform text not null,
  name text not null,
  objective text not null,
  budget numeric(12, 2) not null default 0,
  spend numeric(12, 2) not null default 0,
  clicks integer not null default 0,
  leads integer not null default 0,
  trials integer not null default 0,
  revenue numeric(12, 2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table scripts enable row level security;
alter table crm_contacts enable row level security;
alter table team_members enable row level security;
alter table lead_records enable row level security;
alter table customer_profiles enable row level security;
alter table customer_purchases enable row level security;
alter table follow_up_steps enable row level security;
alter table automation_sequences enable row level security;
alter table social_outreach_tasks enable row level security;
alter table fast_start_plans enable row level security;
alter table contact_memory_prompts enable row level security;
alter table power_hour_actions enable row level security;
alter table sponsor_check_ins enable row level security;
alter table duplication_playbook_packages enable row level security;
alter table script_personalizations enable row level security;
alter table momentum_scores enable row level security;
alter table compliance_guardrails enable row level security;
alter table landing_pages enable row level security;
alter table sales_pages enable row level security;
alter table system_settings enable row level security;
alter table billing_events enable row level security;
alter table checkout_intents enable row level security;
alter table access_invites enable row level security;
alter table traffic_revenue_analytics enable row level security;
alter table location_pricing_rules enable row level security;
alter table notification_rules enable row level security;
alter table notification_events enable row level security;
alter table audit_logs enable row level security;
alter table appointments enable row level security;
alter table tracking_settings enable row level security;
alter table seo_settings enable row level security;
alter table ad_campaigns enable row level security;

create or replace function current_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from profiles where id = auth.uid()
$$;

create or replace function current_tier()
returns subscription_tier
language sql
security definer
stable
as $$
  select tier from profiles where id = auth.uid()
$$;

create or replace function current_app_role()
returns app_role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid()
$$;

create policy "profiles read own tenant"
on profiles for select
using (tenant_id = current_tenant_id());

create policy "profiles update self"
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "tenant admins manage profiles"
on profiles for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant members can read scripts"
on scripts for select
using (tenant_id = current_tenant_id());

create policy "leaders can manage scripts"
on scripts for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin'));

create policy "members manage own crm"
on crm_contacts for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "tenant reads team hierarchy"
on team_members for select
using (tenant_id = current_tenant_id());

create policy "tenant admins manage team hierarchy"
on team_members for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "members manage own leads"
on lead_records for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "leaders read tenant leads"
on lead_records for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "members manage own customers"
on customer_profiles for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "leaders read tenant customers"
on customer_profiles for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

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

create policy "leaders read tenant customer purchases"
on customer_purchases for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant reads follow up steps"
on follow_up_steps for select
using (tenant_id = current_tenant_id());

create policy "leaders manage follow up steps"
on follow_up_steps for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "ascent manages automation"
on automation_sequences for all
using (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'))
with check (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'));

create policy "members manage own outreach"
on social_outreach_tasks for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "tenant reads fast start plans"
on fast_start_plans for select
using (tenant_id = current_tenant_id());

create policy "leaders manage fast start plans"
on fast_start_plans for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant reads contact prompts"
on contact_memory_prompts for select
using (tenant_id = current_tenant_id());

create policy "leaders manage contact prompts"
on contact_memory_prompts for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "members manage own power hour"
on power_hour_actions for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "leaders read tenant power hour"
on power_hour_actions for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "leaders manage sponsor check ins"
on sponsor_check_ins for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant reads playbook packages"
on duplication_playbook_packages for select
using (tenant_id = current_tenant_id());

create policy "leaders manage playbook packages"
on duplication_playbook_packages for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "members manage own script personalization"
on script_personalizations for all
using (tenant_id = current_tenant_id() and owner_uid = auth.uid())
with check (tenant_id = current_tenant_id() and owner_uid = auth.uid());

create policy "leaders read script personalization"
on script_personalizations for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant reads momentum scores"
on momentum_scores for select
using (tenant_id = current_tenant_id());

create policy "leaders manage momentum scores"
on momentum_scores for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant reads compliance guardrails"
on compliance_guardrails for select
using (tenant_id = current_tenant_id() or tenant_id is null);

create policy "leaders manage compliance guardrails"
on compliance_guardrails for all
using ((tenant_id = current_tenant_id() or tenant_id is null) and current_app_role() in ('admin', 'superadmin'))
with check ((tenant_id = current_tenant_id() or tenant_id is null) and current_app_role() in ('admin', 'superadmin'));

create policy "ascent manages landing pages"
on landing_pages for all
using (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'))
with check (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'));

create policy "published sales pages are public"
on sales_pages for select
using (is_published = true);

create policy "ascent manages sales pages"
on sales_pages for all
using (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'))
with check (tenant_id = current_tenant_id() and current_tier() in ('ascent', 'empire'));

create policy "superadmins read settings"
on system_settings for select
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins manage settings"
on system_settings for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins read billing events"
on billing_events for select
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins read checkout intents"
on checkout_intents for select
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "tenant admins manage invites"
on access_invites for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "superadmins read analytics"
on traffic_revenue_analytics for select
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins manage location pricing"
on location_pricing_rules for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins manage notification rules"
on notification_rules for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "tenant admins read notification events"
on notification_events for select
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "tenant admins read audit logs"
on audit_logs for select
using (tenant_id = current_tenant_id() and current_app_role() in ('admin', 'superadmin'));

create policy "tenant members read appointments"
on appointments for select
using (tenant_id = current_tenant_id());

create policy "tenant admins manage appointments"
on appointments for all
using (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'))
with check (tenant_id = current_tenant_id() and current_app_role() in ('leader', 'admin', 'superadmin'));

create policy "superadmins manage tracking settings"
on tracking_settings for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins manage seo settings"
on seo_settings for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create policy "superadmins manage ad campaigns"
on ad_campaigns for all
using (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true))
with check (exists (select 1 from profiles where id = auth.uid() and is_superadmin = true));

create or replace view tenant_overview as
select
  tenants.id,
  tenants.name,
  tenants.slug,
  tenants.status,
  tenants.tier,
  tenants.stripe_customer_id,
  tenants.trial_ends_at,
  tenants.country_code,
  tenants.currency,
  tenants.created_at,
  count(profiles.id) as members,
  coalesce(avg(case
    when scripts.updated_at > now() - interval '7 days' then 85
    else 55
  end), 0)::int as duplication_score
from tenants
left join profiles on profiles.tenant_id = tenants.id
left join scripts on scripts.tenant_id = tenants.id
group by tenants.id;

-- Platform defaults for a fresh deployment.
-- For an existing database, run supabase/platform-defaults.sql instead of rerunning this reset schema.
insert into tenants (id, name, slug, status, tier, country_code, currency)
values (
  '00000000-0000-0000-0000-000000000001',
  'Duplios Platform',
  'duplios',
  'active',
  'empire',
  'US',
  'USD'
)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  tier = excluded.tier,
  country_code = excluded.country_code,
  currency = excluded.currency;

insert into sales_pages (
  tenant_id,
  headline,
  subheadline,
  primary_cta,
  proof_points,
  offer_stack,
  features,
  testimonials,
  pricing,
  faqs,
  is_published
)
values (
  '00000000-0000-0000-0000-000000000001',
  'Turn warm relationships into daily action without losing the human touch.',
  'Duplios gives builders and leaders a relationship-first CRM, follow-up system, customer profile, automation workspace, and team duplication OS.',
  'Start 14-Day Free Trial',
  array['Track leads, customers, purchases, and reminders', 'Keep follow-up personal and organized', 'Duplicate team actions without manual chaos'],
  array['Growth CRM with customer profiles and purchase reminders', 'Social outreach, scripts, tasks, and resource vault', 'Network & PV, team metrics, team hub, and automation workflows', 'Stripe-ready pricing, Supabase-ready schema, legal center, and admin controls'],
  '[{"title":"Growth CRM","body":"Manage leads, customer interests, product purchases, next purchase reminders, and follow-up history."},{"title":"Automation Workflows","body":"Build follow-up sequences by trigger, channel, day offset, goal, and approved message."},{"title":"Team Duplication","body":"Track team hierarchy, active builders, customer volume, PV, follow-up activity, and sponsor actions."},{"title":"Sales and Billing Ready","body":"Use Stripe, Supabase, Vercel, public lead capture, legal pages, and admin configuration for launch."}]'::jsonb,
  '[]'::jsonb,
  '[{"tier":"ignite","name":"Basic","price":"$29","description":"For individual users who need CRM, daily tasks, scripts, and customer follow-up.","features":["Growth CRM","Tasks","Scripts","Customer profiles","Purchase reminders"]},{"tier":"ascent","name":"Growth","price":"$59","description":"For builders who need lead capture, social outreach, AI scripts, and automation.","highlighted":true,"features":["Everything in Basic","Lead capture","Social outreach","AI scripts","Automation sequences"]},{"tier":"empire","name":"Pro","price":"$99","description":"For teams that need duplication, Network & PV, metrics, and leadership workflows.","features":["Everything in Growth","Network & PV","Team metrics","Team hub","Superadmin controls"]}]'::jsonb,
  '[{"question":"Does Duplios guarantee sales, income, rank, or customer results?","answer":"No. Duplios is an operating system for organization, follow-up, training, and team workflows. Results depend on the user market, effort, product, compliance, and business model."},{"question":"Can payment be connected after account creation?","answer":"Yes. Users can create a trial workspace first. Stripe billing can be connected when they are ready to activate a paid plan."},{"question":"Are prices charged in USD?","answer":"Yes. Stripe Price IDs are the billing source of truth. Create USD Stripe prices if you want customers charged in USD."}]'::jsonb,
  true
)
on conflict (tenant_id) do update set
  headline = excluded.headline,
  subheadline = excluded.subheadline,
  primary_cta = excluded.primary_cta,
  proof_points = excluded.proof_points,
  offer_stack = excluded.offer_stack,
  features = excluded.features,
  testimonials = excluded.testimonials,
  pricing = excluded.pricing,
  faqs = excluded.faqs,
  is_published = excluded.is_published,
  updated_at = now();

insert into location_pricing_rules (id, country_code, currency, ignite_price, ascent_price, empire_price, tax_mode, enabled)
values
  ('us-usd', 'US', 'USD', 29, 59, 99, 'stripe_tax', true),
  ('my-myr', 'MY', 'MYR', 139, 279, 469, 'stripe_tax', true),
  ('sg-sgd', 'SG', 'SGD', 39, 79, 135, 'stripe_tax', true),
  ('ca-cad', 'CA', 'CAD', 40, 81, 137, 'stripe_tax', true),
  ('au-aud', 'AU', 'AUD', 44, 90, 150, 'stripe_tax', true),
  ('gb-gbp', 'GB', 'GBP', 23, 47, 78, 'stripe_tax', true),
  ('eu-eur', 'EU', 'EUR', 27, 54, 91, 'stripe_tax', true),
  ('jp-jpy', 'JP', 'JPY', 4400, 9000, 15000, 'stripe_tax', true),
  ('kr-krw', 'KR', 'KRW', 40000, 82000, 138000, 'stripe_tax', true),
  ('hk-hkd', 'HK', 'HKD', 227, 461, 775, 'stripe_tax', true),
  ('ph-php', 'PH', 'PHP', 1650, 3360, 5640, 'stripe_tax', true),
  ('th-thb', 'TH', 'THB', 1040, 2120, 3560, 'stripe_tax', true),
  ('id-idr', 'ID', 'IDR', 486000, 988000, 1658000, 'stripe_tax', true),
  ('in-inr', 'IN', 'INR', 2440, 4960, 8320, 'stripe_tax', true),
  ('ae-aed', 'AE', 'AED', 106, 217, 363, 'stripe_tax', true),
  ('br-brl', 'BR', 'BRL', 149, 304, 510, 'stripe_tax', true),
  ('mx-mxn', 'MX', 'MXN', 496, 1009, 1693, 'stripe_tax', true),
  ('za-zar', 'ZA', 'ZAR', 531, 1080, 1812, 'stripe_tax', true)
on conflict (id) do update set
  country_code = excluded.country_code,
  currency = excluded.currency,
  ignite_price = excluded.ignite_price,
  ascent_price = excluded.ascent_price,
  empire_price = excluded.empire_price,
  tax_mode = excluded.tax_mode,
  enabled = excluded.enabled,
  updated_at = now();

insert into system_settings (key, value, scope)
values
  ('billing.base_currency', 'USD', 'platform'),
  ('billing.trial_days', '14', 'platform'),
  ('plans.catalog', $$[{"tier":"ignite","name":"Basic","monthlyPriceUsd":29,"stripeEnv":"STRIPE_IGNITE_PRICE_ID"},{"tier":"ascent","name":"Growth","monthlyPriceUsd":59,"stripeEnv":"STRIPE_ASCENT_PRICE_ID"},{"tier":"empire","name":"Pro","monthlyPriceUsd":99,"stripeEnv":"STRIPE_EMPIRE_PRICE_ID"}]$$, 'platform')
on conflict (key) do update set
  value = excluded.value,
  scope = excluded.scope,
  updated_at = now();
