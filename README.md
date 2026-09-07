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
WAAS_PORTAL_SECRET=<long-random-server-only-secret>
```

Do not enter service secrets in the browser or commit them to Git. The WhatsApp API remains intentionally unconfigured; click-to-chat is the free-first channel.

The public `/sales` route is a standalone WAAS sales front end. It reads the
active catalogue through `GET /api/integrations/waas/catalog` and records
qualified requests through the durable lead-capture path. The `/portal` route
is a token-scoped customer portal: the storefront mints an order token as
`HMAC-SHA256(WAAS_PORTAL_SECRET, "order:" + orderId)` server-side and passes
it in the portal URL. The portal can read safe order/site status and create
support tickets without exposing the ingest key. Operations monitoring is
available to staff at `GET /api/ops/monitoring`.

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

The `/admin/waas` admin route is the internal operating system for the standalone
Managed WordPress storefront. The public storefront is served at `/` on
`website.bennietay.com`; authenticated operations are served under
`website.bennietay.com/admin`. It uses the existing workspace-scoped
`bos_records` document store and adds these collections: `waas_plans`,
`waas_templates`, `waas_orders`, `waas_onboardings`, `waas_websites`,
`waas_deployments`, `waas_deployment_steps`, `waas_support_tickets`, and
`waas_activities`. A migration with partial indexes is in
`supabase/migrations/202609060001_waas_operating_model.sql`.

The storefront order contract is `POST /api/integrations/waas/orders` with the
server-only `X-WAAS-Ingest-Key` header (`WAAS_INGEST_API_KEY`). It is validated
with Zod and idempotent by order id/external id. Admin deployment is
`POST /api/waas/orders/:id/deploy`; it is authenticated, workspace-scoped and
uses a safe mock Hostinger provider only in non-production environments. A
production process refuses to deploy unless Hostinger is configured. Provider
credentials never reach the browser.

Plans and templates are workspace data and must be initialized deliberately by
an administrator or controlled migration; opening the UI never writes sample
commercial data. Templates store structured section configuration (for example H02,
S03, A01, T02, F01, C03, CT01), so new styles, niches and versions can be
added as data rather than new page implementations. Deployment is intentionally
review-gated: the mock adapter reaches `review_required`, never automatically
publishes a customer site.

The same server-to-server key protects `POST /api/integrations/waas/onboarding`,
`GET /api/integrations/waas/orders/:id/status`, and
`POST /api/integrations/waas/tickets`. These are the intended storefront and
customer-portal contracts for onboarding, status polling, and support.

The storefront can mint an order-scoped customer portal link with
`POST /api/integrations/waas/orders/:id/portal-token` using the server-only
`X-WAAS-Ingest-Key`. The portal secret is never exposed to the storefront
browser. The endpoint is idempotent and returns a deterministic HMAC token for
the requested order.

Operational procedures are documented in [`docs/WAAS-OPERATIONS.md`](docs/WAAS-OPERATIONS.md).

Hostinger provisioning is implemented behind `src/server/hostingerProvider.ts`.
Set `HOSTINGER_API_TOKEN`, `HOSTINGER_USERNAME`, `HOSTINGER_ORDER_ID`, and
`HOSTINGER_WP_ADMIN_EMAIL` to enable the real provider. A unique random login
and password are generated for every deployment and encrypted with
`CREDENTIAL_ENCRYPTION_KEY`; operators reveal them only through the audited,
no-store WordPress-access action. The adapter uses Hostinger's website-create and
WordPress installation/theme/plugin endpoints, and polls the documented
installation list until WordPress is ready. `HOSTINGER_DATACENTER_CODE` is
optional after the first website on an account. For the included managed
themes and connector, the server requests a scoped Hostinger upload URL,
uploads the package files into WordPress, calls the documented theme/plugin
deploy endpoints, and polls until activation is confirmed.
`HOSTINGER_THEME_PATH` and `HOSTINGER_PLUGIN_PATH` are optional overrides for
packages that an operator has already staged on the target website.
Without the token, deployments remain in safe mock mode. Real provisioning still
ends at `review_required` and never publishes automatically.

The WordPress connector contract lives in
`wordpress-plugin/bennietay-managed-connector/`. Define
`BENNIETAY_WEBSITE_ID`, `BENNIETAY_ADMIN_API_URL`, and a site-specific
`BENNIETAY_CONNECTOR_SECRET` in its generated `site-config.php`. The site secret is
`HMAC-SHA256(WAAS_CONNECTOR_INGEST_SECRET, "website:" + websiteId)`; the master
secret stays only on the admin server. Outbound lead requests include a signed
timestamp, are idempotent, and remain in the WordPress outbox until the admin
API acknowledges them. The public `/health` endpoint exposes only
non-sensitive version/site information and pending outbox count.

### WAAS P0/P1 operations

The deployment adapter exposes WordPress, theme, plugin and domain operations
behind `HostingProvider`. Mock mode is safe for development; real mode uses
the Hostinger variables above plus `HOSTINGER_TIMEOUT_MS`,
`HOSTINGER_POLL_ATTEMPTS`, and `HOSTINGER_POLL_INTERVAL_MS`. Real calls have
bounded timeouts, retries and asynchronous-install polling.

Deployments persist each step, skip completed steps on resume, record failed
steps and expose `POST /api/waas/deployments/:id/retry`. The legacy
`POST /api/waas/orders/:id/deploy` endpoint now only queues the same durable
deployment job; it no longer provisions a website through a bypass path. Set
`WAAS_MOCK_FAIL_STEP` in a test environment to intentionally fail a mock step.
A human review gate remains required before publishing.

Queued WAAS deployments are represented in the typed
`waas_deployment_jobs` table. An atomic claim and expiring lease prevent double
provisioning and allow a crashed worker to resume without repeating completed
steps. They can also be processed by the free-tier-compatible daily Vercel Cron
through `/api/cron/waas-deployments`. The endpoint is protected by
`CRON_SECRET`, claims one queued/expired deployment per run, and calls the same
resumable runner used by the admin UI. Set
`WAAS_CRON_RUN_TIMEOUT_MS` to tune the per-job request timeout. The free-tier
cron claims up to five jobs per run; each job remains resumable if a request
times out.

Installable starter themes are included in `wordpress-themes/`:
`bennietay-launch` and `bennietay-business`. They use lightweight CSS/vanilla
JS interactions and respect `prefers-reduced-motion`.

Secured storefront contracts now support customer create/update, payment
updates with event idempotency, ticket messages and message listing. Admin
replies use `POST /api/waas/tickets/:ticketId/messages`. Included update usage
is enforced through `POST /api/waas/websites/:websiteId/update-usage`.

P1 operational controls add typed `waas_assets`, `waas_subscription_events`,
and `waas_ticket_sla` tables with workspace RLS. The private `waas-assets`
Storage bucket accepts only approved image/PDF types up to 10 MB. Storefronts
request a signed upload URL through `POST
/api/integrations/waas/assets/upload-url`, upload directly to Storage, then
call `POST /api/integrations/waas/assets/:assetId/complete`. Stripe lifecycle
events are idempotently recorded for checkout, invoices, subscriptions and
refunds. Ticket creation creates response/resolution deadlines and the admin
ticket update route records resolution and activity events.

Migration `supabase/migrations/202609060002_waas_integrity_and_operations.sql`
adds a unique workspace/collection/record key and indexes for ticket messages,
update usage and activity records. Apply it in a controlled release after
checking existing duplicate rows.

P2 hardening adds server-side checksum and byte-size verification before an
asset becomes `ready`; the server downloads the private object and compares it
to the declared SHA-256 metadata. The authenticated
`GET /api/waas/tickets/sla` endpoint exposes current response/resolution breach
state to the operations UI, where tickets now show a visible SLA deadline or
breach state. The related migration files are
`202609060003_waas_operational_integrity.sql` and
`202609060004_waas_asset_storage.sql`.

### WAAS operator runbook (P2/P3)

Use **WAAS → Deployments → View logs** to inspect every persisted step, provider
error, retry attempt and activity event. A failed job must be retried from the
failed step; completed provider operations are retained and are not replayed.
Use **Cancel** only for queued/running work, then verify the provider account
before creating a replacement order. Publish remains a deliberate two-step
operation: review the preview, approve it, then publish.

For a customer cancellation, first stop the Stripe subscription, export the
customer onboarding/assets, take a final WordPress backup, and record the
handover/domain details in the activity timeline. Do not delete a customer or
template that is referenced by a live site; deactivate it instead. Restore a
site by provisioning a disposable Hostinger target, importing the latest backup,
validating forms/SSL, and switching DNS only after review.

The connector outbox is durable and retried by WordPress cron. Operators should
monitor the deployment console and the lead/API error logs daily; a non-zero
pending outbox or a breached SLA is an operational alert, not a successful
delivery. Production provider selection is token-based: set
`HOSTINGER_API_TOKEN`, a unique `WAAS_CONNECTOR_INGEST_SECRET`,
`WAAS_INGEST_API_KEY`, and the Hostinger username/email variables. The API
refuses to report ready until the two WAAS ingest secrets are present.

Before accepting a customer, configure Supabase database/Storage backups and
test a disposable restoration. Vercel runtime logs are useful for diagnosis,
but they are not a substitute for alerting; configure an error alert channel
for deployment failures, connector outbox failures, and support SLA breaches.
