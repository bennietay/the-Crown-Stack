import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export const tierPriceIds = {
  ignite: process.env.STRIPE_IGNITE_PRICE_ID?.trim(),
  ascent: process.env.STRIPE_ASCENT_PRICE_ID?.trim(),
  empire: process.env.STRIPE_EMPIRE_PRICE_ID?.trim()
};

export const stripeConfig = {
  hasSecretKey: Boolean(stripeSecretKey),
  hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
  pricesConfigured: {
    ignite: Boolean(tierPriceIds.ignite),
    ascent: Boolean(tierPriceIds.ascent),
    empire: Boolean(tierPriceIds.empire)
  }
};

export function missingStripeConfig(tier?: keyof typeof tierPriceIds) {
  const missing: string[] = [];

  if (!stripeConfig.hasSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }

  if (tier && !tierPriceIds[tier]) {
    missing.push(`STRIPE_${tier.toUpperCase()}_PRICE_ID`);
  }

  return missing;
}
