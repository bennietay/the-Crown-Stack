import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production login contains no demo role picker, credentials or registration", () => {
  const login = read("src/pages/Login.tsx");
  const authStore = read("src/store/authStore.ts");
  assert.doesNotMatch(login, /Quick Role Sign-In|Password123|Create one now|admin@benniestudio/i);
  assert.doesNotMatch(authStore, /createUserWithEmailAndPassword|isSuperAdminEmail|setDoc\(/);
  assert.match(authStore, /no active workspace membership/);
  assert.match(authStore, /bos_workspace_members/);
  assert.match(authStore, /bos_workspaces/);
  assert.doesNotMatch(authStore, /firebaseUser|Firestore not initialized/);
});

test("production server fails closed and exposes separate health endpoints", () => {
  const server = read("server.ts");
  const supabase = read("src/server/supabase.ts");
  assert.match(server, /Production startup refused: APP_MODE=live is required/);
  assert.match(server, /supabaseReady/);
  assert.match(server, /supabaseWorkspaceId/);
  assert.match(server, /app\.get\("\/healthz"/);
  assert.match(server, /app\.get\("\/readyz"/);
  assert.match(server, /app\.set\("trust proxy", 1\)/);
  assert.match(supabase, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(supabase, /hasSupabaseServiceRole/);
  assert.doesNotMatch(supabase, /supabaseServer\s*=\s*createSupabaseRequestClient\(\)/);
});

test("lead capture requires a durable create response and has no fake CTA", () => {
  const page = read("src/pages/LeadCapture.tsx");
  const server = read("server.ts");
  assert.match(page, /response\.status !== 201/);
  assert.doesNotMatch(page, /60123456789/);
  assert.match(server, /res\.status\(201\)\.json\(\{ success: true, id: lead\.id \}\)/);
  assert.match(page, /utm_campaign/);
  assert.match(page, /Select a budget/);
  assert.match(server, /leadCapture:\s*\{/);
  assert.match(server, /settings\.leadCapture\.serviceOptions/);
});

test("package metadata uses the production application name", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.name, "bennie-business-os");
});

test("production revenue core contains no demo auth or simulated payment claims", () => {
  const files = ["src/pages/Pipeline.tsx", "src/pages/Proposals.tsx", "src/pages/Customers.tsx", "src/pages/Tickets.tsx"];
  const source = files.map(read).join("\n");
  assert.doesNotMatch(source, /demo-token|Payment successful|sent to client|created and sent/i);
  assert.doesNotMatch(read("server.ts"), /create-checkout-session|\/api\/stripe/);
  assert.match(read("server.ts"), /bos_records/);
  assert.match(read("server.ts"), /supabaseServer/);
});

test("Stripe Checkout uses persisted proposal totals and verifies raw webhooks", () => {
  const server = read("server.ts");
  assert.match(server, /express\.raw\(\{ type: "application\/json"/);
  assert.match(server, /stripe\.webhooks\.constructEvent\(req\.body, signature, webhookSecret\)/);
  assert.match(server, /Number\(proposal\.totalOTC \|\| 0\)/);
  assert.match(server, /Number\(proposal\.totalMRC \|\| 0\)/);
  assert.match(server, /checkout\.sessions\.create/);
  assert.doesNotMatch(server, /unit_amount:\s*req\.body/);
  assert.ok(server.indexOf('app.post("/api/webhooks/stripe"') < server.indexOf('app.use(express.json'));
});

test("expanded production API remains fail-closed", () => {
  const server = read("server.ts");
  assert.match(server, /\/api\/ai\/daily-brief/);
  assert.match(server, /authenticateUser, requireWorkspace\(\), requireRole/);
  assert.match(server, /app\.all\("\/api\/\*"/);
});

test("workspace settings refresh in the background and failed loads cannot be saved", () => {
  const layout = read("src/components/layout/AppLayout.tsx");
  const store = read("src/store/settingsStore.ts");
  const settingsPage = read("src/pages/Settings.tsx");
  assert.match(layout, /void fetchSettings\(workspace\.id\)/);
  assert.match(layout, /Refreshing workspace settings/);
  assert.doesNotMatch(layout, /if \(workspace\?\.id && \(settingsLoading \|\| loadedSettingsWorkspaceId !== workspace\.id\)\)/);
  assert.match(store, /loadedWorkspaceId: null/);
  assert.match(store, /loadedWorkspaceId !== workspaceId \|\| state\.error/);
  assert.doesNotMatch(store, /Graceful fallback to default settings/);
  assert.match(settingsPage, /disabled=\{saveStatus === 'saving' \|\| !settingsReady\}/);
});

test("proposal expiry and CSV import results use persisted outcomes", () => {
  const leads = read("src/pages/Leads.tsx");
  const customers = read("src/pages/Customers.tsx");
  const importer = read("src/components/CsvImportModal.tsx");
  assert.match(leads, /proposalValidityDays/);
  assert.match(leads, /expiresAt:/);
  assert.match(leads, /Promise\.allSettled/);
  assert.match(customers, /Promise\.allSettled/);
  assert.match(importer, /await onImport\(mappedRows\)/);
  assert.doesNotMatch(importer, /setTimeout\(\(\) => \{\s*onImport/);
});

test("authorization uses Supabase Auth and workspace RLS", () => {
  const middleware = read("src/server/authMiddleware.ts");
  assert.match(middleware, /createSupabaseRequestClient/);
  assert.match(middleware, /auth\.getUser/);
  assert.match(middleware, /bos_workspace_members/);
});
