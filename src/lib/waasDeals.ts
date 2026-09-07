export type DealScope = { productType?: string; planId?: string };
export type DealLike = DealScope & { discountType: "percentage" | "fixed"; discountValue: number; active?: boolean; startsAt?: string; endsAt?: string; maxRedemptions?: number; redemptions?: number };

export function isWaasDealActive(deal: DealLike, now = new Date()): boolean {
  if (deal.active === false) return false;
  if (deal.startsAt && new Date(deal.startsAt).getTime() > now.getTime()) return false;
  if (deal.endsAt && new Date(deal.endsAt).getTime() < now.getTime()) return false;
  if (deal.maxRedemptions !== undefined && Number(deal.redemptions || 0) >= deal.maxRedemptions) return false;
  return true;
}

export function dealMatchesPlan(deal: DealLike, plan: DealScope): boolean {
  return (!deal.productType || deal.productType === plan.productType) && (!deal.planId || deal.planId === plan.planId);
}

export function applyWaasDeal(plan: { setupFee: number; recurringFee: number }, deal?: DealLike) {
  const setup = Math.max(0, Number(plan.setupFee) || 0);
  const recurring = Math.max(0, Number(plan.recurringFee) || 0);
  if (!deal || !isWaasDealActive(deal)) return { setupFee: setup, recurringFee: recurring, discountAmount: 0 };
  if (deal.discountType === "percentage") {
    const percentage = Math.min(100, Math.max(0, Number(deal.discountValue) || 0));
    const finalSetup = Math.round(setup * (1 - percentage / 100) * 100) / 100;
    const finalRecurring = Math.round(recurring * (1 - percentage / 100) * 100) / 100;
    return { setupFee: finalSetup, recurringFee: finalRecurring, discountAmount: Math.round((setup + recurring - finalSetup - finalRecurring) * 100) / 100 };
  }
  const discount = Math.min(setup, Math.max(0, Number(deal.discountValue) || 0));
  return { setupFee: Math.round((setup - discount) * 100) / 100, recurringFee: recurring, discountAmount: discount };
}
