import type {
  AccessInvite,
  AccessUser,
  AdCampaign,
  AutomationSequence,
  AppointmentRecord,
  ComplianceGuardrail,
  ContactMemoryPrompt,
  DupliosUserProfile,
  DuplicationPlaybookPackage,
  FastStartPlan,
  FollowUpStep,
  LeadRecord,
  LegalDocument,
  LocationPricingRule,
  NotificationRule,
  OutreachTask,
  PowerHourAction,
  SeoSettings,
  SalesPageContent,
  ScriptAsset,
  ScriptPersonalizationOption,
  SponsorCheckIn,
  SystemSetting,
  TeamMemberNode,
  TenantRecord,
  TrackingSettings,
  TrafficRevenueMetric,
  MomentumScore
} from "../types/tenant";

export const demoProfile: DupliosUserProfile = {
  uid: "local-owner",
  displayName: "Workspace Owner",
  email: "",
  tenantId: "local-tenant",
  tier: "empire",
  role: "admin"
};

export const demoSuperadminProfile: DupliosUserProfile = {
  uid: "local-superadmin",
  displayName: "Platform Admin",
  email: "",
  tenantId: "platform",
  tier: "empire",
  role: "superadmin",
  isSuperadmin: true
};

export const demoDownlineProfile: DupliosUserProfile = {
  uid: "local-new-joiner",
  displayName: "New Joiner",
  email: "",
  tenantId: "local-tenant",
  tier: "ignite",
  role: "new_joiner",
  leaderUid: "local-owner"
};

export const demoScripts: ScriptAsset[] = [];
export const demoTenants: TenantRecord[] = [];

export const demoSalesPage: SalesPageContent = {
  tenantId: "platform",
  headline: "Stop losing prospects because you forgot to follow up.",
  subheadline:
    "Duplios helps network marketers manage leads, send timely follow-ups, run events, recover no-shows, and duplicate the same system across the team.",
  primaryCta: "Start 14-Day Free Trial",
  proofPoints: [
    "Know who to follow up with today",
    "Recover forgotten prospects",
    "Track events, Zooms, and no-shows",
    "Duplicate scripts and workflows across your team"
  ],
  offerStack: [
    "Prospect and customer CRM with trust notes, relationship score, and next follow-up timing",
    "WhatsApp / DM scripts for first contact, event invites, no-show recovery, objections, and reorder reminders",
    "Event, webinar, Zoom, and presentation tracker with recovery lists and conversion reports",
    "Duplication center for onboarding, shared scripts, team actions, leader notes, and playbooks",
    "Stripe-ready pricing, Supabase-ready schema, roles, plan limits, audit logs, legal center, and admin controls"
  ],
  features: [
    {
      title: "Prospect & Customer CRM",
      body: "Track leads, customers, product interest, purchase reminders, trust notes, tags, temperature, and follow-up history."
    },
    {
      title: "Follow-Up Automation",
      body: "Build reminders and follow-up sequences that keep outreach timely without sounding robotic."
    },
    {
      title: "WhatsApp & DM Scripts",
      body: "Use ready-made scripts for outreach, invites, no-show recovery, objection handling, customer reorder, sponsor handoff, and onboarding."
    },
    {
      title: "Event & Webinar Tracker",
      body: "Track invites, registrations, reminders, attendees, no-shows, follow-up actions, conversions, and event-specific scripts."
    },
    {
      title: "Team Duplication System",
      body: "Give your team the same scripts, workflows, onboarding plan, action checklist, and leader support path."
    },
    {
      title: "Reports & Activity Insights",
      body: "See follow-up activity, event conversion, team momentum, customer reminders, and recovery opportunities."
    }
  ],
  testimonials: [],
  pricing: [
    {
      tier: "ignite",
      name: "Basic",
      price: "$29",
      description: "For individual builders who need CRM, follow-up, and scripts.",
      features: ["Prospect CRM", "Follow-up reminders", "Script library", "Customer profiles", "Purchase reminders"]
    },
    {
      tier: "ascent",
      name: "Growth",
      price: "$59",
      description: "For active builders who invite, follow up, and run events weekly.",
      highlighted: true,
      features: ["Everything in Basic", "Lead capture", "Social outreach scripts", "AI scripts", "Event / appointment tracker", "Follow-up sequences", "No-show recovery"]
    },
    {
      tier: "empire",
      name: "Pro",
      price: "$99",
      description: "For team leaders who want to duplicate the system across a team.",
      features: ["Everything in Growth", "Team dashboard", "Team scripts", "Duplication center", "Leader analytics", "Role permissions", "Admin controls"]
    }
  ],
  faqs: [
    {
      question: "Does Duplios guarantee sales, income, rank, or customer results?",
      answer: "No. Duplios is an operating system for organization, follow-up, training, and team workflows. Results depend on the user's market, effort, product, compliance, and business model."
    },
    {
      question: "Is this tied to one network marketing company?",
      answer: "No. Duplios is company-neutral and designed for relationship-based builders, direct sellers, product educators, and teams."
    },
    {
      question: "Can I use this with WhatsApp?",
      answer: "Yes. Duplios helps you personalize, copy, and open WhatsApp-friendly scripts while leaving the actual conversation in your control."
    },
    {
      question: "Can my team use the same scripts and workflow?",
      answer: "Yes. Pro workspaces can package scripts, onboarding actions, playbooks, and duplication workflows for team execution."
    },
    {
      question: "Can I track events, webinars, and no-shows?",
      answer: "Yes. The event engine tracks invites, registrations, reminders, attendance, no-shows, follow-up, and conversion."
    },
    {
      question: "Can I use Duplios without being technical?",
      answer: "Yes. The app is designed as a daily operating system: add the relationship, choose the next action, copy the message, and follow up."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. Subscription terms are controlled through Stripe billing and the policies shown at checkout."
    },
    {
      question: "Can payment be connected after account creation?",
      answer: "Yes. Stripe billing is not required before account creation. Billing can be connected when the workspace is ready to charge."
    },
    {
      question: "Can this be deployed on Vercel with Supabase?",
      answer: "Yes. The project includes Vercel-ready environment configuration, Supabase schema, server routes, and deployment notes."
    }
  ],
  updatedAt: new Date().toISOString()
};

export const demoSettings: SystemSetting[] = [
  { key: "billing.base_currency", label: "Base billing currency", value: "USD", scope: "platform" },
  { key: "billing.trial_days", label: "Trial length", value: "14", scope: "platform" },
  { key: "plans.catalog", label: "Plan catalog", value: "Basic $29, Growth $59, Pro $99", scope: "platform" }
];
export const demoAccessUsers: AccessUser[] = [];
export const demoInvites: AccessInvite[] = [];

export const demoLegalDocuments: LegalDocument[] = [
  {
    id: "terms-of-service",
    title: "Terms of Service",
    category: "terms",
    body:
      "Duplios provides software tools for CRM organization, customer follow-up, team duplication, automation planning, content management, analytics, and sales-page operations. Users remain responsible for their own messages, claims, compliance, customers, payments, taxes, files, and business results. Duplios does not guarantee sales, income, customer acquisition, rank advancement, health outcomes, social media growth, or business success.",
    status: "published",
    required: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    category: "privacy",
    body:
      "Duplios may process account details, login data, tenant records, CRM entries, customer notes, purchase reminders, billing identifiers, support messages, analytics data, cookies, and device information to operate the service. Users are responsible for collecting prospect and customer data lawfully, obtaining consent where required, honoring opt-out requests, and avoiding unnecessary sensitive data.",
    status: "published",
    required: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "refund-policy",
    title: "Refund and Cancellation Policy",
    category: "refund",
    body:
      "Subscriptions renew according to the billing cycle shown at checkout unless cancelled before renewal. Cancellation stops future billing but does not automatically refund past charges. Refunds are provided where required by law or where approved by the operator.",
    status: "published",
    required: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    category: "acceptable_use",
    body:
      "Users may not use Duplios to send spam, make deceptive income or health claims, impersonate others, scrape data unlawfully, upload illegal content, harass prospects, bypass platform limits, violate intellectual property rights, or automate outreach in a way that breaches social, email, messaging, or telecom rules.",
    status: "published",
    required: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: "ai-content-responsibility",
    title: "AI Content Responsibility",
    category: "compliance",
    body:
      "AI-generated scripts, summaries, follow-up messages, and coaching suggestions are drafts only. Users must review, edit, verify, and approve AI output before use. Do not use AI output to make unverified income, health, product, legal, financial, or employment claims.",
    status: "published",
    required: true,
    updatedAt: new Date().toISOString()
  }
];

export const demoTrafficRevenue: TrafficRevenueMetric[] = [];
export const demoLocationPricing: LocationPricingRule[] = [
  { id: "us-usd", countryCode: "US", currency: "USD", ignitePrice: 29, ascentPrice: 59, empirePrice: 99, taxMode: "stripe_tax", enabled: true },
  { id: "my-myr", countryCode: "MY", currency: "MYR", ignitePrice: 139, ascentPrice: 279, empirePrice: 469, taxMode: "stripe_tax", enabled: true },
  { id: "sg-sgd", countryCode: "SG", currency: "SGD", ignitePrice: 39, ascentPrice: 79, empirePrice: 135, taxMode: "stripe_tax", enabled: true },
  { id: "ca-cad", countryCode: "CA", currency: "CAD", ignitePrice: 40, ascentPrice: 81, empirePrice: 137, taxMode: "stripe_tax", enabled: true },
  { id: "au-aud", countryCode: "AU", currency: "AUD", ignitePrice: 44, ascentPrice: 90, empirePrice: 150, taxMode: "stripe_tax", enabled: true },
  { id: "gb-gbp", countryCode: "GB", currency: "GBP", ignitePrice: 23, ascentPrice: 47, empirePrice: 78, taxMode: "stripe_tax", enabled: true },
  { id: "eu-eur", countryCode: "EU", currency: "EUR", ignitePrice: 27, ascentPrice: 54, empirePrice: 91, taxMode: "stripe_tax", enabled: true },
  { id: "jp-jpy", countryCode: "JP", currency: "JPY", ignitePrice: 4400, ascentPrice: 9000, empirePrice: 15000, taxMode: "stripe_tax", enabled: true },
  { id: "ph-php", countryCode: "PH", currency: "PHP", ignitePrice: 1650, ascentPrice: 3360, empirePrice: 5640, taxMode: "stripe_tax", enabled: true },
  { id: "ae-aed", countryCode: "AE", currency: "AED", ignitePrice: 106, ascentPrice: 217, empirePrice: 363, taxMode: "stripe_tax", enabled: true }
];
export const demoNotificationRules: NotificationRule[] = [
  { id: "new-trial-owner", trigger: "new_signup", channel: "email", audience: "tenant_admin", subject: "Welcome to Duplios", enabled: true },
  { id: "trial-ending", trigger: "trial_ending", channel: "email", audience: "tenant_admin", subject: "Your Duplios trial is ending soon", enabled: true },
  { id: "daily-task-reminder", trigger: "daily_task_reminder", channel: "push", audience: "member", subject: "Your follow-up actions are ready", enabled: true }
];

export const demoTrackingSettings: TrackingSettings = {
  googleAnalyticsId: "",
  metaPixelId: "",
  tikTokPixelId: "",
  linkedInPartnerId: "",
  consentMode: "disabled",
  enabled: false
};

export const demoSeoSettings: SeoSettings = {
  title: "Duplios | Duplication OS for Relationship-Led Teams",
  description:
    "Duplios helps teams manage leads, customers, purchases, follow-up reminders, scripts, automation, team metrics, and duplication workflows.",
  canonicalUrl: "",
  ogImageUrl: "",
  keywords: ["relationship CRM", "customer follow-up", "team duplication", "sales automation"],
  contentClusters: [],
  answerEnginePrompts: [],
  schemaTypes: ["SoftwareApplication", "Organization"],
  entitySignals: ["CRM", "Automation", "Team Operations"],
  aiOverviewTargets: [],
  competitorKeywords: [],
  localMarkets: [],
  llmsTxtEnabled: true,
  faqCoverage: true,
  answerEngineSummary:
    "Duplios is a relationship-first CRM and duplication operating system for teams that need lead management, customer purchase reminders, scripts, automation, and leadership workflows.",
  leadMagnets: [],
  sitemapEnabled: true,
  robotsMode: "index"
};

export const demoAdCampaigns: AdCampaign[] = [];
export const demoTeamNodes: TeamMemberNode[] = [];
export const demoLeads: LeadRecord[] = [];
export const demoFollowUpSteps: FollowUpStep[] = [];
export const demoAutomationSequences: AutomationSequence[] = [];
export const demoOutreachTasks: OutreachTask[] = [];
export const demoFastStartPlan: FastStartPlan[] = [];
export const demoContactPrompts: ContactMemoryPrompt[] = [];
export const demoPowerHourActions: PowerHourAction[] = [];
export const demoSponsorCheckIns: SponsorCheckIn[] = [];
export const demoPlaybookPackages: DuplicationPlaybookPackage[] = [];
export const demoScriptPersonalizations: ScriptPersonalizationOption[] = [];
export const demoAppointments: AppointmentRecord[] = [];
export const demoMomentumScores: MomentumScore[] = [];
export const demoComplianceGuardrails: ComplianceGuardrail[] = [];
