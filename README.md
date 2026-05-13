# Duplios

Luxury SaaS scaffold for network marketing duplication, built with Vite, React, Tailwind CSS, Express, Vercel, and Supabase.

## Architecture

- Frontend: Vite + React + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript in `server/server.ts`
- Supabase: Auth, Postgres, Storage-ready client config, tenant-scoped RLS
- Stripe: Subscription checkout, tenant billing metadata, and webhook scaffold
- Deployment: Vercel static frontend plus API function entrypoint in `api/index.ts`

## Product Modules

- Public sales page with tenant-editable offer copy
- Sales page CMS for Growth and Pro tenants
- Login and access management with invites, RBAC, MFA tracking, and seat status
- Bento dashboard with Basic, Growth, and Pro feature gates
- Duplication engine for leader-to-downline asset pushes
- Fast-start duplication engine with sponsor hierarchy, lead CRM, follow-up flows, automations, and social outreach tasks
- Fast Start OS for 7/14/30-day onboarding, power-hour execution, contact list building, sponsor accountability, playbook pushes, script personalization, WhatsApp/SMS workflows, appointments, leaderboard, and compliance guardrails
- Minimal new joiner execution view
- Superadmin console for tenant, billing, and platform settings management
- Superadmin tabs for CMS review, access control, traffic/revenue analytics, 14-day trials, 20+ country location-based pricing with add-more rules, and notification rules
- Superadmin role preview sandbox to test New Joiner, Growing Builder, and Leader experiences before applying changes
- Superadmin growth tools for tracking pixels, SEO, Generative Engine Optimization, lead magnets, conversion tasks, and traffic/ads campaign planning
- Footer legal template with no-earnings, no-medical-advice, user responsibility, and compliance-review disclaimers

## Supabase Shape

```text
tenants
profiles
scripts
crm_contacts
automation_sequences
landing_pages
sales_pages
system_settings
billing_events
audit_logs
access_invites
checkout_intents
traffic_revenue_analytics
location_pricing_rules
notification_rules
notification_events
appointments
tracking_settings
seo_settings
ad_campaigns
team_members
lead_records
customer_profiles
customer_purchases
follow_up_steps
social_outreach_tasks
fast_start_plans
```

All API routes derive `tenantId` from the verified Supabase profile and reject cross-tenant access. The starter schema and RLS policies live in `supabase/schema.sql`.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
npm run dev:server
```

The frontend proxies `/api` to `http://localhost:4000`.

## Preview

- Frontend: `http://127.0.0.1:5173/`
- API health: `http://localhost:4000/api/health`

## Vercel + Supabase Deployment

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor. This creates the schema and seeds the platform plan catalog, USD base pricing, location pricing rules, notification rules, SEO settings, and tracking settings.
   For an existing database, run `supabase/migrations/20260513_revenue_customer_hardening.sql`, then `supabase/platform-defaults.sql`, instead of rerunning the reset schema.
3. Add these Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEMO_MODE=false`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `GEMINI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `STRIPE_IGNITE_PRICE_ID`
   - `STRIPE_ASCENT_PRICE_ID`
   - `STRIPE_EMPIRE_PRICE_ID`
   - `APP_URL`
4. Set Vercel to Node.js 20.x.
5. Deploy to Vercel with `npm run build`.

See `DEPLOYMENT.md` for the full deploy checklist and smoke test.

## Stripe Webhook

Point Stripe events to:

```text
https://your-vercel-domain.com/api/billing/webhook
```

The scaffold handles `checkout.session.completed` and updates the tenant tier/status in Supabase.

## Go-Live Checklist

1. Create Supabase project and run `supabase/schema.sql`.
2. Enable Supabase Email + Password auth.
3. Enable Google OAuth in Supabase Auth providers and add your Vercel domain to allowed redirect URLs.
4. Create Stripe products and recurring USD prices for Basic, Growth, and Pro.
5. Add all env vars in Vercel, including the three Stripe price ids.
6. Set Stripe webhook endpoint to `/api/billing/webhook`.
7. Deploy on Vercel and test public checkout from the pricing section.
8. After checkout, the buyer returns to `/ ?view=activate&session_id=...` to create the owner account.
9. Verify `/api/public/config` shows Supabase, Stripe, and all price ids configured.
10. Verify Supabase has rows in `sales_pages`, `location_pricing_rules`, `notification_rules`, `seo_settings`, and `system_settings`.
11. Keep `VITE_DEMO_MODE=false` in production.

## Compliance Notes

- Do not make earnings claims unless they are truthful, substantiated, and accompanied by required disclosures.
- For location-based pricing and tax, the checkout flow enables Stripe automatic tax and billing address collection.
- The footer legal language is a product template only. Have counsel review Terms, Privacy Policy, refund language, business opportunity disclosures, testimonials, and medical/wellness disclaimers before selling at scale.
