import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MockHostingerProvider } from "../src/server/hostingerProvider";

describe("WAAS architecture", () => {
  it("mock hosting provider provisions a safe preview without credentials", async () => {
    const result = await new MockHostingerProvider().createWebsite({ customerName: "ABC Air Conditioning" });
    assert.match(result.installationId, /^mock-/);
    assert.equal(result.temporaryUrl, "https://abc-air-conditioning.preview.bennietay.com");
  });

  it("provider health is explicit and non-publishing", async () => {
    const result = await new MockHostingerProvider().getWebsiteStatus();
    assert.deepEqual(result, { status: "ready", sslStatus: "pending" });
  });
});
