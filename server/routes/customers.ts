import { Router } from "express";
import { writeAuditLog } from "../lib/audit.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireSupabaseUser,
  requireTenantMatch
} from "../middleware/SubscriptionMiddleware.js";

export const customersRouter = Router();

customersRouter.use(requireSupabaseUser);

const compact = (value: unknown) => String(value ?? "").trim();

customersRouter.get("/tenants/:tenantId/customers", requireTenantMatch, async (req, res) => {
  const tenantId = String(req.params.tenantId);
  const query = compact(req.query.q).toLowerCase();
  const stage = compact(req.query.stage);

  let request = supabaseAdmin
    .from("customer_profiles")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("next_follow_up_at", { ascending: true, nullsFirst: false })
    .limit(250);

  if (stage) {
    request = request.eq("stage", stage);
  }

  if (query) {
    request = request.or(
      `name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,product_focus.ilike.%${query}%,interests.cs.{${query}}`
    );
  }

  const { data, error } = await request;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ customers: data });
});

customersRouter.post("/tenants/:tenantId/customers", requireTenantMatch, async (req, res) => {
  const tenantId = String(req.params.tenantId);
  const {
    name,
    email,
    phone,
    source = "manual",
    stage = "lead",
    interests = [],
    productFocus = "",
    purchaseCadenceDays = 30,
    nextFollowUpAt,
    notes = ""
  } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    source?: string;
    stage?: string;
    interests?: string[];
    productFocus?: string;
    purchaseCadenceDays?: number;
    nextFollowUpAt?: string;
    notes?: string;
  };

  if (!compact(name)) {
    return res.status(400).json({ error: "Customer name is required." });
  }

  const { data, error } = await supabaseAdmin
    .from("customer_profiles")
    .insert({
      tenant_id: tenantId,
      owner_uid: req.user!.uid,
      name: compact(name),
      email: compact(email) || null,
      phone: compact(phone) || null,
      source: compact(source) || "manual",
      stage,
      interests,
      product_focus: compact(productFocus) || null,
      purchase_cadence_days: Math.max(1, Number(purchaseCadenceDays) || 30),
      next_follow_up_at: nextFollowUpAt ?? null,
      notes: compact(notes) || null
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await writeAuditLog({
    tenantId,
    actorUid: req.user!.uid,
    action: "customer.created",
    targetType: "customer_profile",
    targetId: String(data.id),
    metadata: { source, stage }
  });

  return res.status(201).json({ customer: data });
});

customersRouter.patch("/tenants/:tenantId/customers/:customerId", requireTenantMatch, async (req, res) => {
  const tenantId = String(req.params.tenantId);
  const customerId = String(req.params.customerId);
  const {
    name,
    email,
    phone,
    source,
    stage,
    interests,
    productFocus,
    purchaseCadenceDays,
    nextFollowUpAt,
    notes
  } = req.body as Record<string, unknown>;

  const updates = {
    ...(name !== undefined ? { name: compact(name) } : {}),
    ...(email !== undefined ? { email: compact(email) || null } : {}),
    ...(phone !== undefined ? { phone: compact(phone) || null } : {}),
    ...(source !== undefined ? { source: compact(source) || "manual" } : {}),
    ...(stage !== undefined ? { stage: compact(stage) || "lead" } : {}),
    ...(Array.isArray(interests) ? { interests } : {}),
    ...(productFocus !== undefined ? { product_focus: compact(productFocus) || null } : {}),
    ...(purchaseCadenceDays !== undefined
      ? { purchase_cadence_days: Math.max(1, Number(purchaseCadenceDays) || 30) }
      : {}),
    ...(nextFollowUpAt !== undefined ? { next_follow_up_at: compact(nextFollowUpAt) || null } : {}),
    ...(notes !== undefined ? { notes: compact(notes) || null } : {}),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from("customer_profiles")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await writeAuditLog({
    tenantId,
    actorUid: req.user!.uid,
    action: "customer.updated",
    targetType: "customer_profile",
    targetId: customerId
  });

  return res.json({ customer: data });
});

customersRouter.post(
  "/tenants/:tenantId/customers/:customerId/purchases",
  requireTenantMatch,
  async (req, res) => {
    const tenantId = String(req.params.tenantId);
    const customerId = String(req.params.customerId);
    const { product, amount = 0, currency = "USD", purchasedAt, note = "" } = req.body as {
      product?: string;
      amount?: number;
      currency?: string;
      purchasedAt?: string;
      note?: string;
    };

    if (!compact(product)) {
      return res.status(400).json({ error: "Product is required." });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customer_profiles")
      .select("id,purchase_cadence_days")
      .eq("tenant_id", tenantId)
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return res.status(404).json({ error: "Customer was not found." });
    }

    const purchaseDate = purchasedAt ? new Date(purchasedAt) : new Date();
    const nextPurchaseAt = new Date(
      purchaseDate.getTime() + Number(customer.purchase_cadence_days ?? 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: purchase, error } = await supabaseAdmin
      .from("customer_purchases")
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        product: compact(product),
        amount: Number(amount) || 0,
        currency: compact(currency).toUpperCase() || "USD",
        purchased_at: purchaseDate.toISOString(),
        next_purchase_at: nextPurchaseAt,
        note: compact(note) || null
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await supabaseAdmin
      .from("customer_profiles")
      .update({
        stage: "customer",
        last_purchase_at: purchaseDate.toISOString(),
        next_purchase_at: nextPurchaseAt,
        next_follow_up_at: nextPurchaseAt,
        updated_at: new Date().toISOString()
      })
      .eq("id", customerId);

    await writeAuditLog({
      tenantId,
      actorUid: req.user!.uid,
      action: "customer.purchase_logged",
      targetType: "customer_purchase",
      targetId: String(purchase.id),
      metadata: { customerId, product: compact(product), amount }
    });

    return res.status(201).json({ purchase });
  }
);
