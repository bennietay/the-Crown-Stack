import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireSuperadmin,
  requireSupabaseUser,
  type SubscriptionTier
} from "../middleware/SubscriptionMiddleware.js";

export const adminRouter = Router();

adminRouter.use(requireSupabaseUser, requireSuperadmin);

adminRouter.get("/admin/tenants", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tenant_overview")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ tenants: data });
});

adminRouter.post("/admin/tenants", async (req, res) => {
  const {
    name,
    slug,
    ownerEmail,
    status = "trialing",
    tier = "ignite",
    trialEndsAt,
    countryCode = "US",
    currency = "USD"
  } = req.body as {
    name?: string;
    slug?: string;
    ownerEmail?: string;
    status?: string;
    tier?: SubscriptionTier;
    trialEndsAt?: string;
    countryCode?: string;
    currency?: string;
  };

  if (!name || !slug || !ownerEmail) {
    return res.status(400).json({ error: "name, slug, and ownerEmail are required." });
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      name,
      slug,
      status,
      tier,
      trial_ends_at: trialEndsAt,
      country_code: countryCode,
      currency
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ tenant: data, ownerEmail });
});

adminRouter.patch("/admin/tenants/:tenantId", async (req, res) => {
  const { status, tier, trialEndsAt, countryCode, currency } = req.body as {
    status?: string;
    tier?: SubscriptionTier;
    trialEndsAt?: string;
    countryCode?: string;
    currency?: string;
  };

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({
      status,
      tier,
      trial_ends_at: trialEndsAt,
      country_code: countryCode,
      currency
    })
    .eq("id", req.params.tenantId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ tenant: data });
});

adminRouter.delete("/admin/tenants/:tenantId", async (req, res) => {
  const { error } = await supabaseAdmin.from("tenants").delete().eq("id", req.params.tenantId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

adminRouter.post("/admin/tenants/:tenantId/trial/extend", async (req, res) => {
  const { days = 7 } = req.body as { days?: number };
  const trialEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "trialing", trial_ends_at: trialEndsAt })
    .eq("id", req.params.tenantId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ tenant: data });
});

adminRouter.post("/admin/tenants/:tenantId/trial/end", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({ status: "paused", trial_ends_at: new Date().toISOString() })
    .eq("id", req.params.tenantId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ tenant: data });
});

adminRouter.get("/admin/analytics", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("traffic_revenue_analytics")
    .select("*")
    .order("date", { ascending: true })
    .limit(90);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ metrics: data });
});

adminRouter.get("/admin/audit-logs", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ logs: data });
});

adminRouter.get("/admin/billing-events", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("billing_events")
    .select("id,tenant_id,stripe_event_id,event_type,created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ events: data });
});

adminRouter.get("/admin/location-pricing", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("location_pricing_rules")
    .select("*")
    .order("country_code", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rules: data });
});

adminRouter.put("/admin/location-pricing/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("location_pricing_rules")
    .upsert({ id: req.params.id, ...req.body }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rule: data });
});

adminRouter.delete("/admin/location-pricing/:id", async (req, res) => {
  const { error } = await supabaseAdmin.from("location_pricing_rules").delete().eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

adminRouter.get("/admin/sales-pages", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("sales_pages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ pages: data });
});

adminRouter.put("/admin/sales-pages/:tenantId", async (req, res) => {
  const {
    headline,
    subheadline,
    primaryCta,
    proofPoints,
    offerStack,
    features,
    testimonials,
    pricing,
    faqs,
    isPublished = false
  } = req.body as {
    headline?: string;
    subheadline?: string;
    primaryCta?: string;
    proofPoints?: string[];
    offerStack?: string[];
    features?: unknown[];
    testimonials?: unknown[];
    pricing?: unknown[];
    faqs?: unknown[];
    isPublished?: boolean;
  };

  const { data, error } = await supabaseAdmin
    .from("sales_pages")
    .upsert(
      {
        tenant_id: req.params.tenantId,
        headline,
        subheadline,
        primary_cta: primaryCta,
        proof_points: proofPoints,
        offer_stack: offerStack,
        features,
        testimonials,
        pricing,
        faqs,
        is_published: isPublished,
        updated_at: new Date().toISOString()
      },
      { onConflict: "tenant_id" }
    )
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ page: data });
});

adminRouter.delete("/admin/sales-pages/:tenantId", async (req, res) => {
  const { error } = await supabaseAdmin
    .from("sales_pages")
    .delete()
    .eq("tenant_id", req.params.tenantId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

adminRouter.get("/admin/notification-rules", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("notification_rules")
    .select("*")
    .order("trigger", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rules: data });
});

adminRouter.put("/admin/notification-rules/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("notification_rules")
    .upsert({ id: req.params.id, ...req.body }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ rule: data });
});

adminRouter.delete("/admin/notification-rules/:id", async (req, res) => {
  const { error } = await supabaseAdmin.from("notification_rules").delete().eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

adminRouter.get("/admin/tracking-settings", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tracking_settings")
    .select("*")
    .eq("id", "platform")
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ settings: data });
});

adminRouter.put("/admin/tracking-settings", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tracking_settings")
    .upsert({ id: "platform", ...req.body }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ settings: data });
});

adminRouter.get("/admin/seo-settings", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("seo_settings")
    .select("*")
    .eq("id", "platform")
    .single();

  if (error && error.code !== "PGRST116") {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ settings: data });
});

adminRouter.put("/admin/seo-settings", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("seo_settings")
    .upsert({ id: "platform", ...req.body }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ settings: data });
});

adminRouter.get("/admin/ad-campaigns", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("ad_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ campaigns: data });
});

adminRouter.put("/admin/ad-campaigns/:id", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("ad_campaigns")
    .upsert({ id: req.params.id, ...req.body }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ campaign: data });
});

adminRouter.delete("/admin/ad-campaigns/:id", async (req, res) => {
  const { error } = await supabaseAdmin.from("ad_campaigns").delete().eq("id", req.params.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});

adminRouter.get("/admin/settings", async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ settings: data });
});

adminRouter.put("/admin/settings/:key", async (req, res) => {
  const { value, scope = "platform" } = req.body as { value?: string; scope?: string };

  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .upsert({ key: req.params.key, value, scope }, { onConflict: "key" })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ setting: data });
});

adminRouter.delete("/admin/settings/:key", async (req, res) => {
  const { error } = await supabaseAdmin.from("system_settings").delete().eq("key", req.params.key);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(204).send();
});
