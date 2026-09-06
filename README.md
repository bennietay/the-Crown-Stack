# Bennie Business OS

Bennie Business OS is Bennie Studio's focused revenue workspace. The production surface supports:

- a public, conversion-focused project enquiry form;
- invitation-only Supabase Auth;
- Supabase Postgres/RLS-backed leads, pipeline, products, proposals, customers, tickets and follow-up tasks;
- secure public proposal links with durable acceptance records;
- advanced business, pricing, lead-form and provider-readiness settings.

Prototype AI, hosting and simulated payment features are not exposed in the production app. Stripe Checkout, optional Resend email follow-up, and free WhatsApp click-to-chat are production integrations when their server-side environment variables are configured.

## Local verification

```bash
npm install
npm run lint
npm test
npm run build
```

For local UI development, use `APP_MODE=demo`. Production requires `APP_MODE=live` and a Supabase project configuration.

## Production environment

Copy `.env.example` into your deployment environment. Required server-side values:

```env
NODE_ENV=production
APP_MODE=live
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_WORKSPACE_ID=ws-...
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_WORKSPACE_ID=ws-...
```

Recommended free-first public configuration:

```env
PUBLIC_WHATSAPP_URL=https://wa.me/<international-number>
PUBLIC_BOOKING_URL=
PUBLIC_PRIVACY_URL=
PUBLIC_TERMS_URL=
```

Do not enter service secrets in the browser or commit them to Git. The WhatsApp API remains intentionally unconfigured; click-to-chat is the free-first channel.

Vite embeds every `VITE_*` value at build time. Never expose a Supabase service-role key in browser code; the publishable key is protected by RLS. For a production Vercel release, deploy the source with `vercel deploy --prod` so the cloud Production variables are used.

## First administrator

Set `BOOTSTRAP_ADMIN_EMAIL` to the exact email address of the first administrator. Supabase Auth users must have an active row in `bos_workspace_members` for the configured workspace.

## Release gates

1. All lint, tests and production builds pass.
2. `/healthz` and `/readyz` return 200 in the deployed environment.
3. A real `/capture` submission appears in the Supabase `bos_records` leads collection.
4. An invited administrator can sign in and access only the configured Supabase workspace.
5. A draft proposal can be marked ready, opened through its public link and accepted.
6. Preview is reviewed before production promotion.

## WAAS managed WordPress operations

The `/waas` admin route is the internal operating system for the standalone
Managed WordPress storefront. It uses the existing workspace-scoped
`bos_records` document store and adds these collections: `waas_plans`,
`waas_templates`, `waas_orders`, `waas_onboardings`, `waas_websites`,
`waas_deployments`, `waas_deployment_steps`, `waas_support_tickets`, and
`waas_activities`. A migration with partial indexes is in
`supabase/migrations/202609060001_waas_operating_model.sql`.

The storefront order contract is `POST /api/integrations/waas/orders` with the
server-only `X-WAAS-Ingest-Key` header (`WAAS_INGEST_API_KEY`). It is validated
with Zod and idempotent by order id/external id. Admin deployment is
`POST /api/waas/orders/:id/deploy`; it is authenticated, workspace-scoped and
currently uses a safe mock Hostinger provider. No provider credentials are
invented or exposed to the browser. Replace `src/server/hostingerProvider.ts`
with a real server-side Hostinger adapter when the account API contract and
credentials are available.

The WAAS console seeds configurable Launch/Business plans and a template
library covering the initial niches and Modern style when the workspace is
empty. Templates store structured section configuration (for example H02,
S03, A01, T02, F01, C03, CT01), so new styles, niches and versions can be
added as data rather than new page implementations. Deployment is intentionally
review-gated: the mock adapter reaches `review_required`, never automatically
publishes a customer site.

The same server-to-server key protects `POST /api/integrations/waas/onboarding`,
`GET /api/integrations/waas/orders/:id/status`, and
`POST /api/integrations/waas/tickets`. These are the intended storefront and
customer-portal contracts for onboarding, status polling, and support.

Hostinger provisioning is implemented behind `src/server/hostingerProvider.ts`.
Set `HOSTINGER_API_TOKEN` to enable the real provider; also configure
`HOSTINGER_ORDER_ID` (and optionally `HOSTINGER_DATACENTER_CODE`) because the
Hostinger website-create API requires a hosting order and a customer domain.
Without the token, deployments remain in safe mock mode. Real provisioning still
ends at `review_required` and never publishes automatically.

The initial WordPress connector contract lives in
`wordpress-plugin/bennietay-managed-connector/`. Define
`BENNIETAY_CONNECTOR_SECRET` in the WordPress installation and send an
`X-BennieTay-Signature` HMAC-SHA256 header for protected `/config` and `/lead`
requests. The public `/health` endpoint exposes only non-sensitive version and
site information.
