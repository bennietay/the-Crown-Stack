import type { SubscriptionTier } from "../types/subscription";
import type {
  AuditLogRecord,
  BillingEventRecord,
  EnterpriseOpsHealth,
  TenantRecord,
  TrafficRevenueMetric
} from "../types/tenant";
import { supabase } from "./supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export async function createCheckoutSession(tenantId: string, tier: SubscriptionTier) {
  return apiFetch<{ url: string }>(`/api/billing/${tenantId}/checkout`, {
    method: "POST",
    body: JSON.stringify({ tier })
  });
}

export async function createBillingPortalSession(tenantId: string) {
  return apiFetch<{ url: string }>(`/api/billing/${tenantId}/portal`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function createPublicCheckoutSession(email: string, tier: SubscriptionTier, countryCode?: string) {
  const response = await fetch(`${apiBaseUrl}/api/public/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, tier, countryCode })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Unable to start checkout.");
  }

  return response.json() as Promise<{ url: string }>;
}

export async function registerPublicAccount(input: {
  email: string;
  password: string;
  displayName: string;
  tenantName?: string;
}) {
  const response = await fetch(`${apiBaseUrl}/api/public/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Unable to create account.");
  }

  return response.json() as Promise<{ registered: boolean; tenantId: string; email: string }>;
}

export async function getPublicPricing(countryCode?: string) {
  const path = countryCode
    ? `/api/public/pricing?country=${encodeURIComponent(countryCode)}`
    : "/api/public/pricing";
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    return { configured: false, prices: {} } as {
      configured: boolean;
      prices: Partial<
        Record<
          SubscriptionTier,
          {
            id: string;
            currency: string;
            unitAmount: number | null;
            interval: string | null;
          }
        >
      >;
      locationRule?: {
        countryCode: string;
        currency: string;
        ignitePrice: number;
        ascentPrice: number;
        empirePrice: number;
        taxMode: string;
      } | null;
    };
  }

  return response.json() as Promise<{
    configured: boolean;
    prices: Partial<
      Record<
        SubscriptionTier,
        {
          id: string;
          currency: string;
          unitAmount: number | null;
          interval: string | null;
        }
      >
    >;
    locationRule?: {
      countryCode: string;
      currency: string;
      ignitePrice: number;
      ascentPrice: number;
      empirePrice: number;
      taxMode: string;
    } | null;
  }>;
}

export async function activateCheckout(sessionId: string, displayName: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/public/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId, displayName, password })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Unable to activate account.");
  }

  return response.json() as Promise<{ activated: boolean; tenantId: string; email: string }>;
}

export async function capturePublicLead(input: {
  tenantSlug: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  campaign?: string;
  message?: string;
  consent?: boolean;
  nextAction?: string;
  captureSecret?: string;
}) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (input.captureSecret) {
    headers.set("x-duplios-capture-secret", input.captureSecret);
  }

  const response = await fetch(`${apiBaseUrl}/api/public/leads/capture`, {
    method: "POST",
    headers,
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Unable to capture lead.");
  }

  return response.json() as Promise<{
    lead: {
      id: string;
      source: string;
      stage: string;
      next_follow_up_at: string;
    };
  }>;
}

export interface CustomerProfileInput {
  name: string;
  email?: string;
  phone?: string;
  source?: string;
  stage?: string;
  interests?: string[];
  productFocus?: string;
  purchaseCadenceDays?: number;
  nextFollowUpAt?: string;
  notes?: string;
}

export async function listCustomerProfiles(tenantId: string, params: { q?: string; stage?: string } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.stage) query.set("stage", params.stage);

  return apiFetch<{ customers: unknown[] }>(
    `/api/tenants/${tenantId}/customers${query.size ? `?${query.toString()}` : ""}`
  );
}

export async function createCustomerProfile(tenantId: string, input: CustomerProfileInput) {
  return apiFetch<{ customer: unknown }>(`/api/tenants/${tenantId}/customers`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCustomerProfile(
  tenantId: string,
  customerId: string,
  input: Partial<CustomerProfileInput>
) {
  return apiFetch<{ customer: unknown }>(`/api/tenants/${tenantId}/customers/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function logCustomerPurchase(
  tenantId: string,
  customerId: string,
  input: { product: string; amount?: number; currency?: string; purchasedAt?: string; note?: string }
) {
  return apiFetch<{ purchase: unknown }>(`/api/tenants/${tenantId}/customers/${customerId}/purchases`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

function mapTenantRecord(row: Record<string, unknown>): TenantRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    status: String(row.status ?? "trialing") as TenantRecord["status"],
    tier: String(row.tier ?? "ignite") as SubscriptionTier,
    ownerEmail: String(row.owner_email ?? row.ownerEmail ?? ""),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : undefined,
    members: Number(row.members ?? 0),
    duplicationScore: Number(row.duplication_score ?? row.duplicationScore ?? 0),
    trialEndsAt: row.trial_ends_at ? String(row.trial_ends_at) : undefined,
    countryCode: row.country_code ? String(row.country_code) : undefined,
    currency: row.currency ? String(row.currency) : undefined,
    monthlyRevenue: Number(row.monthly_revenue ?? row.monthlyRevenue ?? 0),
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString())
  };
}

function mapTrafficMetric(row: Record<string, unknown>): TrafficRevenueMetric {
  return {
    date: String(row.date),
    visitors: Number(row.visitors ?? 0),
    sessions: Number(row.sessions ?? row.visitors ?? 0),
    pageViews: Number(row.page_views ?? row.pageViews ?? row.visitors ?? 0),
    clicks: Number(row.clicks ?? 0),
    uniqueVisitors: Number(row.unique_visitors ?? row.uniqueVisitors ?? row.visitors ?? 0),
    bounceRate: Number(row.bounce_rate ?? row.bounceRate ?? 0),
    signups: Number(row.signups ?? 0),
    trials: Number(row.trials ?? 0),
    paidConversions: Number(row.paid_conversions ?? row.paidConversions ?? 0),
    adSpend: Number(row.ad_spend ?? row.adSpend ?? 0),
    revenue: Number(row.revenue ?? 0),
    sourceBreakdown: Array.isArray(row.source_breakdown ?? row.sourceBreakdown)
      ? ((row.source_breakdown ?? row.sourceBreakdown) as TrafficRevenueMetric["sourceBreakdown"])
      : []
  };
}

export async function listAdminTenants() {
  const { tenants } = await apiFetch<{ tenants: Record<string, unknown>[] }>("/api/admin/tenants");
  return tenants.map(mapTenantRecord);
}

export async function createAdminTenant(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  status?: TenantRecord["status"];
  tier?: SubscriptionTier;
  trialEndsAt?: string;
  countryCode?: string;
  currency?: string;
}) {
  const { tenant } = await apiFetch<{ tenant: Record<string, unknown> }>("/api/admin/tenants", {
    method: "POST",
    body: JSON.stringify(input)
  });
  return mapTenantRecord(tenant);
}

export async function updateAdminTenant(
  tenantId: string,
  input: Partial<Pick<TenantRecord, "status" | "tier" | "trialEndsAt" | "countryCode" | "currency">>
) {
  const { tenant } = await apiFetch<{ tenant: Record<string, unknown> }>(`/api/admin/tenants/${tenantId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
  return mapTenantRecord(tenant);
}

export async function extendAdminTenantTrial(tenantId: string, days = 14) {
  const { tenant } = await apiFetch<{ tenant: Record<string, unknown> }>(
    `/api/admin/tenants/${tenantId}/trial/extend`,
    {
      method: "POST",
      body: JSON.stringify({ days })
    }
  );
  return mapTenantRecord(tenant);
}

export async function endAdminTenantTrial(tenantId: string) {
  const { tenant } = await apiFetch<{ tenant: Record<string, unknown> }>(
    `/api/admin/tenants/${tenantId}/trial/end`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
  return mapTenantRecord(tenant);
}

export async function listAdminAnalytics() {
  const { metrics } = await apiFetch<{ metrics: Record<string, unknown>[] }>("/api/admin/analytics");
  return metrics.map(mapTrafficMetric);
}

export async function getEnterpriseOpsHealth() {
  return apiFetch<{ health: EnterpriseOpsHealth }>("/api/admin/enterprise-health");
}

export async function listAdminAuditLogs() {
  const { logs } = await apiFetch<{ logs: Record<string, unknown>[] }>("/api/admin/audit-logs");
  return logs.map(
    (row): AuditLogRecord => ({
      id: String(row.id),
      tenantId: row.tenant_id ? String(row.tenant_id) : undefined,
      actorUid: row.actor_uid ? String(row.actor_uid) : undefined,
      action: String(row.action),
      targetType: String(row.target_type),
      targetId: row.target_id ? String(row.target_id) : undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at)
    })
  );
}

export async function listAdminBillingEvents() {
  const { events } = await apiFetch<{ events: Record<string, unknown>[] }>("/api/admin/billing-events");
  return events.map(
    (row): BillingEventRecord => ({
      id: String(row.id),
      tenantId: row.tenant_id ? String(row.tenant_id) : undefined,
      stripeEventId: String(row.stripe_event_id),
      eventType: String(row.event_type),
      createdAt: String(row.created_at)
    })
  );
}

export async function generateAiScript(input: {
  provider: "gemini" | "deepseek" | "openai";
  model?: string;
  platform: string;
  tone: string;
  context: string;
  baseScript: string;
}) {
  const response = await fetch(`${apiBaseUrl}/api/ai/generate-script`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Unable to generate script.");
  }

  return response.json() as Promise<{ provider: "gemini" | "deepseek" | "openai" | "local"; script: string; missingKey?: string }>;
}
