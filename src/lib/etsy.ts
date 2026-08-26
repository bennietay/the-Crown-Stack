import { EtsyProduct } from "../types";

export function etsyProfit(product: Pick<EtsyProduct, "price" | "productionCost" | "etsyFees" | "discount" | "shippingSubsidy" | "adCost" | "refundAllocation">) {
  const requiredKnown = product.productionCost !== undefined && product.etsyFees !== undefined;
  if (!requiredKnown) return { known: false as const, profit: null, margin: null };
  const deductions = product.productionCost + product.etsyFees + (product.discount || 0) + (product.shippingSubsidy || 0) + (product.adCost || 0) + (product.refundAllocation || 0);
  const profit = product.price - deductions;
  return { known: true as const, profit, margin: product.price > 0 ? profit / product.price * 100 : 0 };
}

export function internalSeoScore(seo: EtsyProduct["seo"]) {
  if (!seo) return 0;
  const checks = [Boolean(seo.title && seo.title.length >= 20), (seo.tags?.length || 0) === 13, Boolean(seo.description && seo.description.length >= 100), Boolean(seo.altText), (seo.keywords?.length || 0) >= 3, Boolean(seo.shopSection), (seo.pinterestKeywords?.length || 0) >= 3];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
