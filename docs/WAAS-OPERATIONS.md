# WAAS operations runbook

## Daily checks

1. Open `WAAS > Operations` and inspect queued, failed, review-required and
   stale-lease deployment counts.
2. Investigate any `staleLeases` or a queued job older than one cron interval.
3. Review critical/high SLA breaches in Support.
4. Confirm `/healthz` is 200 and `/readyz` is 200 before accepting a new paid
   order.

## Required production secrets

Configure these as server-only Vercel Production variables:

- `APP_MODE=live`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_WORKSPACE_ID`
- `WAAS_INGEST_API_KEY`, `WAAS_PORTAL_SECRET`,
  `WAAS_CONNECTOR_INGEST_SECRET`
- `HOSTINGER_API_TOKEN`, `HOSTINGER_ORDER_ID`, `HOSTINGER_USERNAME`,
  `HOSTINGER_WP_ADMIN_EMAIL`, `CREDENTIAL_ENCRYPTION_KEY`
- `CRON_SECRET`, `PUBLIC_APP_URL`

Never put these values in Vite-prefixed variables or the browser bundle.

## Deployment recovery

Deployments are durable jobs in `waas_deployment_jobs`. Vercel Cron invokes
`/api/cron/waas-deployments`; the worker claims an expiring lease and resumes
from the first incomplete step. If a job is failed, use the admin Retry action
after correcting the reported provider/input error. Completed steps are not
repeated.

## Customer handover

Approve a site only after preview and QA review. Publish performs a fresh
WordPress/SSL health check. Use the audited WordPress access action to retrieve
credentials; do not copy credentials into tickets or email.

The connector creates a restricted `BennieTay Customer` role with content
editing and media permissions plus the controlled Website settings screen. It
does not grant plugin/theme installation, deletion, hosting access or deployment
permissions. For an offboarding handover: export the WordPress files/database
and media, grant a temporary Administrator account through a secure channel,
transfer domain/DNS ownership, remove `site-config.php` and the managed
connector after verifying the export, then revoke the managed credentials.
The customer owns their supplied content, media and domain; the managed theme,
connector and deployment tooling remain BennieTay operational software until a
paid handover or migration is completed.

## Customer configuration and content

The storefront configuration supports Launch/Business, eight niches, six
styles (`modern`, `bold`, `premium`, `minimal`, `elegant`, `vibrant`) and
primary/secondary HEX colours. `deriveBrandTokens` produces contrast-safe
hover, light, border, surface and text colours. Operators can request a
structured manual-AI prompt at `POST /api/waas/content-prompt`; paste the
returned JSON into the onboarding `content` object before deployment.

Fulfilment timestamps are retained on order/deployment/website records. The
authenticated `GET /api/waas/metrics/fulfilment` endpoint reports sample size,
median, p90 and the percentage completed within 30 minutes.

## Backups and restoration

Supabase backups and Hostinger backups are infrastructure responsibilities and
must be enabled and periodically restore-tested in their respective consoles.
Record the last restore test in the operations log. Before destructive site
changes, export customer assets and confirm the order/site identifiers.

## Incident response

- **Admin unavailable:** pause new orders, preserve Stripe/Hostinger event IDs,
  and restore from the last known Vercel deployment.
- **Database unavailable:** do not retry payment or onboarding writes blindly;
  use idempotency keys after Supabase recovers.
- **Hostinger unavailable:** leave the order in failed/queued state and retry
  from the failed step after provider health returns.
- **Lead delivery unavailable:** the connector outbox retries durable events;
  inspect connector health before asking a customer to resubmit.
- **Compromise suspected:** revoke connector/site credentials, disable the
  affected site, preserve logs, and rotate secrets before reactivation.
