import type { SubscriptionTier } from "../types/subscription";
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
