import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { writeAuditLog } from "../lib/audit.js";
import { missingStripeConfig, stripe, tierPriceIds } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireSupabaseUser,
  requireTenantMatch,
  type SubscriptionTier
} from "../middleware/SubscriptionMiddleware.js";

export const billingRouter = Router();

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
};

function getAppUrl(req: Request) {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");

  if (appUrl) {
    return appUrl;
  }

  const origin = req.header("origin")?.replace(/\/+$/, "");

  if (origin) {
    return origin;
  }

  throw new Error("APP_URL is required for checkout redirects.");
}

async function recordBillingEvent(event: Stripe.Event, tenantId?: string | null) {
  await supabaseAdmin.from("billing_events").upsert(
    {
      tenant_id: tenantId ?? null,
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event
    },
    { onConflict: "stripe_event_id" }
  );
}

async function updateTenantFromSubscription(subscription: Stripe.Subscription, statusOverride?: string) {
  const tenantId = subscription.metadata?.tenantId;
  const tier = subscription.metadata?.tier as SubscriptionTier | undefined;

  if (!tenantId) return null;

  const status =
    statusOverride ??
    (subscription.status === "active" || subscription.status === "trialing"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : subscription.status === "canceled" || subscription.status === "unpaid"
          ? "paused"
          : subscription.status);

  await supabaseAdmin
    .from("tenants")
    .update({
      ...(tier ? { tier } : {}),
      status,
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null
    })
    .eq("id", tenantId);

  await writeAuditLog({
    tenantId,
    action: "billing.subscription_synced",
    targetType: "stripe_subscription",
    targetId: subscription.id,
    metadata: { status: subscription.status, tier }
  });

  return tenantId;
}

billingRouter.post("/public/checkout", async (req, res) => {
  const { email, tier, tenantName, countryCode } = req.body as {
    email?: string;
    tier?: SubscriptionTier;
    tenantName?: string;
    countryCode?: string;
  };
  const price = tier ? tierPriceIds[tier] : undefined;
  const missingConfig = missingStripeConfig(tier);

  if (!stripe || missingConfig.length > 0) {
    return res.status(503).json({
      error: `Stripe is not configured. Missing: ${missingConfig.join(", ")}. Redeploy Vercel after adding environment variables.`
    });
  }

  if (!email || !emailPattern.test(email) || !tier || !price) {
    return res.status(400).json({ error: "a valid email and a configured tier price are required." });
  }

  const slugBase = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${Date.now().toString(36)}`;
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

  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: tenantName || `${email.split("@")[0]}'s Duplios Team`,
      slug,
      tier,
      status: "checkout_pending",
      country_code: locationRule?.country_code ?? requestedCountry,
      currency: locationRule?.currency ?? "USD",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select("id,name")
    .single();

  if (error || !tenant) {
    return res.status(500).json({ error: error?.message ?? "Unable to create checkout tenant." });
  }

  const appUrl = getAppUrl(req);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    billing_address_collection: "auto",
    automatic_tax: { enabled: true },
    customer_email: email,
    line_items: [{ price, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        tenantId: tenant.id,
        tier
      }
    },
    client_reference_id: tenant.id,
    metadata: {
      tenantId: tenant.id,
      tier,
      buyerEmail: email
    },
    success_url: `${appUrl}/?view=activate&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/?checkout=cancelled`
  });

  await supabaseAdmin.from("checkout_intents").insert({
    tenant_id: tenant.id,
    email,
    tier,
    stripe_checkout_session_id: session.id,
    status: "created"
  });

  await supabaseAdmin.from("notification_events").insert({
    tenant_id: tenant.id,
    event_type: "new_signup",
    recipient_email: email,
    channel: "both",
    status: "queued",
    payload: { tier, source: "public_checkout" }
  });

  await writeAuditLog({
    tenantId: tenant.id,
    action: "billing.checkout_started",
    targetType: "stripe_checkout_session",
    targetId: session.id,
    metadata: { tier, email, countryCode: locationRule?.country_code ?? requestedCountry }
  });

  return res.json({ url: session.url });
});

billingRouter.post("/public/activate", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: "Stripe is not configured. Missing: STRIPE_SECRET_KEY. Redeploy Vercel after adding environment variables."
    });
  }

  const { sessionId, displayName, password } = req.body as {
    sessionId?: string;
    displayName?: string;
    password?: string;
  };

  if (!sessionId || !displayName || !password || password.length < 8) {
    return res.status(400).json({
      error: "sessionId, displayName, and a password of at least 8 characters are required."
    });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const tenantId = session.metadata?.tenantId;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;
  const email = session.customer_details?.email ?? session.customer_email ?? session.metadata?.buyerEmail;

  if (!tenantId || !tier || !email) {
    return res.status(400).json({ error: "Checkout session is missing activation metadata." });
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return res.status(402).json({ error: "Checkout has not been completed." });
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return res.json({ activated: true, tenantId, email });
  }

  const { data: userResult, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      tenant_id: tenantId,
      onboarding_source: "stripe_checkout"
    }
  });

  if (createUserError || !userResult.user) {
    return res.status(500).json({
      error: createUserError?.message ?? "Unable to create Supabase user."
    });
  }

  const userId = userResult.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: userId,
    tenant_id: tenantId,
    display_name: displayName,
    email,
    tier,
    role: "admin",
    status: "active"
  });

  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }

  await supabaseAdmin
    .from("tenants")
    .update({
      tier,
      status: "active",
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null
    })
    .eq("id", tenantId);

  await supabaseAdmin.from("sales_pages").upsert(
    {
      tenant_id: tenantId,
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
      tenant_id: tenantId,
      owner_uid: userId,
      title: "First private invite",
      channel: "dm",
      body:
        "Hey, I’m opening a small private list for people who want a simple wellness reset and a cleaner daily rhythm. Want the short overview?",
      visibility: "tenant"
    },
    {
      id: randomUUID(),
      tenant_id: tenantId,
      owner_uid: userId,
      title: "Follow-up after interest",
      channel: "sms",
      body:
        "Perfect. I’ll send the overview. If it feels aligned, we can look at whether the product or the business side is the better fit.",
      visibility: "tenant"
    }
  ]);

  await supabaseAdmin
    .from("checkout_intents")
    .update({ status: "activated", activated_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", sessionId);

  await writeAuditLog({
    tenantId,
    actorUid: userId,
    action: "billing.checkout_activated",
    targetType: "tenant",
    targetId: tenantId,
    metadata: { tier, email }
  });

  return res.json({ activated: true, tenantId, email });
});

billingRouter.post(
  "/billing/:tenantId/portal",
  requireSupabaseUser,
  requireTenantMatch,
  async (req, res) => {
    if (!stripe) {
      return res.status(503).json({
        error: "Stripe is not configured. Missing: STRIPE_SECRET_KEY. Redeploy Vercel after adding environment variables."
      });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id,stripe_customer_id")
      .eq("id", req.user!.tenantId)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    if (!tenant.stripe_customer_id) {
      return res.status(409).json({ error: "No Stripe customer is connected to this tenant yet." });
    }

    const appUrl = getAppUrl(req);
    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${appUrl}/?view=settings&billing=portal_return`
    });

    await writeAuditLog({
      tenantId: tenant.id,
      actorUid: req.user!.uid,
      action: "billing.portal_opened",
      targetType: "stripe_customer",
      targetId: tenant.stripe_customer_id
    });

    return res.json({ url: portal.url });
  }
);

billingRouter.post(
  "/billing/:tenantId/checkout",
  requireSupabaseUser,
  requireTenantMatch,
  async (req, res) => {
    if (!stripe) {
      return res.status(503).json({
        error: "Stripe is not configured. Missing: STRIPE_SECRET_KEY. Redeploy Vercel after adding environment variables."
      });
    }

    const { tier } = req.body as { tier?: SubscriptionTier };
    const price = tier ? tierPriceIds[tier] : undefined;

    if (!tier || !price) {
      return res.status(400).json({ error: "A configured tier price is required." });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id,name,stripe_customer_id")
      .eq("id", req.user!.tenantId)
      .single();

    if (error || !tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    if (!["active", "trialing"].includes(req.user!.tenantStatus ?? "")) {
      return res.status(402).json({ error: "Tenant subscription is not active." });
    }

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "auto",
      automatic_tax: { enabled: true },
      customer: tenant.stripe_customer_id ?? undefined,
      customer_email: tenant.stripe_customer_id ? undefined : req.user!.email,
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          tenantId: tenant.id,
          tier
        }
      },
      client_reference_id: tenant.id,
      metadata: {
        tenantId: tenant.id,
        tier
      },
      success_url: `${appUrl}/?view=dashboard&billing=success`,
      cancel_url: `${appUrl}/?view=dashboard&billing=cancelled`
    });

    return res.json({ url: session.url });
  }
);

export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({
      error: "Stripe webhook is not configured. Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET."
    });
  }

  const signature = req.header("stripe-signature");

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe signature." });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).json({ error: `Webhook verification failed: ${String(error)}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const tenantId = session.metadata?.tenantId;
    const tier = session.metadata?.tier;

    if (tenantId && tier) {
      await supabaseAdmin
        .from("tenants")
        .update({
          tier,
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : null
        })
        .eq("id", tenantId);

      await recordBillingEvent(event, tenantId);

      await supabaseAdmin
        .from("checkout_intents")
        .update({ status: "completed" })
        .eq("stripe_checkout_session_id", session.id);

      await writeAuditLog({
        tenantId,
        action: "billing.checkout_completed",
        targetType: "stripe_checkout_session",
        targetId: session.id,
        metadata: { tier }
      });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object;
    const tenantId = await updateTenantFromSubscription(subscription);
    await recordBillingEvent(event, tenantId);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const tenantId = await updateTenantFromSubscription(subscription, "paused");
    await recordBillingEvent(event, tenantId);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as InvoiceWithSubscription;
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    let tenantId: string | null = null;

    if (subscriptionId && stripe) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      tenantId = subscription.metadata?.tenantId ?? null;

      if (tenantId) {
        await supabaseAdmin.from("tenants").update({ status: "past_due" }).eq("id", tenantId);
        await supabaseAdmin.from("notification_events").insert({
          tenant_id: tenantId,
          event_type: "payment_failed",
          channel: "email",
          status: "queued",
          payload: { invoiceId: invoice.id, subscriptionId }
        });
      }
    }

    await recordBillingEvent(event, tenantId);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as InvoiceWithSubscription;
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
    let tenantId: string | null = null;

    if (subscriptionId && stripe) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      tenantId = subscription.metadata?.tenantId ?? null;

      if (tenantId) {
        await supabaseAdmin.from("tenants").update({ status: "active" }).eq("id", tenantId);
      }
    }

    await recordBillingEvent(event, tenantId);
  }

  return res.json({ received: true });
}
