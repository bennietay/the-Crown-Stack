import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("production login contains no demo role picker, credentials or registration", () => {
  const login = read("src/pages/Login.tsx");
  const authStore = read("src/store/authStore.ts");
  assert.doesNotMatch(login, /Quick Role Sign-In|Password123|Create one now|admin@benniestudio/i);
  assert.doesNotMatch(authStore, /createUserWithEmailAndPassword|isSuperAdminEmail|setDoc\(/);
  assert.match(authStore, /has not been provisioned/);
  assert.match(authStore, /no active workspace membership/);
});

test("production server fails closed and exposes separate health endpoints", () => {
  const server = read("server.ts");
  assert.match(server, /Production startup refused: APP_MODE=live is required/);
  assert.match(server, /FIREBASE_SERVICE_ACCOUNT_KEY is required in production/);
  assert.match(server, /app\.get\("\/healthz"/);
  assert.match(server, /app\.get\("\/readyz"/);
  assert.match(server, /app\.set\("trust proxy", 1\)/);
});

test("lead capture requires a durable create response and has no fake CTA", () => {
  const page = read("src/pages/LeadCapture.tsx");
  const server = read("server.ts");
  assert.match(page, /response\.status !== 201/);
  assert.doesNotMatch(page, /60123456789/);
  assert.match(server, /res\.status\(201\)\.json\(\{ success: true, id: lead\.id \}\)/);
  assert.match(page, /utm_campaign/);
  assert.match(page, /Select a budget/);
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
  assert.match(read("server.ts"), /const batch = db\.batch\(\)/);
  assert.match(read("server.ts"), /db\.collection\("tasks"\)/);
});

test("server exposes only the supported production API surface", () => {
  const server = read("server.ts");
  assert.doesNotMatch(server, /\/api\/(ai|fulfilment|automation|customer-portal|reconciliation)/);
  assert.match(server, /app\.all\("\/api\/\*"/);
});
