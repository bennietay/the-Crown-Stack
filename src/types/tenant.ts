import type { SubscriptionTier } from "./subscription";

export type UserRole = "new_joiner" | "member" | "leader" | "admin" | "superadmin";

export interface DupliosUserProfile {
  uid: string;
  displayName: string;
  email: string;
  tenantId: string;
  tier: SubscriptionTier;
  role: UserRole;
  isSuperadmin?: boolean;
  leaderUid?: string;
}

export interface ScriptAsset {
  id: string;
  tenantId: string;
  ownerUid: string;
  title: string;
  channel: "dm" | "story" | "sms" | "email";
  body: string;
  imageUrl?: string;
  pushedByUid?: string;
  updatedAt: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  status: "checkout_pending" | "trialing" | "active" | "past_due" | "paused" | "cancelled";
  tier: SubscriptionTier;
  ownerEmail: string;
  stripeCustomerId?: string;
  members: number;
  duplicationScore: number;
  trialEndsAt?: string;
  countryCode?: string;
  currency?: string;
  monthlyRevenue?: number;
  createdAt: string;
}

export interface SalesPageContent {
  tenantId: string;
  headline: string;
  subheadline: string;
  primaryCta: string;
  proofPoints: string[];
  offerStack: string[];
  features: Array<{
    title: string;
    body: string;
  }>;
  testimonials: Array<{
    quote: string;
    name: string;
    title: string;
  }>;
  pricing: Array<{
    tier: SubscriptionTier;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlighted?: boolean;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  updatedAt: string;
}

export interface SystemSetting {
  key: string;
  label: string;
  value: string;
  scope: "platform" | "tenant";
}

export interface AccessUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  status: "active" | "invited" | "suspended";
  lastSeenAt?: string;
  mfaEnabled: boolean;
}

export interface AccessInvite {
  id: string;
  email: string;
  role: UserRole;
  tier: SubscriptionTier;
  status: "pending" | "accepted" | "expired";
  invitedBy: string;
  expiresAt: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  category: "terms" | "privacy" | "refund" | "acceptable_use" | "earnings" | "medical" | "testimonial" | "compliance";
  body: string;
  status: "draft" | "in_review" | "approved" | "published";
  required: boolean;
  updatedAt: string;
  reviewedBy?: string;
}

export interface TrafficRevenueMetric {
  date: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  clicks: number;
  uniqueVisitors: number;
  bounceRate: number;
  signups: number;
  trials: number;
  paidConversions: number;
  adSpend: number;
  revenue: number;
  sourceBreakdown: Array<{
    source: "organic" | "paid" | "social" | "referral" | "direct";
    visitors: number;
    clicks: number;
    leads: number;
    revenue: number;
  }>;
}

export interface LocationPricingRule {
  id: string;
  countryCode: string;
  currency: string;
  ignitePrice: number;
  ascentPrice: number;
  empirePrice: number;
  taxMode: "stripe_tax" | "inclusive" | "manual";
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  trigger: "new_signup" | "new_appointment" | "daily_task_reminder" | "trial_ending";
  channel: "email" | "push" | "both";
  audience: "superadmin" | "tenant_admin" | "leader" | "member";
  subject: string;
  enabled: boolean;
}

export interface TrackingSettings {
  googleAnalyticsId: string;
  metaPixelId: string;
  tikTokPixelId: string;
  linkedInPartnerId: string;
  consentMode: "disabled" | "basic" | "advanced";
  enabled: boolean;
}

export interface SeoSettings {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl: string;
  keywords: string[];
  contentClusters: Array<{
    topic: string;
    intent: "awareness" | "comparison" | "commercial" | "conversion";
    targetKeyword: string;
    status: "planned" | "drafting" | "published" | "refresh";
  }>;
  answerEnginePrompts: string[];
  schemaTypes: string[];
  entitySignals: string[];
  aiOverviewTargets: string[];
  competitorKeywords: string[];
  localMarkets: string[];
  llmsTxtEnabled: boolean;
  faqCoverage: boolean;
  answerEngineSummary: string;
  leadMagnets: Array<{
    title: string;
    audience: string;
    cta: string;
    status: "draft" | "live" | "testing";
    conversionGoal: "lead" | "trial" | "demo";
  }>;
  sitemapEnabled: boolean;
  robotsMode: "index" | "noindex";
}

export interface AdCampaign {
  id: string;
  platform: "google" | "meta" | "tiktok" | "linkedin";
  name: string;
  objective: "traffic" | "lead" | "trial" | "purchase";
  budget: number;
  spend: number;
  clicks: number;
  leads: number;
  trials: number;
  revenue: number;
  status: "draft" | "active" | "paused";
}

export interface TeamMemberNode {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rank: string;
  sponsorId?: string;
  placementId?: string;
  leg: "left" | "right" | "center" | "personal" | "overflow";
  sponsorPath: string[];
  level: number;
  status: "active" | "inactive" | "at_risk" | "new";
  joinedAt: string;
  activeBuilders: number;
  customers: number;
  personalVolume: number;
  teamVolume: number;
  groupVolume: number;
  duplicationScore: number;
}

export interface LeadRecord {
  id: string;
  name: string;
  source: "linkedin" | "instagram" | "facebook" | "referral" | "event" | "manual";
  stage: "new" | "contacted" | "follow_up" | "appointment" | "customer" | "builder" | "not_now";
  temperature: "cold" | "warm" | "hot";
  ownerId: string;
  nextAction: string;
  nextFollowUpAt: string;
  lastTouchAt?: string;
  notes: string;
}

export interface FollowUpStep {
  id: string;
  dayOffset: number;
  channel: "dm" | "sms" | "email" | "call" | "linkedin";
  title: string;
  script: string;
  goal: string;
}

export interface AutomationSequence {
  id: string;
  name: string;
  trigger: "new_lead" | "no_reply" | "appointment_booked" | "new_joiner";
  status: "draft" | "active" | "paused";
  steps: FollowUpStep[];
}

export interface OutreachTask {
  id: string;
  platform: "linkedin" | "instagram" | "facebook" | "whatsapp" | "sms";
  action: "connect" | "message" | "comment" | "follow_up" | "invite";
  target: string;
  script: string;
  status: "queued" | "done" | "skipped";
}

export interface FastStartPlan {
  day: number;
  title: string;
  objective: string;
  actions: string[];
}

export interface ContactMemoryPrompt {
  id: string;
  category: "family" | "friends" | "work" | "community" | "customers" | "social";
  prompt: string;
  examples: string[];
  suggestedCount: number;
}

export interface PowerHourAction {
  id: string;
  title: string;
  target: number;
  completed: number;
  scriptHint: string;
}

export interface SponsorCheckIn {
  id: string;
  builderName: string;
  status: "needs_help" | "on_track" | "inactive" | "booked";
  blocker: string;
  recommendedAction: string;
}

export interface DuplicationPlaybookPackage {
  id: string;
  title: string;
  audience: "new_joiners" | "active_builders" | "leaders";
  checklist: string[];
  scriptIds: string[];
  resourceTitles: string[];
  pushedTo: number;
}

export interface ScriptPersonalizationOption {
  id: string;
  prospectType: "friend" | "professional" | "customer" | "cold_social";
  relationship: string;
  tone: "warm" | "direct" | "curious" | "premium";
  objection: string;
  generatedScript: string;
}

export interface AppointmentRecord {
  id: string;
  leadName: string;
  stage: "invited" | "interested" | "booked" | "follow_up" | "customer" | "builder";
  scheduledAt: string;
  sponsorJoin: boolean;
  nextStep: string;
}

export interface MomentumScore {
  id: string;
  builderName: string;
  actionsCompleted: number;
  followUpsSent: number;
  demosBooked: number;
  streakDays: number;
  duplicationScore: number;
}

export interface ComplianceGuardrail {
  id: string;
  type: "income_claim" | "health_claim" | "testimonial" | "before_after" | "script_approval";
  title: string;
  guidance: string;
  severity: "low" | "medium" | "high";
}
