import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeRevenueEvents, conversionRate, goalPacing, opportunityProbability, weightedOpportunityValue } from "../src/lib/revenueExecution";

describe("revenue execution", () => {
  it("excludes inactive business units from operational revenue", () => {
    const events = [
      { businessUnit: "WAAS", status: "collected" },
      { businessUnit: "AFFILIATE", status: "collected" },
    ] as any[];
    assert.equal(activeRevenueEvents(events).length, 1);
    assert.equal(activeRevenueEvents(events)[0].businessUnit, "WAAS");
  });

  it("uses explicit probabilities and stage defaults for weighted pipeline", () => {
    assert.equal(opportunityProbability({ stage: "Proposal sent" }), 0.7);
    assert.equal(opportunityProbability({ stage: "Negotiation", probability: 80 }), 0.8);
    assert.equal(weightedOpportunityValue({ stage: "Proposal sent", estimatedValue: 10000 }), 7000);
  });

  it("calculates target pacing without exceeding the goal range", () => {
    const pacing = goalPacing(10000, 6000, "2026-09-01", "2026-09-30", new Date("2026-09-15T12:00:00Z"));
    assert.equal(pacing.target, 10000);
    assert.equal(pacing.collected, 6000);
    assert.equal(pacing.gap, 4000);
    assert.equal(pacing.onTrack, true);
  });

  it("returns safe conversion rates when there is no denominator", () => {
    assert.equal(conversionRate(3, 10), 30);
    assert.equal(conversionRate(1, 0), 0);
  });
});
