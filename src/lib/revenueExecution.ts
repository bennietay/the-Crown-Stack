import { Lead, Opportunity, RevenueEvent } from "../types";

export const ACTIVE_REVENUE_UNITS = ["WAAS", "AMWAY"] as const;

/** Keep inactive historical records out of operational money metrics. */
export function activeRevenueEvents(events: RevenueEvent[]): RevenueEvent[] {
  return events.filter((event) => ACTIVE_REVENUE_UNITS.includes(event.businessUnit as (typeof ACTIVE_REVENUE_UNITS)[number]));
}

export function isWaasLead(lead: Lead): boolean {
  return !lead.businessUnit || lead.businessUnit === "WAAS";
}

const WAAS_STAGE_PROBABILITY: Record<string, number> = {
  Qualified: 0.25, Discovery: 0.35, "Solution proposed": 0.5, "Proposal sent": 0.7,
  Negotiation: 0.8, "Verbal agreement": 0.9, Won: 1, Lost: 0,
};

export function opportunityProbability(opportunity: Pick<Opportunity, "stage" | "probability">): number {
  if (typeof opportunity.probability === "number") return Math.max(0, Math.min(1, opportunity.probability > 1 ? opportunity.probability / 100 : opportunity.probability));
  return WAAS_STAGE_PROBABILITY[opportunity.stage] ?? 0.2;
}

export function weightedOpportunityValue(opportunity: Pick<Opportunity, "stage" | "probability" | "estimatedValue" | "expectedValue" | "expectedMrcValue" | "expectedOtcValue">): number {
  const value = opportunity.estimatedValue ?? opportunity.expectedValue ?? ((opportunity.expectedOtcValue ?? 0) + (opportunity.expectedMrcValue ?? 0));
  return (value || 0) * opportunityProbability(opportunity);
}

export function goalPacing(target: number, collected: number, startDate: string, endDate: string, now = new Date()) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil((now.getTime() - start) / 86_400_000)));
  const expected = target * elapsedDays / totalDays;
  return { target, collected, expected, gap: Math.max(0, target - collected), pace: target ? collected / target : 0, onTrack: collected >= expected };
}

export function outreachCompleted(leads: Lead[], dayKey: string): number {
  return leads.filter((lead) => lead.lastContactedAt?.slice(0, 10) === dayKey).reduce((sum, lead) => sum + (lead.messagesSentCount ?? 0), 0);
}

export function conversionRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}
