# Bennie Revenue OS migration audit

## Foundation decision

Use the existing `the-crown-stack-production` application behind `admin.bennietay.com` as the canonical internal Revenue OS foundation. It already has production Supabase Auth/Postgres, workspace authorization, realtime `bos_records`, settings, leads, pipeline, customers, products, proposals, tickets, tasks, audit logging, proposal acceptance, and deployment health checks. Reusing this foundation preserves the current WAAS data and avoids a destructive rewrite.

The application remains a modular monolith. Public sites (`bennietay.com`, `app.bennietay.com`, and the public affiliate site) remain separate applications and connect through scoped APIs only.

## Migration matrix

| Capability | Current WAAS admin | Affiliate archive | Diamond Path CRM | Revenue OS destination |
|---|---|---|---|---|
| Authentication / workspace access | Supabase Auth + workspace membership | Firebase Auth/admin allow-list | Deployment only; source unavailable | Core Auth and RBAC |
| Durable data | Supabase `bos_records` | Firestore collections | Unknown from deployment | Core data layer first; domain collections remain isolated |
| Leads / sequences | Leads, cadence, outreach queue, website audit gate | Lead magnets, email sequences, unsubscribe, SMTP scheduler | Prospects, follow-ups, reorder workflows visible in bundle | Core contact identity + WAAS/Affiliate/Amway domain records |
| Tasks / follow-ups | Work Queue and persisted tasks | Scheduler-generated sequence steps | Follow-Ups and reorder actions | Shared Money Tasks with business and expected-impact fields |
| Revenue | Proposals, products, OTC/MRC, acceptance | Commissions collection and click tracking | Business/product opportunity workflows | Normalized RevenueEvent ledger + domain records |
| Email | Resend outbound queue, opt-out | Nodemailer SMTP sequences | Unknown | Core communication service; provider adapters |
| AI | Not yet centralized | Gemini server capability in archive | Unknown | Shared AI service with structured outputs and audit/cost records |
| Automation | Lead cadence and manual queue processing | `/api/scheduler`, SMTP sequence processor | Follow-up/reorder behavior | Shared Automation Center with approval modes |
| Affiliate programs/content | Not in WAAS admin | Programs, links, guides, tools, lead magnets, clicks, commissions, SEO/public views | Not applicable | Affiliate operations module; public content stays separate |
| Etsy / Printify | Missing | POD content/public views only | Not applicable | New Etsy/POD module |
| Notifications / activity | Audit logging exists; inbox missing | Console/scheduler logs | Unknown | Shared notification inbox + activity log |

## Verified source boundaries

- The supplied ZIP is a React/Vite/Express/Firebase/Gemini/SMTP affiliate/content application. Its public views and admin view must not be copied wholesale into the internal app.
- `admin.bennietay.com` is a React/Vite/Express/Supabase production app. Its existing revenue and lead data must remain intact.
- Diamond Path CRM source is not present in the workspace. Only the public deployment is reachable, so its UI-visible capabilities can be inventoried but its schemas and business logic cannot be migrated safely until its repository/export or API is provided.
- No destructive database or deployment operation is part of this migration.

## Implementation order

1. Core shared primitives: business units, entity identity, normalized RevenueEvent, Money Task extensions, notifications, activity, integration registry.
2. Command Center: collected/booked/pipeline/forecast separation, configurable RM1m goal engine, truthful KPI cards.
3. WAAS compatibility: preserve current leads, proposals, outreach audit gate, customers, support and payments.
4. Affiliate operations: import program/link/click/commission/content records from the supplied archive without moving public pages.
5. Amway integration: map Diamond Path data through an import/API adapter once source or export is available; keep product vs business prospects distinct.
6. Etsy/POD: listings, variants, Printify sync adapter, orders, costs, fees, profit and approval-gated automation.
7. Shared AI and automation: provider abstraction, structured validation, caching, approval modes, run history and cost tracking.

## Non-negotiable safety rules

- Never fabricate revenue, profit, lead interest, contact identity, or conversion data.
- Keep collected, booked, pipeline and forecast values separate.
- Do not auto-send new outreach without consent/review rules; existing website-audit gate remains in force.
- No mass publishing or automatic affiliate destination swaps without approval.
- Store provider secrets server-side only and log metadata, never secret values.
- Preserve legacy deployments and databases until replacement behavior is verified.
