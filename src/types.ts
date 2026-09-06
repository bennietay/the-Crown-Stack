export type Role = "super_admin" | "workspace_admin" | "sales" | "operations" | "support" | "customer";

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  super_admin: "Super Admin",
  workspace_admin: "Workspace Admin",
  sales: "Sales User",
  operations: "Operations User",
  support: "Support User",
  customer: "Customer",
};

export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  role: Role;
  customerId?: string;
  activeWorkspaceId?: string;
  workspaceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: "agency" | "bennie_studio";
  createdAt: string;
}

export interface LeadQualificationAnswers {
  businessResult?: string;
  currentProblem?: string;
  hasExistingSite?: boolean | string;
  timeline?: string;
  budgetRange?: string;
  isDecisionMaker?: boolean | string;
  decisionMakerInvolved?: boolean | string;
  delayImpact?: string;
  ongoingManagementRequired?: boolean | string;
  requiredIntegrations?: string;
}

export interface LeadQualificationAudit {
  date: string;
  user: string;
  prevScore: number;
  newScore: number;
  reason: string;
}

export interface LeadClosingOffer {
  optionA: { name: string; otc: number; details: string };
  optionB: { name: string; mrc: number; details: string };
  selectedOption?: "A" | "B";
  mainObjection?: string;
  expectedDecisionDate?: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  /** Additive business routing; legacy leads without this field remain WAAS by default. */
  businessUnit?: "WAAS" | "AMWAY";
  companyName?: string;
  contactName: string;
  email: string;
  phone?: string;
  country?: string;
  status: "new" | "imported_review_required" | "researching" | "qualified" | "ready_for_outreach" | "contacted" | "replied" | "discovery" | "proposal" | "negotiation" | "won" | "lost" | "nurture" | "suppressed";
  tags?: string[];
  assignedTo?: string;
  score?: number;
  temperature?: "hot" | "warm" | "cold";
  qualificationClassification?: "hot" | "warm" | "cold" | "nurture" | "blocked";
  qualificationAnswers?: LeadQualificationAnswers;
  qualificationAudit?: LeadQualificationAudit[];
  messagesSentCount?: number;
  repliesCount?: number;
  consentStatus?: "opted_in" | "opted_out" | "pending";
  complianceStatus?: "compliant" | "review_required";
  estimatedOtc?: number;
  estimatedMrc?: number;
  buyingIntentIndicators?: string[];
  relationshipHistory?: Array<{ date: string; type: string; summary: string }>;
  closingOffer?: LeadClosingOffer;
  lastContactedAt?: string;
  nextActionDate?: string;
  source?: string;
  utm_source?: string;
  details?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  workspaceId: string;
  leadId?: string;
  opportunityId?: string;
  customerId?: string;
  title: string;
  channel: "email" | "whatsapp" | "call" | "manual";
  category?: "revenue" | "customer_engagement";
  reason?: string;
  recommendedAction?: string;
  revenueOpportunity?: number;
  contactName?: string;
  companyName?: string;
  dueDate: string;
  status: "pending" | "completed" | "snoozed";
  snoozedUntil?: string;
  owner: string;
  notes?: string;
  outcome?: string;
  completedAt?: string;
  createdAt: string;
}

/** Shared records for the Diamond Path (Amway) module.  These intentionally
 * keep the source CRM's vocabulary while remaining workspace-scoped records
 * in the Revenue OS store, so the module can evolve without a second auth or
 * database stack. */
export type DiamondProspectStatus = "Lead" | "Contacted" | "Shown Plan" | "Follow Up" | "Joined ABO" | "Joined PC" | "Closed" | "Not Interested" | "Archived";
export type DiamondProspectType = "Business Builder / ABO" | "Product Customer / PC" | "Professional / Career" | "Student / Young Adult" | "Family / Warm Network" | "Other";
export interface DiamondProspect {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string;
  email?: string;
  location?: string;
  status: DiamondProspectStatus;
  prospectType: DiamondProspectType;
  interest?: string;
  source?: string;
  preferredContactMethod?: string;
  notes?: string;
  tags?: string[];
  lastContactDate?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiamondCustomer {
  id: string;
  workspaceId: string;
  name: string;
  phone?: string;
  email?: string;
  preferredContactMethod?: string;
  products?: string[];
  lastPurchaseDate?: string;
  nextReorderDate?: string;
  lastPurchaseAmount?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiamondFollowUp {
  id: string;
  workspaceId: string;
  prospectId?: string;
  customerId?: string;
  contactName: string;
  channel: "WhatsApp" | "Phone Call" | "Email" | "Meeting" | "Follow Up";
  stage: "Prospecting" | "Presentation" | "Customer Care & Reorder";
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface DiamondProduct {
  id: string; workspaceId: string; sku: string; name: string; brand?: string; category: string;
  memberPrice: number; retailPrice: number; pv: number; bv?: number; status: "Active" | "Inactive" | "Archived";
  defaultReorderCycleDays?: number; officialUrl?: string; createdAt?: string; updatedAt?: string;
}

export interface DiamondPurchase {
  id: string; workspaceId: string; customerId: string; customerName?: string; productId: string; productName: string;
  quantity: number; purchaseDate: string; unitPrice: number; totalPrice: number; pv: number; bv?: number;
  reorderCycleDays?: number; expectedReorderDate?: string; status: "Completed" | "Pending Delivery" | "Active" | "Reordered" | "Cancelled";
  notes?: string; createdAt?: string;
}

export interface DiamondScript {
  id: string; workspaceId: string; title: string; category: "Approach" | "Follow Up" | "Objection Handling" | "Closing" | "Product Sharing" | "Reorder Reminder";
  content: string; status: "Approved" | "Needs Review" | "Personal Draft"; tags?: string[]; createdAt?: string;
}

export type BusinessUnit = "WAAS" | "AMWAY" | "AFFILIATE" | "ETSY";
export interface RevenueEvent {
  id: string;
  workspaceId: string;
  businessUnit: BusinessUnit;
  sourceType: "sale" | "subscription" | "commission" | "payout" | "refund";
  externalId?: string;
  customerName?: string;
  currency: string;
  grossRevenue: number;
  costs: number;
  fees: number;
  status: "expected" | "booked" | "collected" | "refunded" | "cancelled";
  occurredAt: string;
  collectedAt?: string;
  exchangeRateToMyr?: number;
  exchangeRateDate?: string;
  exchangeRateSource?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
}

export interface RevenueGoal {
  id: string;
  workspaceId: string;
  name: string;
  targetAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface MoneyTask {
  id: string;
  workspaceId: string;
  businessUnit: BusinessUnit;
  title: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedRevenueImpact?: number;
  probability?: number;
  urgency?: string;
  dueDate?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  status: "open" | "in_progress" | "completed" | "dismissed";
  recommendedAction: string;
  source: "user" | "system" | "integration" | "ai";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  category: "critical" | "warning" | "opportunity" | "information";
  source: BusinessUnit | "SYSTEM";
  title: string;
  message: string;
  status: "unread" | "read" | "resolved" | "snoozed";
  snoozedUntil?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationDefinition {
  id: string;
  workspaceId: string;
  name: string;
  businessUnit: BusinessUnit | "SYSTEM";
  trigger: string;
  conditions: string;
  action: string;
  approvalMode: "auto" | "approval_required" | "notify";
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastResult?: string;
  errorStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  actor: "USER" | "AI" | "SYSTEM" | "INTEGRATION";
  businessUnit: BusinessUnit | "SYSTEM";
  action: string;
  entityType: string;
  entityId?: string;
  result: "success" | "failure" | "pending";
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// WAAS managed WordPress operating model. These records are additive to the
// existing CRM so future storefront and provider integrations can use stable
// contracts without changing Amway data.
export type WaasProductType = "launch" | "business";
export type WaasOrderStatus = "pending_payment" | "paid" | "awaiting_onboarding" | "onboarding_in_progress" | "ready_for_deployment" | "deploying" | "review_required" | "customer_review" | "approved" | "live" | "cancelled" | "failed";
export type WaasWebsiteStatus = "onboarding" | "queued" | "deploying" | "review_required" | "customer_review" | "live" | "suspended" | "failed";
export type WaasDeploymentStatus = "queued" | "running" | "waiting" | "failed" | "review_required" | "complete" | "cancelled";
export type WaasTicketStatus = "new" | "open" | "in_progress" | "waiting_for_customer" | "resolved" | "closed";
export interface WaasPlan { id: string; workspaceId: string; name: string; productType: WaasProductType; setupFee: number; recurringFee: number; billingInterval: "month" | "year" | "one_time"; pagesIncluded: number; updateAllowance: number; supportSlaHours: number; features: string[]; currency: string; active: boolean; createdAt: string; updatedAt: string; }
export interface WaasTemplate { id: string; workspaceId: string; name: string; productType: WaasProductType; niche: string; style: "modern" | "bold" | "premium"; version: string; previewImage?: string; demoUrl?: string; status: "draft" | "active" | "retired"; themePackageId: string; configuration: Record<string, unknown>; supportedSections: string[]; aiPromptProfile?: string; deploymentMetadata?: Record<string, unknown>; changelog?: string; createdAt: string; updatedAt: string; }
export interface WaasOrder { id: string; workspaceId: string; customerId?: string; customerName: string; customerEmail?: string; productType: WaasProductType; planId?: string; subscriptionId?: string; websiteId?: string; templateId?: string; niche?: string; style?: string; status: WaasOrderStatus; paymentStatus: "pending" | "paid" | "failed" | "refunded"; onboardingId?: string; deploymentId?: string; createdAt: string; updatedAt: string; }
export interface WaasOnboarding { id: string; workspaceId: string; orderId: string; completionPercentage: number; business: Record<string, unknown>; branding: Record<string, unknown>; services: Record<string, unknown>; website: Record<string, unknown>; assets: Array<{ name: string; url: string; type: string }>; state: "not_started" | "in_progress" | "complete"; updatedAt: string; }
export interface WaasWebsite { id: string; workspaceId: string; customerId?: string; orderId?: string; domain?: string; temporaryUrl?: string; liveUrl?: string; wordpressInstallationId?: string; hostinger?: Record<string, string>; productType: WaasProductType; niche?: string; style?: string; theme?: string; templateId?: string; version?: string; status: WaasWebsiteStatus; sslStatus?: string; deploymentStatus?: string; wordpressVersion?: string; pluginVersions?: Record<string, string>; lastBackup?: string; lastHealthCheck?: string; publishedAt?: string; subscriptionId?: string; supportAllowance?: number; updateAllowanceUsed?: number; createdAt: string; updatedAt: string; }
export interface WaasDeploymentStep { id: string; deploymentId: string; name: string; status: "queued" | "running" | "complete" | "failed" | "skipped"; startedAt?: string; completedAt?: string; logs?: string[]; errorMessage?: string; retryCount: number; }
export interface WaasDeployment { id: string; workspaceId: string; orderId?: string; websiteId?: string; status: WaasDeploymentStatus; currentStep?: string; provider: "hostinger" | "mock"; approvedAt?: string; startedAt?: string; completedAt?: string; errorMessage?: string; createdAt: string; updatedAt: string; }
export interface WaasSupportTicket { id: string; workspaceId: string; ticketNumber: string; customerId?: string; websiteId?: string; orderId?: string; subject: string; description: string; category: "content_update" | "technical_issue" | "website_down" | "domain_dns" | "form_lead" | "email" | "billing" | "seo" | "feature_request" | "general"; priority: "critical" | "high" | "normal" | "request"; status: WaasTicketStatus; assignedTo?: string; source: "admin" | "customer_portal" | "connector"; slaDueAt?: string; updateClassification?: "included" | "chargeable" | "not_an_update" | "requires_upgrade"; createdAt: string; updatedAt: string; }
export interface WaasActivity { id: string; workspaceId: string; actor: string; action: string; entityType: string; entityId?: string; metadata?: Record<string, unknown>; createdAt: string; }

export interface AffiliateRecord {
  id: string;
  workspaceId: string;
  kind: "program" | "link" | "commission" | "lead_magnet";
  name: string;
  status: "draft" | "active" | "paused";
  value?: number;
  url?: string;
  createdAt: string;
}

export interface EtsyRecord {
  id: string;
  workspaceId: string;
  kind: "listing" | "order";
  name: string;
  status: "draft" | "active" | "pending" | "fulfilled" | "cancelled";
  revenue?: number;
  costs?: number;
  externalId?: string;
  createdAt: string;
}

export type EtsyProductStatus = "IDEA" | "RESEARCH" | "DESIGN" | "SEO" | "CREATIVE" | "REVIEW" | "APPROVED" | "DRAFT" | "PUBLISHED" | "OPTIMIZING" | "PAUSED" | "ARCHIVED";
export interface EtsyProduct {
  id: string; workspaceId: string; internalName: string; etsyListingId?: string; printifyProductId?: string;
  status: EtsyProductStatus; productType: string; niche: string; audience: string; occasion?: string; designConcept: string;
  personalization?: string; currency: string; price: number; productionCost?: number; etsyFees?: number; discount?: number;
  shippingSubsidy?: number; adCost?: number; refundAllocation?: number; seoScore?: number; opportunityScore?: number;
  seo?: { title?: string; tags?: string[]; description?: string; altText?: string; keywords?: string[]; faq?: string[]; shopSection?: string; pinterestKeywords?: string[] };
  approvedAt?: string; publishedAt?: string; createdAt: string; updatedAt: string;
}

export interface PrintifyRecord {
  id: string;
  workspaceId: string;
  kind: "product" | "order";
  name: string;
  status: string;
  externalId: string;
  shopId: string;
  productionCost?: number;
  shippingCost?: number;
  trackingUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface Opportunity {
  id: string;
  workspaceId: string;
  leadId?: string;
  customerId?: string;
  title?: string;
  name?: string;
  opportunityOwner?: string;
  stage: "Qualified" | "Discovery" | "Solution proposed" | "Proposal sent" | "Negotiation" | "Verbal agreement" | "Won" | "Lost" | string;
  expectedValue?: number;
  expectedOtcValue?: number;
  expectedMrcValue?: number;
  estimatedValue?: number;
  currency: string;
  probability?: number;
  expectedCloseDate?: string;
  productInterest?: string[];
  lostReason?: string;
  problemSummary?: string;
  desiredOutcome?: string;
  recommendedPackage?: string;
  alternativePackage?: string;
  mainObjection?: string;
  decisionCriteria?: string;
  decisionMaker?: string;
  expectedDecisionDate?: string;
  proposalStatus?: string;
  paymentStatus?: string;
  nextClosingAction?: string;
  source?: string;
  lastActivity?: string;
  nextAction?: string;
  stageHistory?: Array<{ fromStage: string; toStage: string; changedAt: string; changedBy: string; reason?: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerProjectDetails {
  stage: "onboarding" | "requirements_gathering" | "design" | "build" | "staging_review" | "revisions" | "launch_prep" | "live";
  completionPercentage: number;
  outstandingCustomerActions: string[];
  pendingApprovals: string[];
  latestUpdate: string;
  nextMilestone: string;
  totalRevisionRounds: number;
  revisionRoundsUsed: number;
}

export interface CustomerHealthDetails {
  status: "healthy" | "attention_needed" | "at_risk" | "critical";
  score: number;
  paymentStatus: "current" | "late" | "failed";
  ticketSentiment: "positive" | "neutral" | "frustrated";
  projectDelayDays: number;
  missedActionsCount: number;
  unresolvedTicketsCount: number;
  renewalDate?: string;
  lastCommunicatedAt?: string;
}

export interface WaasConversionDetails {
  status: "not_assessed" | "recommended" | "offered" | "interested" | "accepted" | "declined" | "follow_up_later" | "active_subscription" | "cancelled";
  recommendedPlan?: string;
  proposedMrc?: number;
  currentMrc?: number;
  includedAllowance?: string;
  extraWorkRate?: number;
  nextBillingDate?: string;
  renewalRisk?: string;
}

export interface CustomerRevisionRequest {
  id: string;
  page: string;
  section: string;
  currentContent: string;
  requestedChange: string;
  reason: string;
  attachmentUrl?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "completed" | "rejected";
  createdAt: string;
}

export interface Customer {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  status?: "onboarding" | "active" | "inactive";
  subscriptionId?: string;
  health?: CustomerHealthDetails;
  waas?: WaasConversionDetails;
  project?: CustomerProjectDetails;
  revisions?: CustomerRevisionRequest[];
  supportAllowance?: { includedTickets: number; ticketsUsed: number; nextBillingDate: string };
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  workspaceId: string;
  customerId: string;
  subject: string;
  status: "new" | "open" | "in_progress" | "waiting_for_customer" | "waiting_for_third_party" | "resolved" | "closed";
  priority: "critical" | "high" | "normal" | "low";
  classification?: "bug" | "content_change" | "feature_request" | "technical_support" | "security_update" | "domain_dns" | "billing" | string;
  assignedTo?: string;
  slaDeadline?: string;
  estimatedHours?: number;
  estimatedWorkHours?: number;
  ticketType?: "included_support" | "billable_change" | "defect" | "hosting_issue" | "training" | "third_party";
  isBillable?: boolean;
  billableProposalId?: string;
  waitingForCustomer?: boolean;
  codexEligible?: boolean;
  hostingerActionRequired?: boolean;
  isEmergency?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  workspaceId: string;
  business: {
    name: string;
    currency: string;
    locale: string;
    timezone: string;
    whatsappNumber?: string;
    leadSlaHours: number;
    monthlyTarget: number;
    /** Daily execution targets used by the Revenue Command Center. */
    dailyOutreachTarget?: number;
    waasMonthlyTarget?: number;
    amwayMonthlyTarget?: number;
  };
  sales: {
    taxRate: number;
    proposalValidityDays: number;
    hotThreshold: number;
    warmThreshold: number;
    defaultOwner?: string;
  };
  leadCapture: {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    offerTitle?: string;
    benefitBullets?: string[];
    responsePromise?: string;
    trustNote?: string;
    ctaLabel?: string;
    successMessage: string;
    serviceOptions: string[];
    budgetRanges: string[];
    timingOptions: string[];
    whatsappUrl?: string;
    bookingUrl?: string;
    privacyUrl?: string;
    termsUrl?: string;
    requireCompany?: boolean;
    requirePhone?: boolean;
    requireCountry?: boolean;
  };
  cadence: Array<{ day: number; channel: "email" | "whatsapp" | "call" | "manual"; title: string; subject?: string; body?: string }>;
  integrations?: {
    supabaseConfigured: boolean;
    whatsappConfigured: boolean;
    whatsappApiConfigured?: boolean;
    paymentsConfigured?: boolean;
    emailConfigured?: boolean;
    affiliateApiConfigured?: boolean;
    etsyConfigured?: boolean;
    printifyConfigured?: boolean;
    aiConfigured?: boolean;
    lastVerified?: string;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  type: "otc" | "mrc";
  price: number;
  currency: string;
}

export interface ProposalScope {
  pages: string[];
  features: string[];
  integrations: string[];
  deliverables: string[];
  exclusions: string[];
  customerResponsibilities: string[];
}

export interface ProposalPricing {
  otcCharges: number;
  mrcCharges: number;
  taxes: number;
  deposit: number;
  paymentSchedule: string;
}

export interface ProposalMilestone {
  name: string;
  estimatedDays: number;
  deliverable: string;
}

export interface ProposalThirdPartyCost {
  item: string;
  cost: number;
  recurring: boolean;
}

export interface ProposalViewDeviceLog {
  viewedAt: string;
  userAgent?: string;
  ipHash?: string;
}

export interface Proposal {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version?: number;
  parentProposalId?: string;
  title?: string;
  customerProblem?: string;
  objectives?: string[];
  recommendedSolution?: string;
  scope?: ProposalScope;
  milestones?: ProposalMilestone[];
  estimatedDeliveryConditions?: string;
  revisionAllowance?: number;
  hostingArrangement?: string;
  thirdPartyCosts?: ProposalThirdPartyCost[];
  pricing?: ProposalPricing;
  terms?: string;
  expiryDate?: string;
  expiresAt?: string;
  token?: string;
  tokenHash?: string;
  status: "Draft" | "Internal review" | "Approved" | "Delivery pending" | "Delivered" | "Viewed" | "Accepted" | "Rejected" | "Expired" | "Superseded" | "Payment pending" | "Paid" | string;
  items?: Array<{ productId: string; quantity: number; type?: "otc" | "mrc"; price?: number }>;
  totalOTC: number;
  totalMRC: number;
  taxRate?: number;
  currency?: string;
  viewsCount?: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewDeviceLogs?: ProposalViewDeviceLog[];
  decisionDate?: string;
  outcomeReason?: string;
  createdAt: string;
  updatedAt?: string;
}
