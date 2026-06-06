# Vercel + Supabase Deployment

## 1. Supabase

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Confirm the final section created the Duplios platform tenant, public plan catalog, USD base pricing, location pricing rules, notification rules, SEO settings, and tracking settings.
5. If this is an existing database, do not rerun the reset schema. Run `supabase/migrations/20260513_revenue_customer_hardening.sql`, then `supabase/platform-defaults.sql`, to add the new revenue/customer tables and restore platform defaults safely.
6. Enable Email + Password auth.
7. If using Google login, enable Google OAuth and add your Vercel production domain to the allowed redirect URLs.

## 2. Stripe

1. Create recurring USD prices for Basic, Growth, and Pro.
2. Copy the three price ids into Vercel as `STRIPE_IGNITE_PRICE_ID`, `STRIPE_ASCENT_PRICE_ID`, and `STRIPE_EMPIRE_PRICE_ID`.
3. Add a webhook endpoint:

```text
https://your-vercel-domain.com/api/billing/webhook
```

4. Subscribe the webhook to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Vercel

Use these project settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node.js Version: 20.x
```

Required production environment variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
VITE_DEMO_MODE=false
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_IGNITE_PRICE_ID=
STRIPE_ASCENT_PRICE_ID=
STRIPE_EMPIRE_PRICE_ID=
APP_URL=https://your-vercel-domain.com
```

Supabase key check:
- `VITE_SUPABASE_URL` must be the exact project URL, for example `https://your-project-ref.supabase.co`.
- `VITE_SUPABASE_ANON_KEY` must be the anon public key from Supabase Project Settings > API. Do not use the service role key here.
- `SUPABASE_SERVICE_ROLE_KEY` must be the service role key and must stay server-only in Vercel env vars.
- After changing any Vercel env var, redeploy. Vite bakes `VITE_*` values into the frontend build.

Optional environment variables:

```text
CORS_ORIGIN=https://your-vercel-domain.com
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3-flash-preview
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
VITE_LINKEDIN_CLIENT_ID=
```

`VITE_API_BASE_URL` should stay blank on Vercel. The frontend will call same-origin `/api` routes, and `vercel.json` routes those requests to the serverless API entrypoint.

## 4. Preflight

Before deploying, run:

```bash
npm run build
```

To check local environment variables before a production test run:

```bash
npm run check:deploy
```

The env checker reads the current shell environment. It does not read `.env` automatically.

## 5. Smoke Test

After deployment:

1. Open `https://your-vercel-domain.com/api/health`.
2. Open `https://your-vercel-domain.com/api/public/config`.
3. Confirm Supabase, Stripe, and all price ids report as configured.
4. In Supabase, confirm `sales_pages`, `location_pricing_rules`, `notification_rules`, `seo_settings`, `system_settings`, `customer_profiles`, `customer_purchases`, and `audit_logs` exist.
5. Start a checkout from the public pricing form.
6. Complete Stripe checkout in test mode.
7. Confirm the redirect lands on `/?view=activate&session_id=...`.
8. Create the owner account and sign in.
9. Open Settings > Account and verify the Stripe billing portal opens after payment activation.
10. Submit a public lead capture and confirm it creates both a `lead_records` row and a `customer_profiles` row.
