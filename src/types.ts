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
  cadence: Array<{ day: number; channel: "email" | "whatsapp" | "call" | "manual"; title: string }>;
  integrations?: {
    firebaseConfigured: boolean;
    whatsappConfigured: boolean;
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
