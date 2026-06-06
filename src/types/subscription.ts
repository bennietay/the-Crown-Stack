export type SubscriptionTier = "ignite" | "ascent" | "empire";

export type FeatureKey =
  | "daily-apex"
  | "script-vault"
  | "personal-crm"
  | "landing-page-builder"
  | "automation-sequences"
  | "team-snapshot"
  | "duplication-engine"
  | "ai-prospecting-hub"
  | "team-analytics";

export const tierRank: Record<SubscriptionTier, number> = {
  ignite: 1,
  ascent: 2,
  empire: 3
};

export const tierFeatures: Record<SubscriptionTier, FeatureKey[]> = {
  ignite: ["daily-apex", "script-vault", "personal-crm"],
  ascent: [
    "daily-apex",
    "script-vault",
    "personal-crm",
    "landing-page-builder",
    "automation-sequences",
    "team-snapshot"
  ],
  empire: [
    "daily-apex",
    "script-vault",
    "personal-crm",
    "landing-page-builder",
    "automation-sequences",
    "team-snapshot",
    "duplication-engine",
    "ai-prospecting-hub",
    "team-analytics"
  ]
};

export const hasFeature = (tier: SubscriptionTier, feature: FeatureKey) =>
  tierFeatures[tier].includes(feature);
