import { Router } from "express";
import { stripe, stripeConfig, tierPriceIds } from "../lib/stripe.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import type { SubscriptionTier } from "../middleware/SubscriptionMiddleware.js";

export const configRouter = Router();

configRouter.get("/public/config", (_req, res) => {
  res.json({
    supabase: {
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    stripe: {
      configured: Boolean(stripe),
      hasSecretKey: stripeConfig.hasSecretKey,
      hasWebhookSecret: stripeConfig.hasWebhookSecret,
      pricesConfigured: stripeConfig.pricesConfigured
    },
    appUrl: Boolean(process.env.APP_URL),
    runtime: {
      vercel: process.env.VERCEL === "1",
      nodeEnv: process.env.NODE_ENV ?? "development"
    }
  });
});

configRouter.get("/public/pricing", async (req, res) => {
  const requestedCountry =
    typeof req.query.country === "string"
      ? req.query.country.toUpperCase().slice(0, 2)
      : req.header("x-vercel-ip-country")?.toUpperCase().slice(0, 2) ?? "US";
  const { data: locationRule } = await supabaseAdmin
    .from("location_pricing_rules")
    .select("country_code,currency,ignite_price,ascent_price,empire_price,tax_mode")
    .eq("country_code", requestedCountry)
    .eq("enabled", true)
    .maybeSingle();

  if (!stripe) {
    return res.json({
      configured: false,
      prices: {},
      locationRule: locationRule
        ? {
            countryCode: locationRule.country_code,
            currency: locationRule.currency,
            ignitePrice: Number(locationRule.ignite_price),
            ascentPrice: Number(locationRule.ascent_price),
            empirePrice: Number(locationRule.empire_price),
            taxMode: locationRule.tax_mode
          }
        : null
    });
  }

  const stripeClient = stripe;
  const tiers = Object.entries(tierPriceIds) as Array<[SubscriptionTier, string | undefined]>;
  const prices: Record<string, unknown> = {};

  await Promise.all(
    tiers.map(async ([tier, priceId]) => {
      if (!priceId) return;

      const price = await stripeClient.prices.retrieve(priceId);

      prices[tier] = {
        id: price.id,
        currency: price.currency.toUpperCase(),
        unitAmount: price.unit_amount,
        interval: price.recurring?.interval ?? null
      };
    })
  );

  return res.json({
    configured: true,
    prices,
    locationRule: locationRule
      ? {
          countryCode: locationRule.country_code,
          currency: locationRule.currency,
          ignitePrice: Number(locationRule.ignite_price),
          ascentPrice: Number(locationRule.ascent_price),
          empirePrice: Number(locationRule.empire_price),
          taxMode: locationRule.tax_mode
        }
      : null
  });
});
