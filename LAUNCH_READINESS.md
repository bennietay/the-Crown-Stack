# Launch Readiness

## Current Status

The project is deployable to Vercel and wired for Supabase Auth/Postgres plus Stripe Checkout. It is not ready to collect real customer payments until production environment variables are configured and one successful end-to-end test checkout is completed.

The Superadmin portal now includes an Enterprise Ops tab for live tenant loading, readiness checks, tenant risk, Stripe billing event visibility, and audit trail review. Use it after signing in as a superadmin to confirm production wiring.

## Required Before Selling

1. Run `supabase/schema.sql` in a real Supabase project.
2. Add all required Vercel environment variables from `DEPLOYMENT.md`.
3. Use Stripe test mode first and verify:
   - public checkout creates a Stripe Checkout session
   - webhook receives `checkout.session.completed`
   - tenant status becomes `active`
   - owner activation creates a Supabase Auth user and profile
   - login opens the paid workspace
4. Set `VITE_DEMO_MODE=false` in production.
5. Add production Terms, Privacy Policy, refund policy, and jurisdiction-specific compliance review before taking live payments.

## Enterprise Gaps To Close After First Paid Pilot

- Add automated API and browser tests for checkout, activation, RBAC, and tenant isolation.
- Add external alerting for Stripe webhook, Supabase, and failed invoice events.
- Connect every remaining workspace module to tenant-scoped Supabase queries as usage grows beyond the first paid pilot.
- Add backup/export procedures for tenant data.
