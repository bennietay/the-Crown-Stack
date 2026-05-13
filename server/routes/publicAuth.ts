import { Router } from "express";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export const publicAuthRouter = Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

publicAuthRouter.post("/public/register", async (req, res) => {
  const { email, password, displayName, tenantName, countryCode } = req.body as {
    email?: string;
    password?: string;
    displayName?: string;
    tenantName?: string;
    countryCode?: string;
  };

  const normalizedEmail = email?.trim().toLowerCase();
  const cleanDisplayName = displayName?.trim();

  if (!normalizedEmail || !emailPattern.test(normalizedEmail) || !password || password.length < 8 || !cleanDisplayName) {
    return res.status(400).json({
      error: "A valid email, display name, and password of at least 8 characters are required."
    });
  }

  const slugBase = normalizedEmail
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase || "workspace"}-${Date.now().toString(36)}`;
  const requestedCountry =
    countryCode?.toUpperCase().slice(0, 2) ??
    req.header("x-vercel-ip-country")?.toUpperCase().slice(0, 2) ??
    "US";
  const { data: locationRule } = await supabaseAdmin
    .from("location_pricing_rules")
    .select("country_code,currency")
    .eq("country_code", requestedCountry)
    .eq("enabled", true)
    .maybeSingle();

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: tenantName?.trim() || `${cleanDisplayName}'s Duplios Team`,
      slug,
      tier: "ignite",
      status: "trialing",
      country_code: locationRule?.country_code ?? requestedCountry,
      currency: locationRule?.currency ?? "USD",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    return res.status(500).json({ error: tenantError?.message ?? "Unable to create tenant." });
  }

  const { data: userResult, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: cleanDisplayName,
      tenant_id: tenant.id,
      onboarding_source: "public_registration"
    }
  });

  if (createUserError || !userResult.user) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    return res.status(500).json({
      error: createUserError?.message ?? "Unable to create Supabase user."
    });
  }

  const userId = userResult.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    tenant_id: tenant.id,
    display_name: cleanDisplayName,
    email: normalizedEmail,
    tier: "ignite",
    role: "admin",
    status: "active"
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    return res.status(500).json({ error: profileError.message });
  }

  await supabaseAdmin.from("sales_pages").upsert(
    {
      tenant_id: tenant.id,
      headline: "Build a team that duplicates before motivation fades.",
      subheadline:
        "Your private Duplios workspace is ready for scripts, follow-up, and team momentum.",
      primary_cta: "Request the private overview",
      proof_points: ["Daily action system", "Leader-approved scripts", "Rank-path momentum"],
      offer_stack: ["Daily Apex", "Script Vault", "Personal CRM", "Duplication workflow"],
      is_published: false
    },
    { onConflict: "tenant_id" }
  );

  await supabaseAdmin.from("scripts").insert([
    {
      id: randomUUID(),
      tenant_id: tenant.id,
      owner_uid: userId,
      title: "First private invite",
      channel: "dm",
      body:
        "Hey, I’m opening a small private list for people who want a simple wellness reset and a cleaner daily rhythm. Want the short overview?",
      visibility: "tenant"
    },
    {
      id: randomUUID(),
      tenant_id: tenant.id,
      owner_uid: userId,
      title: "Follow-up after interest",
      channel: "sms",
      body:
        "Perfect. I’ll send the overview. If it feels aligned, we can look at whether the product or the business side is the better fit.",
      visibility: "tenant"
    }
  ]);

  return res.status(201).json({
    registered: true,
    tenantId: tenant.id,
    email: normalizedEmail
  });
});
