import test from "node:test";
import assert from "node:assert/strict";
import { amountInMyr, inclusiveDaysBetween, revenueByBusiness, summarizeRevenue } from "../src/lib/revenue";
import { RevenueEvent } from "../src/types";

const event = (updates: Partial<RevenueEvent> = {}): RevenueEvent => ({
  id: "rev-1", workspaceId: "ws-1", businessUnit: "WAAS", sourceType: "sale",
  currency: "MYR", grossRevenue: 1000, costs: 200, fees: 50, status: "collected",
  occurredAt: "2026-08-01T00:00:00.000Z", createdAt: "2026-08-01T00:00:00.000Z", ...updates,
});

test("revenue summary keeps collected, booked and forecast separate", () => {
  const totals = summarizeRevenue([
    event(), event({ id: "rev-2", status: "booked", grossRevenue: 500 }),
    event({ id: "rev-3", status: "expected", grossRevenue: 250 }),
  ]);
  assert.equal(totals.collected, 1000);
  assert.equal(totals.booked, 500);
  assert.equal(totals.expected, 250);
  assert.equal(totals.profit, 1000);
});

test("foreign currency is excluded unless an identified conversion rate is supplied", () => {
  assert.equal(amountInMyr(event({ currency: "SGD" })), null);
  assert.equal(amountInMyr(event({ currency: "SGD", exchangeRateToMyr: 3.45 })), 3450);
  assert.equal(summarizeRevenue([event({ currency: "GBP" })]).excludedForeignCurrencyEvents, 1);
});

test("profit is not invented when domain costs are unknown", () => {
  const totals = summarizeRevenue([event({ metadata: { costsKnown: false } })]);
  assert.equal(totals.collected, 1000);
  assert.equal(totals.profit, 0);
});

test("business breakdown never mixes units", () => {
  const rows = revenueByBusiness([event(), event({ id: "rev-2", businessUnit: "ETSY", grossRevenue: 400 })]);
  assert.equal(rows.find(row => row.businessUnit === "WAAS")?.collected, 1000);
  assert.equal(rows.find(row => row.businessUnit === "ETSY")?.collected, 400);
});

test("goal date calculations are inclusive and never divide by zero", () => {
  assert.equal(inclusiveDaysBetween("2026-01-01", "2026-12-31"), 365);
  assert.equal(inclusiveDaysBetween("2026-08-26", "2026-08-26"), 1);
});
