import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireFeature,
  requireSupabaseUser,
  requireTenantMatch
} from "../middleware/SubscriptionMiddleware.js";

export const cmsRouter = Router();

cmsRouter.get("/public/:tenantSlug/sales-page", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("sales_pages")
    .select("*,tenants!inner(slug,status)")
    .eq("tenants.slug", req.params.tenantSlug)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Sales page not found." });
  }

  return res.json({ page: data });
});

cmsRouter.get(
  "/cms/:tenantId/sales-page",
  requireSupabaseUser,
  requireTenantMatch,
  requireFeature("landing-page-builder"),
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("sales_pages")
      .select("*")
      .eq("tenant_id", req.user!.tenantId)
      .single();

    if (error && error.code !== "PGRST116") {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ page: data });
  }
);

cmsRouter.put(
  "/cms/:tenantId/sales-page",
  requireSupabaseUser,
  requireTenantMatch,
  requireFeature("landing-page-builder"),
  async (req, res) => {
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
      isPublished
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from("sales_pages")
      .upsert(
        {
          tenant_id: req.user!.tenantId,
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
  }
);
