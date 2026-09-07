import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MockHostingerProvider } from "../src/server/hostingerProvider";
import { WAAS_DEPLOYMENT_STEPS, canResumeDeployment, completeStep, failStep, firstIncompleteStep, startStep } from "../src/server/waasDeploymentEngine";
import { WAAS_NICHES, WAAS_STYLES, contrastRatio, deriveBrandTokens } from "../src/lib/waasDesign";

describe("WAAS architecture", () => {
  it("mock hosting provider provisions a safe preview without credentials", async () => {
    const result = await new MockHostingerProvider().createWebsite({ customerName: "ABC Air Conditioning" });
    assert.match(result.installationId, /^mock-/);
    assert.equal(result.temporaryUrl, "https://abc-air-conditioning.preview.bennietay.com");
  });

  it("provider health is explicit and non-publishing", async () => {
    const result = await new MockHostingerProvider().getWebsiteStatus();
    assert.deepEqual(result, { status: "ready", sslStatus: "active" });
  });

  it("mock provider supports the complete safe deployment adapter contract", async () => {
    const provider = new MockHostingerProvider();
    const site = await provider.createWebsite({ customerName: "KLM Accounting" });
    assert.deepEqual(await provider.installWordPress(site.installationId, { email: "operator@example.test", login: "unique-admin", password: "test-only-password" }), { wordpressVersion: "6.8-mock", installationId: site.installationId });
    await provider.installTheme(site.installationId, "bennietay-business-modern");
    await provider.installPlugin(site.installationId, "bennietay-managed-connector");
    await provider.configureManagedSite(site.installationId, { websiteId: "site-1", adminApiUrl: "https://admin.example.test", connectorSecret: "site-scoped-secret", configuration: { cta: "Request a quote" } });
    await provider.configureDomain(site.installationId, "klm.example.com");
  });

  it("deployment state machine resumes at the failed step without repeating completed steps", () => {
    const completed = WAAS_DEPLOYMENT_STEPS.slice(0, WAAS_DEPLOYMENT_STEPS.indexOf("install_wordpress")).map(name => completeStep({ name, status: "queued", retryCount: 0 }, "2026-09-06T00:00:00.000Z"));
    const failed = failStep(startStep({ name: "install_wordpress", status: "queued", retryCount: 0 }, "2026-09-06T00:01:00.000Z"), "provider unavailable", "2026-09-06T00:02:00.000Z");
    const steps = [...completed, failed];
    assert.equal(firstIncompleteStep(steps), "install_wordpress");
    assert.equal(canResumeDeployment(steps), true);
    const retried = completeStep(startStep(failed, "2026-09-06T00:03:00.000Z"), "2026-09-06T00:04:00.000Z");
    assert.equal(firstIncompleteStep([...completed, retried]), "create_customer_access");
    assert.equal(completed[0].status, "complete");
  });

  it("P1 operational controls remain wired into the server", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    assert.match(server, /createSignedUploadUrl/);
    assert.match(server, /waas_subscription_events/);
    assert.match(server, /waas_ticket_sla/);
    assert.match(server, /customer\.subscription\.deleted/);
    assert.match(server, /\/api\/waas\/tickets\/:ticketId/);
  });

  it("customer configuration supports all required styles, niches and contrast-safe tokens", () => {
    assert.deepEqual(WAAS_STYLES, ["modern", "bold", "premium", "minimal", "elegant", "vibrant"]);
    assert.equal(WAAS_NICHES.length, 8);
    const tokens = deriveBrandTokens("#17365D", "#D8C9A7");
    assert.equal(tokens.primary, "#17365D");
    assert.ok(contrastRatio(tokens.primary, tokens.textOnPrimary) >= 4.5);
    assert.ok(contrastRatio(tokens.secondary, tokens.textOnSecondary) >= 4.5);
  });

  it("customer-safe WordPress controls and manual AI workflow are present", () => {
    const connector = fs.readFileSync(path.join(process.cwd(), "wordpress-plugin/bennietay-managed-connector/bennietay-managed-connector.php"), "utf8");
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    assert.match(connector, /bennietay_customer/);
    assert.match(connector, /manage_bennietay_brand/);
    assert.match(connector, /bt_save_settings/);
    assert.match(server, /\/api\/waas\/content-prompt/);
    assert.match(server, /\/api\/integrations\/waas\/checkout/);
    assert.match(server, /Return JSON only/);
  });

  it("canonical storefront and admin path are separated", () => {
    const app = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
    const router = fs.readFileSync(path.join(process.cwd(), "src/lib/router.tsx"), "utf8");
    assert.match(app, /rawPathname === "\/admin"/);
    assert.match(app, /pathname === "\/" \|\| pathname === "\/sales"/);
    assert.match(router, /`\/admin\$\{destination/);
  });

  it("P2 asset verification and SLA visibility remain wired into the server", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    assert.match(server, /storage\.from\(waasAssetBucket\(\)\)\.download/);
    assert.match(server, /actualSha256/);
    assert.match(server, /\/api\/waas\/tickets\/sla/);
    assert.match(server, /response_breached/);
  });

  it("P3 launch theme has a real fallback contact path", () => {
    const launch = fs.readFileSync(path.join(process.cwd(), "wordpress-themes/bennietay-launch/index.php"), "utf8");
    assert.doesNotMatch(launch, /contact-form-7 id=\\\"0\\\"/);
    assert.match(launch, /bennietay_lead_form/);
    assert.match(launch, /mailto:/);
  });

  it("deployable themes include conversion sections and interactive assets", () => {
    const launch = fs.readFileSync(path.join(process.cwd(), "wordpress-themes/bennietay-launch/index.php"), "utf8");
    const business = fs.readFileSync(path.join(process.cwd(), "wordpress-themes/bennietay-business/front-page.php"), "utf8");
    for (const section of ["services", "about", "reviews", "faq", "contact"]) assert.match(launch, new RegExp(`id=\\"${section}\\"`));
    assert.match(launch, /data-bt-slider/);
    assert.match(launch, /data-bt-counter/);
    const businessFunctions = fs.readFileSync(path.join(process.cwd(), "wordpress-themes/bennietay-business/functions.php"), "utf8");
    assert.match(businessFunctions, /'services'/);
    assert.match(businessFunctions, /'portfolio'/);
    assert.match(business, /data-bt-slider/);
    assert.ok(fs.existsSync(path.join(process.cwd(), "wordpress-themes/bennietay-launch/assets/enhancements.css")));
    assert.ok(fs.existsSync(path.join(process.cwd(), "wordpress-themes/bennietay-business/assets/enhancements.css")));
  });

  it("standalone sales and customer portal paths are secured and wired", () => {
    const app = fs.readFileSync(path.join(process.cwd(), "src/App.tsx"), "utf8");
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    assert.match(app, /pathname === "\/sales"/);
    assert.match(app, /pathname === "\/portal"/);
    assert.match(server, /\/api\/integrations\/waas\/catalog/);
    assert.match(server, /\/api\/integrations\/waas\/orders\/:id\/portal-token/);
    assert.match(server, /\/api\/portal\/orders\/:id/);
    assert.match(server, /\/api\/portal\/orders\/:id\/tickets\/:ticketId\/messages/);
    assert.match(server, /WAAS_PORTAL_SECRET/);
    assert.match(server, /timingSafeEqual/);
    assert.match(server, /\/api\/ops\/monitoring/);
  });

  it("deployment start is idempotent for repeated clicks", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    assert.match(server, /A repeated click must be idempotent/);
    assert.match(server, /duplicate: true, deploymentId/);
  });

  it("queued deployments have a protected cron runner", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    const vercel = fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8");
    assert.match(server, /\/api\/cron\/waas-deployments/);
    assert.match(server, /waas_deployment_jobs/);
    assert.match(server, /claim_waas_deployment_job/);
    assert.match(server, /lease_expires_at/);
    assert.match(server, /deploymentWorkerAuth/);
    assert.match(vercel, /\/api\/cron\/waas-deployments/);
  });

  it("production connector delivery is durable and site scoped", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    const connector = fs.readFileSync(path.join(process.cwd(), "wordpress-plugin/bennietay-managed-connector/bennietay-managed-connector.php"), "utf8");
    const provider = fs.readFileSync(path.join(process.cwd(), "src/server/hostingerProvider.ts"), "utf8");
    assert.match(server, /website:\$\{websiteId\}/);
    assert.match(connector, /OUTBOX_OPTION/);
    assert.match(connector, /count\(\$outbox\) >= 1000/);
    assert.doesNotMatch(connector, /array_slice\(\$items/);
    assert.match(provider, /files\/upload-urls/);
    assert.match(provider, /site-config\.php/);
  });

  it("P2 operations expose durable deployment diagnostics and atomic allowance accounting", () => {
    const server = fs.readFileSync(path.join(process.cwd(), "server.ts"), "utf8");
    const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260907110000_waas_atomic_update_usage.sql"), "utf8");
    assert.match(server, /\/api\/waas\/deployments\/:id\/logs/);
    assert.match(server, /record_waas_update_usage/);
    assert.match(server, /staleLeases/);
    assert.match(server, /oldestQueuedAt/);
    assert.match(migration, /pg_advisory_xact_lock/);
    assert.match(migration, /Included update allowance exhausted/);
  });
});
