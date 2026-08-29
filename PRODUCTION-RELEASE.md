# Production release checklist

## Verified locally

- `npm run lint` passes.
- `npm test` passes (46 tests).
- `npm run build` completes successfully.
- `npm audit --omit=dev` reports zero known vulnerabilities.
- Public lead capture renders immediately with a branded fallback while tenant settings load.
- Public proposal links calculate totals server-side and create Stripe Checkout sessions when Stripe is configured.
- Outreach tasks require a website audit before custom email is sent.

## Required Vercel environment

- `APP_MODE=live`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_WORKSPACE_ID` and the matching `VITE_*` values
- `BOOTSTRAP_ADMIN_EMAIL`
- `CRON_SECRET` (long random value; required for the daily outreach cron)

Configure Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) and Resend (`RESEND_API_KEY`, `EMAIL_FROM`) only when those channels are ready to send real customer communications. Keep all service keys server-side.

## Free-first monetization

- WhatsApp click-to-chat uses the free `PUBLIC_WHATSAPP_URL` destination.
- Stripe Checkout is optional and charges only when a customer accepts a persisted proposal.
- Email automation is optional; the queue can be reviewed manually through `/api/outreach/process-due`.
- The scheduled queue endpoint is fail-closed until `CRON_SECRET` is configured; the free-tier cron runs daily at 09:00 Malaysia time.

## Release gates

1. Deploy a preview and run lint, tests and build.
2. Verify `/healthz` and `/readyz` return 200.
3. Submit a test lead through `/capture` and confirm it appears in Supabase.
4. Verify invited admin sign-in and workspace membership.
5. Open a public proposal, confirm the totals, and test Stripe in test mode before switching to live keys.
6. Confirm public affiliate acquisition routes (`/affiliate`, `/tools`, `/guides`, `/print-on-demand`) load without authentication.
7. Promote the verified preview to production.

Do not put customer data, service keys or payment secrets in the browser or Git history.
