-- Idempotent platform defaults for Duplios.
-- Safe to run after supabase/schema.sql or against an existing deployment.

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
  array[
    'Track leads, customers, purchases, and reminders',
    'Keep follow-up personal and organized',
    'Duplicate team actions without manual chaos'
  ],
  array[
    'Growth CRM with customer profiles and purchase reminders',
    'Social outreach, scripts, tasks, and resource vault',
    'Network & PV, team metrics, team hub, and automation workflows',
    'Stripe-ready pricing, Supabase-ready schema, legal center, and admin controls'
  ],
  '[
    {"title":"Growth CRM","body":"Manage leads, customer interests, product purchases, next purchase reminders, and follow-up history."},
    {"title":"Automation Workflows","body":"Build follow-up sequences by trigger, channel, day offset, goal, and approved message."},
    {"title":"Team Duplication","body":"Track team hierarchy, active builders, customer volume, PV, follow-up activity, and sponsor actions."},
    {"title":"Sales and Billing Ready","body":"Use Stripe, Supabase, Vercel, public lead capture, legal pages, and admin configuration for launch."}
  ]'::jsonb,
  '[]'::jsonb,
  '[
    {"tier":"ignite","name":"Basic","price":"$29","description":"For individual users who need CRM, daily tasks, scripts, and customer follow-up.","features":["Growth CRM","Tasks","Scripts","Customer profiles","Purchase reminders"]},
    {"tier":"ascent","name":"Growth","price":"$59","description":"For builders who need lead capture, social outreach, AI scripts, and automation.","highlighted":true,"features":["Everything in Basic","Lead capture","Social outreach","AI scripts","Automation sequences"]},
    {"tier":"empire","name":"Pro","price":"$99","description":"For teams that need duplication, Network & PV, metrics, and leadership workflows.","features":["Everything in Growth","Network & PV","Team metrics","Team hub","Superadmin controls"]}
  ]'::jsonb,
  '[
    {"question":"Does Duplios guarantee sales, income, rank, or customer results?","answer":"No. Duplios is an operating system for organization, follow-up, training, and team workflows. Results depend on the user market, effort, product, compliance, and business model."},
    {"question":"Can payment be connected after account creation?","answer":"Yes. Users can create a trial workspace first. Stripe billing can be connected when they are ready to activate a paid plan."},
    {"question":"Are prices charged in USD?","answer":"Yes. Stripe Price IDs are the billing source of truth. Create USD Stripe prices if you want customers charged in USD."}
  ]'::jsonb,
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

insert into location_pricing_rules (
  id,
  country_code,
  currency,
  ignite_price,
  ascent_price,
  empire_price,
  tax_mode,
  enabled
)
values
  ('us-usd', 'US', 'USD', 29, 59, 99, 'stripe_tax', true),
  ('my-myr', 'MY', 'MYR', 139, 279, 469, 'stripe_tax', true),
  ('sg-sgd', 'SG', 'SGD', 39, 79, 135, 'stripe_tax', true),
  ('bn-bnd', 'BN', 'BND', 39, 79, 135, 'stripe_tax', true),
  ('ca-cad', 'CA', 'CAD', 40, 81, 137, 'stripe_tax', true),
  ('au-aud', 'AU', 'AUD', 44, 90, 150, 'stripe_tax', true),
  ('nz-nzd', 'NZ', 'NZD', 48, 98, 165, 'stripe_tax', true),
  ('gb-gbp', 'GB', 'GBP', 23, 47, 78, 'stripe_tax', true),
  ('eu-eur', 'EU', 'EUR', 27, 54, 91, 'stripe_tax', true),
  ('ch-chf', 'CH', 'CHF', 26, 52, 87, 'stripe_tax', true),
  ('jp-jpy', 'JP', 'JPY', 4400, 9000, 15000, 'stripe_tax', true),
  ('kr-krw', 'KR', 'KRW', 40000, 82000, 138000, 'stripe_tax', true),
  ('hk-hkd', 'HK', 'HKD', 227, 461, 775, 'stripe_tax', true),
  ('tw-twd', 'TW', 'TWD', 930, 1890, 3170, 'stripe_tax', true),
  ('ph-php', 'PH', 'PHP', 1650, 3360, 5640, 'stripe_tax', true),
  ('th-thb', 'TH', 'THB', 1040, 2120, 3560, 'stripe_tax', true),
  ('id-idr', 'ID', 'IDR', 486000, 988000, 1658000, 'stripe_tax', true),
  ('in-inr', 'IN', 'INR', 2440, 4960, 8320, 'stripe_tax', true),
  ('ae-aed', 'AE', 'AED', 106, 217, 363, 'stripe_tax', true),
  ('sa-sar', 'SA', 'SAR', 109, 221, 371, 'stripe_tax', true),
  ('qa-qar', 'QA', 'QAR', 106, 215, 360, 'stripe_tax', true),
  ('kw-kwd', 'KW', 'KWD', 9, 18, 31, 'stripe_tax', true),
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

insert into notification_rules (id, trigger, channel, audience, subject, body, enabled)
values
  ('new-trial-owner', 'new_signup', 'email', 'owner', 'Welcome to Duplios', 'Your trial workspace is ready. Add your first contacts, create follow-up reminders, and connect Stripe before going live.', true),
  ('checkout-completed', 'checkout_completed', 'email', 'owner', 'Payment confirmed', 'Your Duplios subscription is active. Continue activation to create your owner login.', true),
  ('trial-ending', 'trial_ending', 'email', 'owner', 'Your Duplios trial is ending soon', 'Add billing details or choose a paid plan to keep your workspace active.', true),
  ('team-invite', 'team_invite', 'email', 'team_member', 'You have been invited to Duplios', 'Use the invite link from your leader to join the workspace and start your action plan.', true)
on conflict (id) do update set
  trigger = excluded.trigger,
  channel = excluded.channel,
  audience = excluded.audience,
  subject = excluded.subject,
  body = excluded.body,
  enabled = excluded.enabled,
  updated_at = now();

insert into tracking_settings (
  id,
  google_analytics_id,
  meta_pixel_id,
  tiktok_pixel_id,
  linkedin_partner_id,
  consent_mode,
  enabled
)
values ('platform', null, null, null, null, 'advanced', false)
on conflict (id) do update set
  consent_mode = excluded.consent_mode,
  enabled = excluded.enabled,
  updated_at = now();

insert into seo_settings (
  id,
  title,
  description,
  canonical_url,
  keywords,
  content_clusters,
  answer_engine_prompts,
  schema_types,
  entity_signals,
  ai_overview_targets,
  competitor_keywords,
  local_markets,
  llms_txt_enabled,
  faq_coverage,
  answer_engine_summary,
  lead_magnets,
  sitemap_enabled,
  robots_mode
)
values (
  'platform',
  'Duplios | CRM, Automation, and Team Duplication OS',
  'Duplios helps relationship-led teams organize leads, customer profiles, follow-up reminders, automation workflows, and duplication systems.',
  null,
  array['relationship CRM','team duplication software','follow-up automation','network marketing CRM','customer purchase reminders'],
  '[{"cluster":"CRM and follow-up","status":"published"},{"cluster":"Team duplication","status":"planned"},{"cluster":"Automation workflows","status":"published"}]'::jsonb,
  array['What is the best CRM for relationship-led team duplication?','How do leaders track customer follow-up and next purchase reminders?'],
  array['SoftwareApplication','FAQPage','Product','Organization'],
  array['Duplios','CRM','automation workflows','team duplication OS','customer follow-up'],
  array['relationship CRM','team follow-up software','customer reminder automation'],
  array['network marketing crm','follow up crm','team duplication system'],
  array['US','MY','SG','CA','AU','GB'],
  true,
  true,
  'Duplios is a CRM, automation, customer profile, and team duplication operating system for relationship-led sellers and leaders.',
  '[{"title":"30-Day Follow-up Checklist","url":"","status":"draft"},{"title":"Customer Profile Template","url":"","status":"draft"}]'::jsonb,
  true,
  'index'
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  canonical_url = excluded.canonical_url,
  keywords = excluded.keywords,
  content_clusters = excluded.content_clusters,
  answer_engine_prompts = excluded.answer_engine_prompts,
  schema_types = excluded.schema_types,
  entity_signals = excluded.entity_signals,
  ai_overview_targets = excluded.ai_overview_targets,
  competitor_keywords = excluded.competitor_keywords,
  local_markets = excluded.local_markets,
  llms_txt_enabled = excluded.llms_txt_enabled,
  faq_coverage = excluded.faq_coverage,
  answer_engine_summary = excluded.answer_engine_summary,
  lead_magnets = excluded.lead_magnets,
  sitemap_enabled = excluded.sitemap_enabled,
  robots_mode = excluded.robots_mode,
  updated_at = now();

insert into system_settings (key, value, scope)
values
  ('billing.base_currency', 'USD', 'platform'),
  ('billing.trial_days', '14', 'platform'),
  ('plans.catalog', $$[
    {"tier":"ignite","name":"Basic","monthlyPriceUsd":29,"stripeEnv":"STRIPE_IGNITE_PRICE_ID"},
    {"tier":"ascent","name":"Growth","monthlyPriceUsd":59,"stripeEnv":"STRIPE_ASCENT_PRICE_ID"},
    {"tier":"empire","name":"Pro","monthlyPriceUsd":99,"stripeEnv":"STRIPE_EMPIRE_PRICE_ID"}
  ]$$, 'platform')
on conflict (key) do update set
  value = excluded.value,
  scope = excluded.scope,
  updated_at = now();
