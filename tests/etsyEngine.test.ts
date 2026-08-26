import test from "node:test";
import assert from "node:assert/strict";
import { etsyProfit, internalSeoScore } from "../src/lib/etsy";

test("Etsy profit requires known production cost and fees", () => {
  assert.deepEqual(etsyProfit({ price: 50 }), { known: false, profit: null, margin: null });
  const result = etsyProfit({ price: 50, productionCost: 20, etsyFees: 5, discount: 2, shippingSubsidy: 3 });
  assert.equal(result.profit, 20); assert.equal(result.margin, 40);
});

test("internal Etsy SEO score is transparent and requires exactly 13 tags", () => {
  assert.equal(internalSeoScore({ title: "A sufficiently descriptive listing title", tags: Array.from({ length: 13 }, (_, index) => `tag-${index}`), description: "x".repeat(120), altText: "Product image", keywords: ["one", "two", "three"], shopSection: "Gifts", pinterestKeywords: ["gift", "desk", "teacher"] }), 100);
  assert.ok(internalSeoScore({ title: "Short" }) < 50);
});
