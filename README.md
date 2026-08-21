# Bennie Business OS

Bennie Business OS is Bennie Studio's focused revenue workspace. The production surface supports:

- a public, conversion-focused project enquiry form;
- invitation-only Supabase Auth;
- Supabase Postgres/RLS-backed leads, pipeline, products, proposals, customers, tickets and follow-up tasks;
- secure public proposal links with durable acceptance records;
- advanced business, pricing, lead-form and provider-readiness settings.

Prototype AI, automated messaging, hosting, customer-portal, reconciliation and simulated payment features are not exposed in the production app.

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

Do not enter service secrets in the browser or commit them to Git. Online payments, email automation and WhatsApp API automation are not part of this release.

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
