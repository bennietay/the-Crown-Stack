import { BusinessUnit, RevenueEvent } from "../types";

export type RevenueTotals = {
  collected: number;
  booked: number;
  expected: number;
  refunded: number;
  profit: number;
  excludedForeignCurrencyEvents: number;
};

export function amountInMyr(event: RevenueEvent): number | null {
  if (event.currency.toUpperCase() === "MYR") return event.grossRevenue;
  if (event.exchangeRateToMyr && event.exchangeRateToMyr > 0) return event.grossRevenue * event.exchangeRateToMyr;
  return null;
}

export function costsInMyr(event: RevenueEvent): number | null {
  if (event.currency.toUpperCase() === "MYR") return event.costs + event.fees;
  if (event.exchangeRateToMyr && event.exchangeRateToMyr > 0) return (event.costs + event.fees) * event.exchangeRateToMyr;
  return null;
}

export function summarizeRevenue(events: RevenueEvent[]): RevenueTotals {
  return events.reduce<RevenueTotals>((totals, event) => {
    const gross = amountInMyr(event);
    const costs = costsInMyr(event);
    if (gross === null || costs === null) {
      totals.excludedForeignCurrencyEvents += 1;
      return totals;
    }
    if (event.status === "collected") totals.collected += gross;
    if (event.status === "booked") totals.booked += gross;
    if (event.status === "expected") totals.expected += gross;
    if (event.status === "refunded") totals.refunded += gross;
    if (event.status !== "cancelled" && event.status !== "refunded" && event.metadata?.costsKnown !== false) totals.profit += gross - costs;
    return totals;
  }, { collected: 0, booked: 0, expected: 0, refunded: 0, profit: 0, excludedForeignCurrencyEvents: 0 });
}

export function revenueByBusiness(events: RevenueEvent[]) {
  const units: BusinessUnit[] = ["WAAS", "ETSY", "AFFILIATE", "AMWAY"];
  return units.map(businessUnit => ({ businessUnit, ...summarizeRevenue(events.filter(event => event.businessUnit === businessUnit)) }));
}

export function inclusiveDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}
