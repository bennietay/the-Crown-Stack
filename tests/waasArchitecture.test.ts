import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { MockHostingerProvider } from "../src/server/hostingerProvider";
import { WAAS_DEPLOYMENT_STEPS, canResumeDeployment, completeStep, failStep, firstIncompleteStep, startStep } from "../src/server/waasDeploymentEngine";

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
    const completed = WAAS_DEPLOYMENT_STEPS.slice(0, 4).map(name => completeStep({ name, status: "queued", retryCount: 0 }, "2026-09-06T00:00:00.000Z"));
    const failed = failStep(startStep({ name: "install_wordpress", status: "queued", retryCount: 0 }, "2026-09-06T00:01:00.000Z"), "provider unavailable", "2026-09-06T00:02:00.000Z");
    const steps = [...completed, failed];
    assert.equal(firstIncompleteStep(steps), "install_wordpress");
    assert.equal(canResumeDeployment(steps), true);
    const retried = completeStep(startStep(failed, "2026-09-06T00:03:00.000Z"), "2026-09-06T00:04:00.000Z");
    assert.equal(firstIncompleteStep([...completed, retried]), "deploy_managed_connector");
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
    assert.match(server, /\/api\/portal\/orders\/:id/);
    assert.match(server, /WAAS_PORTAL_SECRET/);
    assert.match(server, /timingSafeEqual/);
    assert.match(server, /\/api\/ops\/monitoring/);
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
    assert.match(migration, /pg_advisory_xact_lock/);
    assert.match(migration, /Included update allowance exhausted/);
  });
});
