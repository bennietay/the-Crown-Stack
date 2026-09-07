import { describe, expect, it } from "vitest";
import { applyWaasDeal, isWaasDealActive } from "../src/lib/waasDeals";

describe("WAAS deals", () => {
  it("applies a percentage discount to setup and recurring fees", () => {
    expect(applyWaasDeal({ setupFee: 1000, recurringFee: 100 }, { discountType: "percentage", discountValue: 20 })).toEqual({ setupFee: 800, recurringFee: 80, discountAmount: 220 });
  });
  it("applies a fixed deal to setup only", () => {
    expect(applyWaasDeal({ setupFee: 500, recurringFee: 99 }, { discountType: "fixed", discountValue: 100 })).toEqual({ setupFee: 400, recurringFee: 99, discountAmount: 100 });
  });
  it("rejects expired and exhausted deals", () => {
    expect(isWaasDealActive({ discountType: "fixed", discountValue: 1, endsAt: "2020-01-01T00:00:00Z" })).toBe(false);
    expect(isWaasDealActive({ discountType: "fixed", discountValue: 1, maxRedemptions: 1, redemptions: 1 })).toBe(false);
  });
});
