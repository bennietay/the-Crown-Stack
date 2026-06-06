import type { LocationPricingRule } from "../types/tenant";
import type { SubscriptionTier } from "../types/subscription";

export const baseUsdPrices = {
  ignitePrice: 29,
  ascentPrice: 59,
  empirePrice: 99
};

export const usdConversionRates: Record<string, number> = {
  USD: 1,
  MYR: 4.72,
  CAD: 1.38,
  AUD: 1.52,
  NZD: 1.66,
  SGD: 1.35,
  BND: 1.35,
  IDR: 16750,
  PHP: 57,
  THB: 36,
  VND: 26000,
  INR: 84,
  JPY: 152,
  KRW: 1390,
  HKD: 7.82,
  TWD: 32,
  CNY: 7.2,
  GBP: 0.79,
  EUR: 0.92,
  CHF: 0.88,
  DKK: 6.85,
  SEK: 10.8,
  NOK: 10.9,
  PLN: 3.95,
  TRY: 32.5,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BRL: 5.15,
  MXN: 17.1,
  ZAR: 18.3
};

export const tierPriceKeys: Record<SubscriptionTier, keyof typeof baseUsdPrices> = {
  ignite: "ignitePrice",
  ascent: "ascentPrice",
  empire: "empirePrice"
};

export function roundConvertedPrice(value: number) {
  if (value >= 100000) return Math.round(value / 1000) * 1000;
  if (value >= 10000) return Math.round(value / 100) * 100;
  if (value >= 1000) return Math.round(value / 10) * 10;
  return Math.max(1, Math.round(value));
}

export function pricesFromUsdRate(rate: number) {
  return {
    ignitePrice: roundConvertedPrice(baseUsdPrices.ignitePrice * rate),
    ascentPrice: roundConvertedPrice(baseUsdPrices.ascentPrice * rate),
    empirePrice: roundConvertedPrice(baseUsdPrices.empirePrice * rate)
  };
}

export function applyConvertedPrices(rule: LocationPricingRule): LocationPricingRule {
  const rate = usdConversionRates[rule.currency] ?? 1;

  return {
    ...rule,
    ...pricesFromUsdRate(rate)
  };
}

export function detectCountryCode() {
  const params = new URLSearchParams(window.location.search);
  const countryParam = params.get("country");

  if (countryParam) {
    return countryParam.trim().toUpperCase().slice(0, 2);
  }

  const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
  const localeWithRegion = locales.find((locale) => /[-_][A-Za-z]{2}\b/.test(locale));
  const match = localeWithRegion?.match(/[-_]([A-Za-z]{2})\b/);

  return match?.[1]?.toUpperCase() ?? "US";
}

export function formatLocalizedPrice(currency: string, amount: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
