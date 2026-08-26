# Bennie Revenue OS migration audit

## Foundation decision

Use the existing `the-crown-stack-production` application behind `admin.bennietay.com` as the canonical internal Revenue OS foundation. It already has production Supabase Auth/Postgres, workspace authorization, realtime `bos_records`, settings, leads, pipeline, customers, products, proposals, tickets, tasks, audit logging, proposal acceptance, and deployment health checks. Reusing this foundation preserves the current WAAS data and avoids a destructive rewrite.

The application remains a modular monolith. Public sites (`bennietay.com`, `app.bennietay.com`, and the public affiliate site) remain separate applications and connect through scoped APIs only.

## Migration matrix

| Capability | Current WAAS admin | Affiliate archive | Diamond Path CRM | Revenue OS destination |
|---|---|---|---|---|
| Authentication / workspace access | Supabase Auth + workspace membership | Firebase Auth/admin allow-list | Standalone Vite app; no shared auth | Core Auth and RBAC |
| Durable data | Supabase `bos_records` | Firestore collections | Neon/server API in source; migration adapter required | Core data layer first; domain collections remain isolated |
| Leads / sequences | Leads, cadence, outreach queue, website audit gate | Lead magnets, email sequences, unsubscribe, SMTP scheduler | Prospects, follow-ups, reorder workflows visible in bundle | Core contact identity + WAAS/Affiliate/Amway domain records |
| Tasks / follow-ups | Work Queue and persisted tasks | Scheduler-generated sequence steps | Follow-Ups and reorder actions | Shared Money Tasks with business and expected-impact fields |
| Revenue | Proposals, products, OTC/MRC, acceptance | Commissions collection and click tracking | Customer purchases, member/retail price, PV/BV and reorder cycles | Normalized RevenueEvent ledger + domain records |
| Email | Resend outbound queue, opt-out | Nodemailer SMTP sequences | Unknown | Core communication service; provider adapters |
| AI | Not yet centralized | Gemini server capability in archive | Gemini prospect assistant and scripts in source | Shared AI service with structured outputs and audit/cost records |
| Automation | Lead cadence and manual queue processing | `/api/scheduler`, SMTP sequence processor | Follow-up/reorder behavior | Shared Automation Center with approval modes |
| Affiliate programs/content | Not in WAAS admin | Programs, links, guides, tools, lead magnets, clicks, commissions, SEO/public views | Not applicable | Affiliate operations module; public content stays separate |
| Etsy / Printify | Missing | POD content/public views only | Not applicable | New Etsy/POD module |
| Notifications / activity | Audit logging exists; inbox missing | Console/scheduler logs | Unknown | Shared notification inbox + activity log |

## Verified source boundaries

- The supplied ZIP is a React/Vite/Express/Firebase/Gemini/SMTP affiliate/content application. Its public views and admin view must not be copied wholesale into the internal app.
- `admin.bennietay.com` is a React/Vite/Express/Supabase production app. Its existing revenue and lead data must remain intact.
- The Diamond Path CRM source is available at `bennietay/amway-crm`. It is a standalone React/Vite/Express CRM with typed prospects, customers, purchases, reorder follow-ups, scripts, prioritization and execution engines. Its data is not copied wholesale: the Revenue OS now has workspace-scoped `diamond_prospects`, `diamond_customers` and `diamond_followups` collections and a native Diamond Path module. The legacy deployment remains untouched while records are migrated/imported deliberately.
- The related affiliate/WAAS source is also available at `bennietay/bennietay-studio`; its Firebase/SMTP public/admin surfaces remain separate until individual operations are mapped to the shared core.
- No destructive database or deployment operation is part of this migration.

## Implementation order

1. Core shared primitives: business units, entity identity, normalized RevenueEvent, Money Task extensions, notifications, activity, integration registry.
2. Command Center: collected/booked/pipeline/forecast separation, configurable RM1m goal engine, truthful KPI cards.
3. WAAS compatibility: preserve current leads, proposals, outreach audit gate, customers, support and payments.
4. Affiliate operations: import program/link/click/commission/content records from the supplied archive without moving public pages.
5. Amway integration: native Diamond Path module is in place with separate prospect types, customer records and follow-up actions; next map purchase/reorder and script libraries through an explicit importer.
6. Etsy/POD: listings, variants, Printify sync adapter, orders, costs, fees, profit and approval-gated automation.
7. Shared AI and automation: provider abstraction, structured validation, caching, approval modes, run history and cost tracking.

## Non-negotiable safety rules

- Never fabricate revenue, profit, lead interest, contact identity, or conversion data.
- Keep collected, booked, pipeline and forecast values separate.
- Do not auto-send new outreach without consent/review rules; existing website-audit gate remains in force.
- No mass publishing or automatic affiliate destination swaps without approval.
- Store provider secrets server-side only and log metadata, never secret values.
- Preserve legacy deployments and databases until replacement behavior is verified.
