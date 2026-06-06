import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export const publicLeadsRouter = Router();

const allowedSources = new Set([
  "website",
  "google",
  "meta",
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "youtube",
  "referral",
  "event",
  "manual"
]);

const normalizeSource = (value: unknown) => {
  const source = String(value ?? "website").trim().toLowerCase();
  return allowedSources.has(source) ? source : "website";
};

const compact = (value: unknown) => String(value ?? "").trim();

publicLeadsRouter.post("/public/leads/capture", async (req, res) => {
  const {
    tenantSlug,
    name,
    email,
    phone,
    source,
    campaign,
    message,
    consent,
    captureSecret,
    company,
    nextAction
  } = req.body ?? {};

  if (company) {
    return res.status(204).end();
  }

  const configuredSecret = process.env.LEAD_CAPTURE_SECRET?.trim();
  const providedSecret = compact(req.get("x-duplios-capture-secret") ?? captureSecret);
  const normalizedSource = normalizeSource(source);
  const isFirstPartyWebsiteCapture = normalizedSource === "website";

  if (configuredSecret && !isFirstPartyWebsiteCapture && providedSecret !== configuredSecret) {
    return res.status(401).json({ error: "Invalid lead capture secret." });
  }

  if (!compact(tenantSlug) || !compact(name)) {
    return res.status(400).json({ error: "tenantSlug and name are required." });
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, status")
    .eq("slug", compact(tenantSlug))
    .in("status", ["trialing", "active"])
    .maybeSingle();

  if (tenantError) {
    return res.status(500).json({ error: tenantError.message });
  }

  if (!tenant) {
    return res.status(404).json({ error: "Active tenant was not found." });
  }

  const { data: owner, error: ownerError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenant.id)
    .in("role", ["admin", "superadmin", "leader"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    return res.status(500).json({ error: ownerError.message });
  }

  if (!owner) {
    return res.status(409).json({ error: "Tenant has no owner profile to route the lead to." });
  }

  const noteLines = [
    compact(email) ? `Email: ${compact(email)}` : null,
    compact(phone) ? `Phone: ${compact(phone)}` : null,
    compact(campaign) ? `Campaign: ${compact(campaign)}` : null,
    compact(message) ? `Message: ${compact(message)}` : null,
    consent === true ? "Consent: yes" : null,
    "Captured by Duplios public lead capture."
  ].filter(Boolean);

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("lead_records")
    .insert({
      tenant_id: tenant.id,
      owner_uid: owner.id,
      name: compact(name),
      source: normalizedSource,
      stage: "new",
      temperature: "warm",
      next_action: compact(nextAction) || "Qualify need and timing",
      next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: noteLines.join("\n")
    })
    .select("id, source, stage, next_follow_up_at")
    .single();

  if (leadError) {
    return res.status(500).json({ error: leadError.message });
  }

  const customerProfile = {
    tenant_id: tenant.id,
    owner_uid: owner.id,
    name: compact(name),
    email: compact(email) || null,
    phone: compact(phone) || null,
    source: normalizedSource,
    stage: "lead",
    interests: compact(message) ? [compact(message)] : [],
    next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    notes: noteLines.join("\n"),
    updated_at: new Date().toISOString()
  };

  if (customerProfile.email) {
    const { data: existingCustomer } = await supabaseAdmin
      .from("customer_profiles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("email", customerProfile.email)
      .maybeSingle();

    if (existingCustomer) {
      await supabaseAdmin
        .from("customer_profiles")
        .update(customerProfile)
        .eq("id", existingCustomer.id);
    } else {
      await supabaseAdmin.from("customer_profiles").insert(customerProfile);
    }
  } else {
    await supabaseAdmin.from("customer_profiles").insert(customerProfile);
  }

  return res.status(201).json({ lead });
});
