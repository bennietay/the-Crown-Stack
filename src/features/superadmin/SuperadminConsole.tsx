import {
  BarChart3,
  Bell,
  CalendarClock,
  CreditCard,
  FileText,
  Globe2,
  Megaphone,
  Mail,
  MousePointerClick,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  Users
} from "lucide-react";
import { useState } from "react";
import { BentoTile } from "../../components/BentoTile";
import { capturePublicLead } from "../../lib/api";
import {
  applyConvertedPrices,
  baseUsdPrices,
  pricesFromUsdRate,
  usdConversionRates
} from "../../lib/locationPricing";
import type {
  AccessInvite,
  AccessUser,
  AdCampaign,
  LegalDocument,
  LocationPricingRule,
  NotificationRule,
  SeoSettings,
  SalesPageContent,
  SystemSetting,
  TenantRecord,
  TrackingSettings,
  TrafficRevenueMetric
} from "../../types/tenant";
import type { FeatureKey, SubscriptionTier } from "../../types/subscription";

interface SuperadminConsoleProps {
  tenants: TenantRecord[];
  settings: SystemSetting[];
  accessUsers: AccessUser[];
  invites: AccessInvite[];
  salesPage: SalesPageContent;
  legalDocuments: LegalDocument[];
  trafficRevenue: TrafficRevenueMetric[];
  locationPricing: LocationPricingRule[];
  notificationRules: NotificationRule[];
  trackingSettings: TrackingSettings;
  seoSettings: SeoSettings;
  adCampaigns: AdCampaign[];
}

const tabs = [
  "overview",
  "tenants",
  "analytics",
  "growth",
  "tracking",
  "seo",
  "ads",
  "cms",
  "legal",
  "access",
  "role-preview",
  "plans",
  "pricing",
  "notifications",
  "settings"
] as const;

type SuperadminTab = (typeof tabs)[number];

const tabLabels: Record<SuperadminTab, string> = {
  overview: "Overview",
  tenants: "Tenants & Trials",
  analytics: "Traffic & Revenue",
  growth: "Lead & Sales Engine",
  tracking: "Tracking",
  seo: "SEO",
  ads: "Traffic & Ads",
  cms: "CMS",
  legal: "Legal Review",
  access: "Access",
  "role-preview": "Role Preview",
  plans: "Plans & Features",
  pricing: "Location Pricing",
  notifications: "Notifications",
  settings: "Settings"
};

const tabGroups: Array<{ label: string; items: SuperadminTab[] }> = [
  { label: "Command", items: ["overview", "tenants", "analytics"] },
  { label: "Growth", items: ["growth", "seo", "ads", "tracking"] },
  { label: "Content", items: ["cms", "legal"] },
  { label: "Platform", items: ["access", "plans", "pricing", "notifications", "settings"] },
  { label: "Testing", items: ["role-preview"] }
];

export function SuperadminConsole({
  tenants,
  settings,
  accessUsers,
  invites,
  salesPage,
  legalDocuments,
  trafficRevenue,
  locationPricing,
  notificationRules,
  trackingSettings,
  seoSettings,
  adCampaigns
}: SuperadminConsoleProps) {
  const [activeTab, setActiveTab] = useState<SuperadminTab>("overview");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const activeTenants = tenants.filter((tenant) => tenant.status === "active").length;
  const trialingTenants = tenants.filter((tenant) => tenant.status === "trialing").length;
  const totalMembers = tenants.reduce((sum, tenant) => sum + tenant.members, 0);
  const monthlyRevenue = tenants.reduce((sum, tenant) => sum + (tenant.monthlyRevenue ?? 0), 0);
  const totalVisitors = trafficRevenue.reduce((sum, item) => sum + item.visitors, 0);
  const totalRevenue = trafficRevenue.reduce((sum, item) => sum + item.revenue, 0);
  const conversionRate = Math.round(
    (trafficRevenue.reduce((sum, item) => sum + item.paidConversions, 0) /
      Math.max(trafficRevenue.reduce((sum, item) => sum + item.signups, 0), 1)) *
      100
  );

  return (
    <section className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crown-gold sm:text-sm sm:tracking-[0.18em]">
          Platform Superadmin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Enterprise command center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-crown-mist">
          Manage tenants, trials, pricing, CMS, access, revenue, notifications, and platform
          configuration from one operating surface.
        </p>
      </header>

      <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-crown-mist">
              Current module
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{tabLabels[activeTab]}</p>
          </div>
          <button
            type="button"
            onClick={() => setNavigationOpen((open) => !open)}
            className="h-10 rounded-lg border border-crown-gold/35 px-4 text-sm font-semibold text-crown-gold transition hover:bg-crown-gold/10"
          >
            {navigationOpen ? "Hide Navigation" : "Open Navigation"}
          </button>
        </div>

        {navigationOpen ? (
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 xl:grid-cols-5">
            {tabGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-crown-mist">
                  {group.label}
                </p>
                <div className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
                  {group.items.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setNavigationOpen(false);
                      }}
                      className={`h-10 shrink-0 rounded-lg px-3 text-left text-xs font-semibold transition sm:text-sm xl:w-full ${
                        activeTab === tab
                          ? "bg-crown-gold text-crown-navy shadow-glow"
                          : "border border-transparent text-crown-mist hover:border-crown-gold/35 hover:bg-crown-gold/10 hover:text-crown-gold"
                      }`}
                    >
                      {tabLabels[tab]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <Grid>
          <BentoTile title="Active Tenants" eyebrow="Network" className="md:col-span-2">
            <Metric icon={<Users />} label="Paying tenants" value={String(activeTenants)} />
          </BentoTile>
          <BentoTile title="Trial Pipeline" eyebrow="14 Days" className="md:col-span-2">
            <Metric icon={<CalendarClock />} label="Trialing tenants" value={String(trialingTenants)} />
          </BentoTile>
          <BentoTile title="MRR" eyebrow="Revenue" className="md:col-span-2">
            <Metric icon={<CreditCard />} label="Monthly revenue" value={`$${monthlyRevenue}`} />
          </BentoTile>
          <BentoTile title="Platform Pulse" eyebrow="Growth" className="md:col-span-4 lg:col-span-6">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric icon={<MousePointerClick />} label="Visitors" value={String(totalVisitors)} compact />
              <Metric icon={<BarChart3 />} label="Conversion" value={`${conversionRate}%`} compact />
              <Metric icon={<CreditCard />} label="7-day revenue" value={`$${totalRevenue}`} compact />
              <Metric icon={<ShieldCheck />} label="Members" value={String(totalMembers)} compact />
            </div>
          </BentoTile>
        </Grid>
      ) : null}

      {activeTab === "tenants" ? <TenantTrialPanel tenants={tenants} /> : null}
      {activeTab === "analytics" ? <AnalyticsPanel metrics={trafficRevenue} /> : null}
      {activeTab === "growth" ? <LeadSalesEngine seo={seoSettings} campaigns={adCampaigns} metrics={trafficRevenue} /> : null}
      {activeTab === "tracking" ? <TrackingPanel settings={trackingSettings} /> : null}
      {activeTab === "seo" ? <SeoPanel settings={seoSettings} /> : null}
      {activeTab === "ads" ? <AdsPanel campaigns={adCampaigns} /> : null}
      {activeTab === "cms" ? <CMSPanel salesPage={salesPage} /> : null}
      {activeTab === "legal" ? <LegalReviewPanel documents={legalDocuments} /> : null}
      {activeTab === "access" ? <AccessPanel users={accessUsers} invites={invites} /> : null}
      {activeTab === "role-preview" ? <RolePreviewPanel users={accessUsers} /> : null}
      {activeTab === "plans" ? <PlanFeaturePanel salesPage={salesPage} /> : null}
      {activeTab === "pricing" ? <LocationPricingPanel rules={locationPricing} /> : null}
      {activeTab === "notifications" ? <NotificationsPanel rules={notificationRules} /> : null}
      {activeTab === "settings" ? <SettingsPanel settings={settings} /> : null}
    </section>
  );
}

function TrackingPanel({ settings }: { settings: TrackingSettings }) {
  return (
    <Grid>
      <BentoTile title="Tracking Pixels" eyebrow="Analytics + Retargeting" className="md:col-span-4 lg:col-span-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Google Analytics 4 Measurement ID" value={settings.googleAnalyticsId} placeholder="G-XXXXXXXXXX" />
            <Field label="Meta Pixel ID" value={settings.metaPixelId} placeholder="1234567890" />
            <Field label="TikTok Pixel ID" value={settings.tikTokPixelId} placeholder="CXXXXXXXXXXXX" />
            <Field label="LinkedIn Partner ID" value={settings.linkedInPartnerId} placeholder="123456" />
          </div>
          <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-5">
            <Target className="mb-4 text-crown-gold" />
            <p className="text-lg font-semibold text-white">Tracking status</p>
            <p className="mt-2 text-sm leading-6 text-crown-champagne">
              Add IDs here to load tracking centrally. Use consent banners and privacy disclosures before enabling retargeting pixels.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <Status label="Tracking enabled" active={settings.enabled} />
              <Status label="Consent mode" active={settings.consentMode !== "disabled"} value={settings.consentMode} />
              <Status label="GA4 configured" active={Boolean(settings.googleAnalyticsId)} />
              <Status label="Meta configured" active={Boolean(settings.metaPixelId)} />
            </div>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

function SeoPanel({ settings }: { settings: SeoSettings }) {
  const geoScore = Math.round(
    ((settings.answerEnginePrompts.length +
      settings.schemaTypes.length +
      settings.entitySignals.length +
      settings.aiOverviewTargets.length +
      settings.localMarkets.length +
      (settings.llmsTxtEnabled ? 2 : 0) +
      (settings.faqCoverage ? 2 : 0) +
      settings.contentClusters.filter((cluster) => cluster.status === "published").length) /
      30) *
      100
  );

  return (
    <Grid>
      <BentoTile title="SEO + Generative Engine Optimization" eyebrow="Organic + AI Discovery" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<Search />} label="SEO keywords" value={String(settings.keywords.length)} compact />
          <Metric icon={<FileText />} label="Content clusters" value={String(settings.contentClusters.length)} compact />
          <Metric icon={<Target />} label="GEO score" value={`${geoScore}%`} compact />
          <Metric icon={<ShieldCheck />} label="Schema types" value={String(settings.schemaTypes.length)} compact />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-3">
            <Field label="SEO title" value={settings.title} />
            <Field label="Meta description" value={settings.description} textarea />
            <Field label="Canonical URL" value={settings.canonicalUrl} />
            <Field label="Open Graph image" value={settings.ogImageUrl} />
            <Field label="Target keywords" value={settings.keywords.join("\n")} textarea />
            <Field label="Answer Engine Prompts" value={settings.answerEnginePrompts.join("\n")} textarea />
            <Field label="AI Overview Targets" value={settings.aiOverviewTargets.join("\n")} textarea />
            <Field label="Entity Signals" value={settings.entitySignals.join("\n")} textarea />
            <Field label="Answer Engine Summary" value={settings.answerEngineSummary} textarea />
          </div>
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <Search className="mb-4 text-crown-gold" />
              <p className="text-lg font-semibold text-white">SEO/GEO health</p>
              <div className="mt-4 space-y-2 text-sm">
                <Status label="Sitemap enabled" active={settings.sitemapEnabled} />
                <Status label="Robots indexable" active={settings.robotsMode === "index"} value={settings.robotsMode} />
                <Status label="OG image set" active={Boolean(settings.ogImageUrl)} />
                <Status label="Keywords set" active={settings.keywords.length > 0} />
                <Status label="FAQ / HowTo schema" active={settings.schemaTypes.includes("FAQPage") && settings.schemaTypes.includes("HowTo")} />
                <Status label="AI answer prompts" active={settings.answerEnginePrompts.length >= 4} />
                <Status label="Entity consistency" active={settings.entitySignals.length >= 4} />
                <Status label="llms.txt enabled" active={settings.llmsTxtEnabled} />
                <Status label="FAQ coverage" active={settings.faqCoverage} />
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <p className="font-semibold text-white">GEO answer targets</p>
              <div className="mt-3 space-y-2">
                {settings.aiOverviewTargets.map((target) => (
                  <div key={target} className="rounded-lg bg-white/[0.045] p-3 text-sm text-crown-champagne">
                    {target}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-5">
              <p className="font-semibold text-white">Schema and answer-engine coverage</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {settings.schemaTypes.map((schema) => (
                  <span key={schema} className="rounded-full border border-crown-gold/25 bg-crown-gold/10 px-3 py-1 text-xs text-crown-champagne">
                    {schema}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <p className="font-semibold text-white">Competitor and local capture</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...settings.competitorKeywords, ...settings.localMarkets].map((item) => (
                  <span key={item} className="rounded-full bg-white/[0.055] px-3 py-1 text-xs text-crown-mist">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <p className="font-semibold text-white">Content cluster roadmap</p>
              <div className="mt-3 space-y-2">
                {settings.contentClusters.map((cluster) => (
                  <div key={cluster.topic} className="rounded-lg bg-white/[0.045] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{cluster.topic}</p>
                      <span className="rounded-full bg-crown-gold/10 px-2 py-1 text-xs text-crown-gold">{cluster.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-crown-mist">{cluster.intent} · {cluster.targetKeyword}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

type AcquisitionWorkflowStatus = "ready" | "active" | "paused";

interface AcquisitionWorkflow {
  id: string;
  platform: string;
  source: string;
  captureMethod: string;
  automation: string;
  routing: string;
  status: AcquisitionWorkflowStatus;
}

const defaultAcquisitionWorkflows: AcquisitionWorkflow[] = [
  {
    id: "website-form",
    platform: "Website landing pages",
    source: "website",
    captureMethod: "Embedded form or pricing-page CTA",
    automation: "POST form data to /api/public/leads/capture with tenantSlug, name, email, source, campaign, consent",
    routing: "Create CRM lead, set next action to qualify need and timing, follow up within 24 hours",
    status: "active"
  },
  {
    id: "meta-leads",
    platform: "Meta / Facebook / Instagram",
    source: "meta",
    captureMethod: "Lead Ads webhook through Zapier, Make, or Meta Webhooks",
    automation: "Map full_name, email, phone, ad_id, campaign_name, and consent into the capture endpoint",
    routing: "Tag campaign source, add notes, trigger lead magnet delivery, retarget no-trial leads",
    status: "ready"
  },
  {
    id: "google-search",
    platform: "Google Search / YouTube",
    source: "google",
    captureMethod: "UTM landing page form or Google Ads lead form extension",
    automation: "Send gclid, keyword, campaign, name, email, and message to the capture endpoint",
    routing: "Route high-intent search leads to demo CTA and trial follow-up",
    status: "ready"
  },
  {
    id: "linkedin-leads",
    platform: "LinkedIn",
    source: "linkedin",
    captureMethod: "Lead Gen Form sync or manual CSV import through automation",
    automation: "Map job title, company, email, campaign, and source=linkedin into the capture endpoint",
    routing: "Prioritize team leaders, consultants, and operators for demo booking",
    status: "ready"
  },
  {
    id: "tiktok-leads",
    platform: "TikTok",
    source: "tiktok",
    captureMethod: "TikTok Lead Generation webhook or landing page UTM",
    automation: "Capture creator/short-form campaign, lead name, email, phone, and consent",
    routing: "Send fast-start checklist, score engagement, then invite to trial",
    status: "paused"
  },
  {
    id: "referral-partner",
    platform: "Referral partners / webinars",
    source: "referral",
    captureMethod: "Partner form, webinar registration, or import automation",
    automation: "Send partner, webinar, referrer, name, email, and campaign into the capture endpoint",
    routing: "Route warm referrals to owner follow-up and demo invite",
    status: "active"
  }
];

function LeadSalesEngine({
  seo,
  campaigns,
  metrics
}: {
  seo: SeoSettings;
  campaigns: AdCampaign[];
  metrics: TrafficRevenueMetric[];
}) {
  const [leadMagnets, setLeadMagnets] = useState(seo.leadMagnets);
  const [campaignRows, setCampaignRows] = useState(campaigns);
  const [tasks, setTasks] = useState([
    { id: "task-comparison", label: "Publish comparison page: Nowsite alternative for team duplication", done: false },
    { id: "task-checklist", label: "Launch 30-day fast start checklist lead magnet", done: false },
    { id: "task-retarget", label: "Retarget pricing visitors with 14-day trial offer", done: false },
    { id: "task-schema", label: "Create FAQ schema for AI answer engines", done: false },
    { id: "task-trial-email", label: "Send trial onboarding email to new signups", done: false }
  ]);
  const [selectedMagnetTitle, setSelectedMagnetTitle] = useState(seo.leadMagnets[0]?.title ?? "");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliverySubject, setDeliverySubject] = useState("Your Duplios duplication starter kit");
  const [deliveryBody, setDeliveryBody] = useState(
    "Hi {{first_name}},\n\nHere is the duplication starter kit you requested. Start with the first checklist, then book your 14-day trial when you are ready to install the system with your team.\n\nYour download: {{lead_magnet_link}}\n\nTo your growth,\nDuplios"
  );
  const [deliveryStatus, setDeliveryStatus] = useState("Ready to deliver the selected lead magnet.");
  const [acquisitionWorkflows, setAcquisitionWorkflows] = useState(defaultAcquisitionWorkflows);
  const [captureTenantSlug, setCaptureTenantSlug] = useState("duplios");
  const [captureStatus, setCaptureStatus] = useState("Lead capture endpoint ready for website forms and automation platforms.");
  const [captureSecret, setCaptureSecret] = useState("");
  const [testLead, setTestLead] = useState({
    name: "",
    email: "",
    source: "website",
    campaign: "",
    message: ""
  });
  const [testLeadStatus, setTestLeadStatus] = useState("No test lead submitted yet.");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const totalLeads = campaigns.reduce((sum, campaign) => sum + campaign.leads, 0);
  const totalTrials = campaigns.reduce((sum, campaign) => sum + campaign.trials, 0);
  const totalRevenue = metrics.reduce((sum, metric) => sum + metric.revenue, 0);
  const totalClicks = metrics.reduce((sum, metric) => sum + metric.clicks, 0);
  const activeWorkflows = acquisitionWorkflows.filter((workflow) => workflow.status === "active").length;
  const captureEndpoint = `${window.location.origin}/api/public/leads/capture`;
  const addTask = () =>
    setTasks((current) => [
      { id: `task-${Date.now()}`, label: `New funnel task ${current.length + 1}`, done: false },
      ...current
    ]);
  const updateTask = (id: string, label: string) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, label } : task)));
  const toggleTask = (id: string) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  const deleteTask = (id: string) => setTasks((current) => current.filter((task) => task.id !== id));
  const addLeadMagnet = () =>
    setLeadMagnets((current) => [
      {
        title: `New lead magnet ${current.length + 1}`,
        audience: "Team leaders",
        cta: "Start 14-day trial",
        status: "draft",
        conversionGoal: "trial"
      },
      ...current
    ]);
  const sendLeadMagnet = () => {
    const selectedMagnet = leadMagnets.find((magnet) => magnet.title === selectedMagnetTitle) ?? leadMagnets[0];

    if (!deliveryEmail.trim() || !selectedMagnet) {
      setDeliveryStatus("Add a recipient email and select a lead magnet before sending.");
      return;
    }

    setDeliveryStatus(`Queued "${selectedMagnet.title}" delivery email to ${deliveryEmail.trim()}.`);
  };
  const toggleCampaign = (id: string) =>
    setCampaignRows((current) =>
      current.map((campaign) =>
        campaign.id === id
          ? { ...campaign, status: campaign.status === "active" ? "paused" : "active" }
          : campaign
      )
    );
  const updateWorkflowStatus = (id: string, status: AcquisitionWorkflowStatus) =>
    setAcquisitionWorkflows((current) =>
      current.map((workflow) => (workflow.id === id ? { ...workflow, status } : workflow))
    );
  const copyCapturePayload = async (workflow: AcquisitionWorkflow) => {
    const payload = {
      tenantSlug: captureTenantSlug,
      source: workflow.source,
      campaign: "{{campaign_name}}",
      name: "{{lead_name}}",
      email: "{{lead_email}}",
      phone: "{{lead_phone}}",
      message: "{{lead_message}}",
      consent: true,
      nextAction: "Qualify need and timing"
    };

    await navigator.clipboard.writeText(
      `POST ${captureEndpoint}\nContent-Type: application/json\nx-duplios-capture-secret: ${"{LEAD_CAPTURE_SECRET}"}\n\n${JSON.stringify(payload, null, 2)}`
    );
    setCaptureStatus(`${workflow.platform} capture payload copied.`);
  };
  const submitTestLead = async () => {
    if (!testLead.name.trim()) {
      setTestLeadStatus("Add a lead name before sending a test lead.");
      return;
    }

    setIsSubmittingLead(true);
    setTestLeadStatus("Sending lead into the capture endpoint...");

    try {
      const result = await capturePublicLead({
        tenantSlug: captureTenantSlug,
        name: testLead.name,
        email: testLead.email,
        source: testLead.source,
        campaign: testLead.campaign,
        message: testLead.message,
        consent: true,
        nextAction: "Qualify need and timing",
        captureSecret: captureSecret.trim() || undefined
      });

      setTestLeadStatus(
        `Lead ${result.lead.id} captured from ${result.lead.source}; next follow-up ${new Date(result.lead.next_follow_up_at).toLocaleString()}.`
      );
      setTestLead((current) => ({ ...current, name: "", email: "", message: "" }));
    } catch (error) {
      setTestLeadStatus(error instanceof Error ? error.message : "Unable to send the test lead.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <Grid>
      <BentoTile title="Lead and Sales Engine" eyebrow="Get Customers" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<MousePointerClick />} label="Clicks" value={String(totalClicks)} compact />
          <Metric icon={<Users />} label="Leads" value={String(totalLeads)} compact />
          <Metric icon={<CalendarClock />} label="Trials" value={String(totalTrials)} compact />
          <Metric icon={<CreditCard />} label="Revenue" value={`$${totalRevenue}`} compact />
        </div>

        <div className="mb-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-5">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="font-semibold text-white">Multi-platform lead acquisition automation</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-crown-champagne">
                Use one capture endpoint for website forms, Meta Lead Ads, Google, TikTok,
                LinkedIn, referrals, webinars, and automation tools. Every source is normalized
                into a CRM lead with source, campaign notes, next action, and 24-hour follow-up.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-crown-mist">
              <p className="font-semibold text-white">{activeWorkflows} active workflows</p>
              <p>{acquisitionWorkflows.length} total sources configured</p>
            </div>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[0.9fr_1.4fr]">
            <label className="block">
              <span className="mb-2 block text-sm text-crown-mist">Tenant slug for capture</span>
              <input
                value={captureTenantSlug}
                onChange={(event) => setCaptureTenantSlug(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-crown-mist">Capture endpoint</span>
              <input
                readOnly
                value={captureEndpoint}
                className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-crown-champagne outline-none"
              />
            </label>
          </div>

          <div className="mb-4 rounded-lg border border-white/10 bg-crown-ink p-4">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold text-white">Live capture test</p>
                <p className="text-sm leading-6 text-crown-mist">
                  Send a lead through the real public capture API. If Supabase is configured, this
                  creates a row in <span className="font-mono">lead_records</span> and routes it to the tenant owner.
                </p>
              </div>
              <span className="rounded-full bg-crown-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-crown-emerald">
                Executable
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Lead name</span>
                <input
                  value={testLead.name}
                  onChange={(event) => setTestLead((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Jane Builder"
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Email</span>
                <input
                  value={testLead.email}
                  onChange={(event) => setTestLead((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Lead email"
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Source</span>
                <select
                  value={testLead.source}
                  onChange={(event) => setTestLead((current) => ({ ...current, source: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                >
                  {["website", "meta", "google", "linkedin", "tiktok", "referral", "event", "manual"].map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Campaign</span>
                <input
                  value={testLead.campaign}
                  onChange={(event) => setTestLead((current) => ({ ...current, campaign: event.target.value }))}
                  placeholder="fast-start-checklist"
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Capture secret</span>
                <input
                  value={captureSecret}
                  onChange={(event) => setCaptureSecret(event.target.value)}
                  placeholder="Required if LEAD_CAPTURE_SECRET is set"
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Message</span>
                <input
                  value={testLead.message}
                  onChange={(event) => setTestLead((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Interested in team duplication"
                  className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void submitTestLead()}
              disabled={isSubmittingLead}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {isSubmittingLead ? "Sending..." : "Send Test Lead"}
            </button>
            <p className="mt-3 text-sm text-crown-mist">{testLeadStatus}</p>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {acquisitionWorkflows.map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{workflow.platform}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-crown-gold">
                      source={workflow.source}
                    </p>
                  </div>
                  <select
                    value={workflow.status}
                    onChange={(event) => updateWorkflowStatus(workflow.id, event.target.value as AcquisitionWorkflowStatus)}
                    className="h-9 rounded-lg border border-white/10 bg-crown-navy px-2 text-xs font-semibold capitalize text-white outline-none"
                  >
                    <option value="ready">ready</option>
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                  </select>
                </div>
                <div className="space-y-3 text-sm leading-6">
                  <div>
                    <p className="text-crown-mist">Capture</p>
                    <p className="text-crown-champagne">{workflow.captureMethod}</p>
                  </div>
                  <div>
                    <p className="text-crown-mist">Automation</p>
                    <p className="text-crown-champagne">{workflow.automation}</p>
                  </div>
                  <div>
                    <p className="text-crown-mist">Routing</p>
                    <p className="text-crown-champagne">{workflow.routing}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void copyCapturePayload(workflow)}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
                >
                  Copy Automation Payload
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {["Capture", "Normalize", "Route", "Nurture"].map((step, index) => (
              <div key={step} className="rounded-lg border border-white/10 bg-crown-navy p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crown-gold">
                  Step {index + 1}
                </p>
                <p className="mt-1 font-semibold text-white">{step}</p>
                <p className="mt-2 text-sm leading-6 text-crown-mist">
                  {index === 0
                    ? "Collect name, contact, source, campaign, and consent."
                    : index === 1
                      ? "Standardize platform fields into one lead record."
                      : index === 2
                        ? "Assign to tenant owner and create a 24-hour follow-up."
                        : "Deliver lead magnet, track trial CTA, and retarget no-start leads."}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-crown-mist">{captureStatus}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Lead magnet funnel</p>
                  <p className="text-sm text-crown-mist">Build organic and paid offers that capture high-intent team leaders.</p>
                </div>
                <button onClick={addTask} className="inline-flex h-9 items-center gap-2 rounded-lg bg-crown-gold px-3 text-sm font-semibold text-crown-navy">
                  <Plus size={15} />
                  Add Task
                </button>
              </div>
              <button
                type="button"
                onClick={addLeadMagnet}
                className="mb-4 inline-flex h-9 items-center gap-2 rounded-lg border border-crown-gold/30 px-3 text-sm font-semibold text-crown-champagne"
              >
                <Plus size={15} />
                Add Lead Magnet
              </button>
              <div className="grid gap-3 md:grid-cols-3">
                {leadMagnets.map((magnet, index) => (
                  <div key={magnet.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <input
                      value={magnet.title}
                      onChange={(event) =>
                        setLeadMagnets((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: event.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-md border border-white/10 bg-crown-navy px-3 py-2 text-sm font-medium text-white outline-none"
                    />
                    <input
                      value={magnet.audience}
                      onChange={(event) =>
                        setLeadMagnets((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, audience: event.target.value } : item
                          )
                        )
                      }
                      className="mt-2 w-full rounded-md border border-white/10 bg-crown-navy px-3 py-2 text-sm text-crown-mist outline-none"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-crown-gold/10 px-2 py-1 uppercase tracking-[0.12em] text-crown-gold">
                        {magnet.cta}
                      </span>
                      <span className="rounded-full bg-white/[0.055] px-2 py-1 capitalize text-crown-mist">
                        {magnet.status}
                      </span>
                      <span className="rounded-full bg-white/[0.055] px-2 py-1 capitalize text-crown-mist">
                        {magnet.conversionGoal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Lead magnet funnel tasks</p>
                  <p className="text-sm text-crown-mist">Add, edit, complete, or delete the funnel work needed to capture and convert leads.</p>
                </div>
                <button onClick={addTask} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-crown-gold px-3 text-sm font-semibold text-crown-navy">
                  <Plus size={15} />
                  Add Task
                </button>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg bg-white/[0.045] p-3">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                      className="h-4 w-4 accent-crown-gold"
                    />
                    <input
                      value={task.label}
                      onChange={(event) => updateTask(task.id, event.target.value)}
                      className={`min-w-0 flex-1 rounded-md border border-white/10 bg-crown-navy px-3 py-2 text-sm outline-none ${
                        task.done ? "text-crown-mist line-through" : "text-crown-champagne"
                      }`}
                    />
                    <button
                      type="button"
                      aria-label="Delete funnel task"
                      title="Delete funnel task"
                      onClick={() => deleteTask(task.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crown-rose/30 text-crown-rose transition hover:bg-crown-rose/10"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <div className="mb-4 flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
                  <Mail size={18} />
                </span>
                <div>
                  <p className="font-semibold text-white">Lead magnet email delivery</p>
                  <p className="text-sm text-crown-mist">Prepare the automated email that delivers the selected asset after form capture.</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Lead magnet</span>
                  <select
                    value={selectedMagnetTitle}
                    onChange={(event) => setSelectedMagnetTitle(event.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                  >
                    {leadMagnets.map((magnet) => (
                      <option key={magnet.title} value={magnet.title}>{magnet.title}</option>
                    ))}
                  </select>
                </label>
                <ControlledField label="Recipient email" value={deliveryEmail} onChange={setDeliveryEmail} />
                <ControlledField label="Email subject" value={deliverySubject} onChange={setDeliverySubject} />
                <ControlledField label="Delivery email body" value={deliveryBody} textarea onChange={setDeliveryBody} />
              </div>

              <div className="mt-4 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-3 text-sm leading-6 text-crown-champagne">
                Workflow: form submitted → lead saved in Supabase → email provider sends lead magnet → trial CTA tracked with UTM → follow-up task created if no trial starts.
              </div>
              <button
                type="button"
                onClick={sendLeadMagnet}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
              >
                <Mail size={16} />
                Queue Delivery Email
              </button>
              <p className="mt-3 text-sm text-crown-mist">{deliveryStatus}</p>
            </div>

            <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-5">
              <Target className="mb-4 text-crown-gold" />
              <p className="font-semibold text-white">Best acquisition plays</p>
              <div className="mt-4 space-y-3 text-sm text-crown-champagne">
                <p>1. Rank comparison pages for “network marketing duplication software”.</p>
                <p>2. Capture leads with the 30-day fast start checklist.</p>
                <p>3. Retarget visitors with trial + demo booking.</p>
                <p>4. Publish FAQ answers for Google AI Overviews, Perplexity, ChatGPT, and Gemini-style results.</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-crown-ink p-5">
              <p className="mb-4 font-semibold text-white">Campaign-to-sales view</p>
              <div className="space-y-3">
                {campaignRows.map((campaign) => (
                  <div key={campaign.id} className="rounded-lg bg-white/[0.045] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{campaign.name}</p>
                      <button
                        type="button"
                        onClick={() => toggleCampaign(campaign.id)}
                        className="rounded-full bg-crown-gold/10 px-2 py-1 text-xs capitalize text-crown-gold"
                      >
                        {campaign.status}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-crown-mist">
                      {campaign.clicks} clicks · {campaign.leads} leads · {campaign.trials} trials · ${campaign.revenue}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

function AdsPanel({ campaigns }: { campaigns: AdCampaign[] }) {
  const [campaignRows, setCampaignRows] = useState<AdCampaign[]>(campaigns);
  const [draft, setDraft] = useState<AdCampaign>({
    id: "new-campaign",
    platform: "meta",
    name: "",
    objective: "trial",
    budget: 500,
    spend: 0,
    clicks: 0,
    leads: 0,
    trials: 0,
    revenue: 0,
    status: "draft"
  });
  const spend = campaignRows.reduce((sum, campaign) => sum + campaign.spend, 0);
  const revenue = campaignRows.reduce((sum, campaign) => sum + campaign.revenue, 0);
  const leads = campaignRows.reduce((sum, campaign) => sum + campaign.leads, 0);
  const clicks = campaignRows.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const roas = spend > 0 ? (revenue / spend).toFixed(1) : "0";
  const addCampaign = () => {
    if (!draft.name.trim()) return;
    setCampaignRows((current) => [
      {
        ...draft,
        id: `campaign-${Date.now()}`,
        name: draft.name.trim()
      },
      ...current
    ]);
    setDraft((current) => ({ ...current, name: "", spend: 0, clicks: 0, leads: 0, trials: 0, revenue: 0 }));
  };
  const updateCampaign = <Key extends keyof AdCampaign>(id: string, key: Key, value: AdCampaign[Key]) => {
    setCampaignRows((current) =>
      current.map((campaign) => (campaign.id === id ? { ...campaign, [key]: value } : campaign))
    );
  };
  const updateDraft = <Key extends keyof AdCampaign>(key: Key, value: AdCampaign[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Grid>
      <BentoTile title="Traffic and Ads" eyebrow="Customer Acquisition" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<Megaphone />} label="Ad spend" value={`$${spend}`} compact />
          <Metric icon={<CreditCard />} label="Tracked revenue" value={`$${revenue}`} compact />
          <Metric icon={<Users />} label="Leads" value={String(leads)} compact />
          <Metric icon={<BarChart3 />} label="ROAS" value={`${roas}x`} compact />
        </div>

        <div className="mb-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Manual campaign entry</p>
              <p className="text-sm text-crown-champagne">
                Use this while ads and analytics APIs are not connected. Enter spend, clicks, leads,
                trials, and revenue manually.
              </p>
            </div>
            <button
              type="button"
              onClick={addCampaign}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
            >
              <Plus size={16} />
              Add Campaign
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <AdInput label="Campaign name" value={draft.name} onChange={(value) => updateDraft("name", value)} />
            <AdSelect label="Platform" value={draft.platform} options={["google", "meta", "tiktok", "linkedin"]} onChange={(value) => updateDraft("platform", value as AdCampaign["platform"])} />
            <AdSelect label="Objective" value={draft.objective} options={["traffic", "lead", "trial", "purchase"]} onChange={(value) => updateDraft("objective", value as AdCampaign["objective"])} />
            <AdInput label="Budget" type="number" value={String(draft.budget)} onChange={(value) => updateDraft("budget", Number(value))} />
            <AdSelect label="Status" value={draft.status} options={["draft", "active", "paused"]} onChange={(value) => updateDraft("status", value as AdCampaign["status"])} />
          </div>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="text-sm text-crown-mist">Clicks</p>
            <p className="mt-1 text-2xl font-semibold text-white">{clicks}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="text-sm text-crown-mist">Cost per lead</p>
            <p className="mt-1 text-2xl font-semibold text-white">${leads > 0 ? Math.round(spend / leads) : 0}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="text-sm text-crown-mist">Lead conversion</p>
            <p className="mt-1 text-2xl font-semibold text-white">{clicks > 0 ? Math.round((leads / clicks) * 100) : 0}%</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="text-sm text-crown-mist">Active campaigns</p>
            <p className="mt-1 text-2xl font-semibold text-white">{campaignRows.filter((campaign) => campaign.status === "active").length}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-crown-mist">
              <tr className="border-b border-white/10">
                <th className="py-3 font-medium">Campaign</th>
                <th className="py-3 font-medium">Platform</th>
                <th className="py-3 font-medium">Objective</th>
                <th className="py-3 font-medium">Budget</th>
                <th className="py-3 font-medium">Spend</th>
                <th className="py-3 font-medium">Clicks</th>
                <th className="py-3 font-medium">Leads</th>
                <th className="py-3 font-medium">Trials</th>
                <th className="py-3 font-medium">Revenue</th>
                <th className="py-3 font-medium">ROAS</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {campaignRows.map((campaign) => (
                <tr key={campaign.id} className="border-b border-white/10 text-white">
                  <td className="py-3 pr-3">
                    <input
                      value={campaign.name}
                      onChange={(event) => updateCampaign(campaign.id, "name", event.target.value)}
                      className="h-10 w-52 rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
                    />
                  </td>
                  <td className="py-3 pr-3">
                    <SmallSelect value={campaign.platform} options={["google", "meta", "tiktok", "linkedin"]} onChange={(value) => updateCampaign(campaign.id, "platform", value as AdCampaign["platform"])} />
                  </td>
                  <td className="py-3 pr-3">
                    <SmallSelect value={campaign.objective} options={["traffic", "lead", "trial", "purchase"]} onChange={(value) => updateCampaign(campaign.id, "objective", value as AdCampaign["objective"])} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.budget} onChange={(value) => updateCampaign(campaign.id, "budget", value)} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.spend} onChange={(value) => updateCampaign(campaign.id, "spend", value)} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.clicks} onChange={(value) => updateCampaign(campaign.id, "clicks", value)} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.leads} onChange={(value) => updateCampaign(campaign.id, "leads", value)} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.trials} onChange={(value) => updateCampaign(campaign.id, "trials", value)} />
                  </td>
                  <td className="py-3 pr-3">
                    <InlineNumber value={campaign.revenue} onChange={(value) => updateCampaign(campaign.id, "revenue", value)} />
                  </td>
                  <td className="py-3 pr-3 font-semibold text-crown-gold">
                    {campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(1) : "0"}x
                  </td>
                  <td className="py-3 pr-3">
                    <SmallSelect value={campaign.status} options={["draft", "active", "paused"]} onChange={(value) => updateCampaign(campaign.id, "status", value as AdCampaign["status"])} />
                  </td>
                  <td className="py-3">
                    <IconButton
                      label="Delete campaign"
                      onClick={() => setCampaignRows((current) => current.filter((item) => item.id !== campaign.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoTile>
    </Grid>
  );
}

function AdInput({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-champagne">{label}</span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
      />
    </label>
  );
}

function AdSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-champagne">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm capitalize text-white outline-none ring-crown-gold/30 focus:ring-4"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function InlineNumber({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 w-24 rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
    />
  );
}

function TenantTrialPanel({ tenants }: { tenants: TenantRecord[] }) {
  const [tenantRows, setTenantRows] = useState<TenantRecord[]>(tenants);
  const [draft, setDraft] = useState<TenantRecord>({
    id: "new-tenant",
    name: "",
    slug: "",
    status: "trialing",
    tier: "ignite",
    ownerEmail: "",
    members: 1,
    duplicationScore: 0,
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    countryCode: "US",
    currency: "USD",
    monthlyRevenue: 0,
    createdAt: new Date().toISOString()
  });

  const updateTenant = <Key extends keyof TenantRecord>(
    id: string,
    key: Key,
    value: TenantRecord[Key]
  ) => {
    setTenantRows((current) =>
      current.map((tenant) => (tenant.id === id ? { ...tenant, [key]: value } : tenant))
    );
  };

  const addTenant = () => {
    const slug = draft.slug || draft.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    if (!draft.name || !draft.ownerEmail || !slug) {
      return;
    }

    const nextTenant: TenantRecord = {
      ...draft,
      id: slug,
      slug,
      countryCode: draft.countryCode?.toUpperCase(),
      currency: draft.currency?.toUpperCase()
    };

    setTenantRows((current) => [
      nextTenant,
      ...current.filter((tenant) => tenant.id !== nextTenant.id)
    ]);
    setDraft((current) => ({ ...current, name: "", slug: "", ownerEmail: "" }));
  };

  return (
    <Grid>
      <BentoTile title="Tenant Management" eyebrow="Plan + Trial Control" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">Create tenant</p>
              <p className="mt-1 text-sm text-crown-champagne">
                Add a tenant, assign plan, region, trial status, and owner access from Superadmin.
              </p>
            </div>
            <button
              type="button"
              onClick={addTenant}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
            >
              <Plus size={16} />
              Add Tenant
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            <PricingInput label="Tenant" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
            <PricingInput label="Owner email" value={draft.ownerEmail} onChange={(value) => setDraft((current) => ({ ...current, ownerEmail: value }))} />
            <PricingInput label="Slug" value={draft.slug} onChange={(value) => setDraft((current) => ({ ...current, slug: value.toLowerCase() }))} />
            <PricingInput label="Country" value={draft.countryCode ?? ""} onChange={(value) => setDraft((current) => ({ ...current, countryCode: value.toUpperCase().slice(0, 2) }))} />
            <PricingInput label="Currency" value={draft.currency ?? ""} onChange={(value) => setDraft((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))} />
            <label className="block">
              <span className="mb-2 block text-sm text-crown-champagne">Plan</span>
              <select
                value={draft.tier}
                onChange={(event) => setDraft((current) => ({ ...current, tier: event.target.value as TenantRecord["tier"] }))}
                className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm capitalize text-white outline-none"
              >
                <option value="ignite">Basic</option>
                <option value="ascent">Growth</option>
                <option value="empire">Pro</option>
              </select>
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-crown-mist">
              <tr className="border-b border-white/10">
                <th className="py-3 font-medium">Tenant</th>
                <th className="py-3 font-medium">Plan</th>
                <th className="py-3 font-medium">Trial</th>
                <th className="py-3 font-medium">Location</th>
                <th className="py-3 font-medium">MRR</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenantRows.map((tenant) => (
                <tr key={tenant.id} className="border-b border-white/10 text-white">
                  <td className="py-4">
                    <input
                      value={tenant.name}
                      onChange={(event) => updateTenant(tenant.id, "name", event.target.value)}
                      className="block w-52 rounded-lg border border-white/10 bg-crown-ink p-2 font-medium text-white outline-none"
                    />
                    <input
                      value={tenant.ownerEmail}
                      onChange={(event) => updateTenant(tenant.id, "ownerEmail", event.target.value)}
                      className="mt-2 block w-52 rounded-lg border border-white/10 bg-crown-ink p-2 text-xs text-crown-mist outline-none"
                    />
                  </td>
                  <td className="py-4">
                    <select
                      value={tenant.tier}
                      onChange={(event) => updateTenant(tenant.id, "tier", event.target.value as TenantRecord["tier"])}
                      className="rounded-lg border border-white/10 bg-crown-ink p-2 capitalize"
                    >
                      <option value="ignite">Basic</option>
                      <option value="ascent">Growth</option>
                      <option value="empire">Pro</option>
                    </select>
                  </td>
                  <td className="py-4">
                    <span className="block text-crown-champagne">
                      {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : "None"}
                    </span>
                    <span className="text-xs text-crown-mist">14-day default</span>
                  </td>
                  <td className="py-4">
                    {tenant.countryCode} · {tenant.currency}
                  </td>
                  <td className="py-4">${tenant.monthlyRevenue ?? 0}</td>
                  <td className="py-4 capitalize">{tenant.status.replace("_", " ")}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateTenant(
                            tenant.id,
                            "trialEndsAt",
                            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                          )
                        }
                        className="h-9 rounded-lg border border-crown-gold/30 px-3 text-crown-champagne"
                      >
                        Extend
                      </button>
                      {tenant.status === "paused" || tenant.status === "cancelled" ? (
                        <button
                          type="button"
                          onClick={() => updateTenant(tenant.id, "status", "active")}
                          className="h-9 rounded-lg border border-crown-emerald/40 px-3 text-crown-emerald"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateTenant(tenant.id, "status", "paused")}
                          className="h-9 rounded-lg border border-crown-gold/30 px-3 text-crown-gold"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateTenant(tenant.id, "status", "cancelled")}
                        className="h-9 rounded-lg border border-crown-rose/30 px-3 text-crown-rose"
                      >
                        End
                      </button>
                      <button
                        type="button"
                        onClick={() => setTenantRows((current) => current.filter((item) => item.id !== tenant.id))}
                        className="h-9 rounded-lg border border-white/10 px-3 text-crown-mist"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoTile>
    </Grid>
  );
}

function AnalyticsPanel({ metrics }: { metrics: TrafficRevenueMetric[] }) {
  const maxVisitors = Math.max(...metrics.map((item) => item.visitors));
  const maxRevenue = Math.max(...metrics.map((item) => item.revenue));
  const totalVisitors = metrics.reduce((sum, item) => sum + item.visitors, 0);
  const totalUniqueVisitors = metrics.reduce((sum, item) => sum + item.uniqueVisitors, 0);
  const totalSessions = metrics.reduce((sum, item) => sum + item.sessions, 0);
  const totalPageViews = metrics.reduce((sum, item) => sum + item.pageViews, 0);
  const totalClicks = metrics.reduce((sum, item) => sum + item.clicks, 0);
  const totalSignups = metrics.reduce((sum, item) => sum + item.signups, 0);
  const totalTrials = metrics.reduce((sum, item) => sum + item.trials, 0);
  const totalRevenue = metrics.reduce((sum, item) => sum + item.revenue, 0);
  const paidConversions = metrics.reduce((sum, item) => sum + item.paidConversions, 0);
  const totalAdSpend = metrics.reduce((sum, item) => sum + item.adSpend, 0);
  const avgBounceRate = Math.round(
    metrics.reduce((sum, item) => sum + item.bounceRate, 0) / Math.max(metrics.length, 1)
  );
  const ctr = ((totalClicks / Math.max(totalVisitors, 1)) * 100).toFixed(1);
  const visitorToSignup = ((totalSignups / Math.max(totalVisitors, 1)) * 100).toFixed(1);
  const trialConversion = ((totalTrials / Math.max(totalSignups, 1)) * 100).toFixed(1);
  const paidConversionRate = ((paidConversions / Math.max(totalTrials, 1)) * 100).toFixed(1);
  const cac = totalAdSpend > 0 ? Math.round(totalAdSpend / Math.max(paidConversions, 1)) : 0;
  const roas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(1) : "0";
  const sourceTotals = metrics
    .flatMap((item) => item.sourceBreakdown)
    .reduce<Record<string, { visitors: number; clicks: number; leads: number; revenue: number }>>(
      (acc, source) => {
        acc[source.source] ??= { visitors: 0, clicks: 0, leads: 0, revenue: 0 };
        acc[source.source].visitors += source.visitors;
        acc[source.source].clicks += source.clicks;
        acc[source.source].leads += source.leads;
        acc[source.source].revenue += source.revenue;
        return acc;
      },
      {}
    );
  const funnel = [
    { label: "Visitors", value: totalVisitors, rate: "100%" },
    { label: "Clicks", value: totalClicks, rate: `${ctr}% CTR` },
    { label: "Signups", value: totalSignups, rate: `${visitorToSignup}%` },
    { label: "Trials", value: totalTrials, rate: `${trialConversion}%` },
    { label: "Paid", value: paidConversions, rate: `${paidConversionRate}%` }
  ];

  return (
    <Grid>
      <BentoTile title="Revenue Analytics" eyebrow="7-Day Performance" className="md:col-span-4 lg:col-span-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric icon={<MousePointerClick />} label="Visitors" value={String(totalVisitors)} compact />
          <Metric icon={<Users />} label="Unique visitors" value={String(totalUniqueVisitors)} compact />
          <Metric icon={<BarChart3 />} label="Clicks" value={String(totalClicks)} compact />
          <Metric icon={<Search />} label="CTR" value={`${ctr}%`} compact />
          <Metric icon={<MousePointerClick />} label="Sessions" value={String(totalSessions)} compact />
          <Metric icon={<FileText />} label="Page views" value={String(totalPageViews)} compact />
          <Metric icon={<Target />} label="Bounce rate" value={`${avgBounceRate}%`} compact />
          <Metric icon={<CreditCard />} label="Revenue" value={`$${totalRevenue}`} compact />
          <Metric icon={<Users />} label="Signups" value={String(totalSignups)} compact />
          <Metric icon={<CalendarClock />} label="Trials" value={String(totalTrials)} compact />
          <Metric icon={<CreditCard />} label="Paid conversions" value={String(paidConversions)} compact />
          <Metric icon={<Megaphone />} label="CAC / ROAS" value={`$${cac} / ${roas}x`} compact />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-white">Traffic and revenue trend</p>
              <span className="text-xs text-crown-mist">Visitors vs revenue</span>
            </div>
            <div className="grid h-64 items-end gap-3 sm:grid-cols-7">
              {metrics.map((item) => (
                <div key={item.date} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex flex-1 items-end gap-1">
                    <div
                      className="w-full rounded-t bg-crown-gold"
                      style={{ height: `${Math.max((item.visitors / maxVisitors) * 100, 8)}%` }}
                      title={`${item.visitors} visitors`}
                    />
                    <div
                      className="w-full rounded-t bg-crown-emerald"
                      style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 8)}%` }}
                      title={`$${item.revenue} revenue`}
                    />
                  </div>
                  <p className="text-center text-xs text-crown-mist">{item.date}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="mb-4 font-semibold text-white">Funnel health</p>
            <div className="space-y-3">
              {funnel.map((step, index) => (
                <div key={step.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-crown-mist">{index + 1}. {step.label}</span>
                    <span className="font-semibold text-white">{step.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-crown-gold"
                      style={{ width: `${Math.max((step.value / Math.max(totalVisitors, 1)) * 100, 5)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-crown-gold">{step.rate}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="mb-4 font-semibold text-white">Traffic source breakdown</p>
            <div className="space-y-3">
              {Object.entries(sourceTotals).map(([source, value]) => (
                <div key={source} className="rounded-lg bg-white/[0.045] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="capitalize text-white">{source}</span>
                    <span className="text-sm text-crown-gold">${value.revenue}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-crown-mist">
                    <span>{value.visitors} visitors</span>
                    <span>{value.clicks} clicks</span>
                    <span>{value.leads} leads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="mb-4 font-semibold text-white">Daily acquisition table</p>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-crown-mist">
                <tr className="border-b border-white/10">
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Visitors</th>
                  <th className="py-3 font-medium">Sessions</th>
                  <th className="py-3 font-medium">Page views</th>
                  <th className="py-3 font-medium">Clicks</th>
                  <th className="py-3 font-medium">Signups</th>
                  <th className="py-3 font-medium">Trials</th>
                  <th className="py-3 font-medium">Paid</th>
                  <th className="py-3 font-medium">Spend</th>
                  <th className="py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((item) => (
                  <tr key={item.date} className="border-b border-white/10 text-white">
                    <td className="py-3">{item.date}</td>
                    <td className="py-3">{item.visitors}</td>
                    <td className="py-3">{item.sessions}</td>
                    <td className="py-3">{item.pageViews}</td>
                    <td className="py-3">{item.clicks}</td>
                    <td className="py-3">{item.signups}</td>
                    <td className="py-3">{item.trials}</td>
                    <td className="py-3">{item.paidConversions}</td>
                    <td className="py-3">${item.adSpend}</td>
                    <td className="py-3">${item.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

type PlanSetup = SalesPageContent["pricing"][number] & {
  trialDays: number;
  isPublic: boolean;
  enabledFeatures: FeatureKey[];
};

const planFeatureCatalog: Array<{
  key: FeatureKey;
  label: string;
  description: string;
  defaultPlans: SubscriptionTier[];
}> = [
  {
    key: "daily-apex",
    label: "Daily Apex Checklist",
    description: "Simple daily execution tasks for new joiners.",
    defaultPlans: ["ignite", "ascent", "empire"]
  },
  {
    key: "script-vault",
    label: "Script Vault",
    description: "Approved scripts and quick-share copy.",
    defaultPlans: ["ignite", "ascent", "empire"]
  },
  {
    key: "personal-crm",
    label: "Personal CRM",
    description: "Lead capture, stages, next action, and follow-up tracking.",
    defaultPlans: ["ignite", "ascent", "empire"]
  },
  {
    key: "landing-page-builder",
    label: "Landing Page Builder",
    description: "Tenant sales page and lead capture page controls.",
    defaultPlans: ["ascent", "empire"]
  },
  {
    key: "automation-sequences",
    label: "Automation Sequences",
    description: "Multi-step email, WhatsApp, and task follow-up flows.",
    defaultPlans: ["ascent", "empire"]
  },
  {
    key: "team-snapshot",
    label: "Team Snapshot",
    description: "Light team visibility for frontline activity.",
    defaultPlans: ["ascent", "empire"]
  },
  {
    key: "duplication-engine",
    label: "Duplication Engine",
    description: "Leader-to-downline pushes, playbooks, and hierarchy tools.",
    defaultPlans: ["empire"]
  },
  {
    key: "ai-prospecting-hub",
    label: "AI Prospecting Hub",
    description: "Gemini and DeepSeek assisted outreach generation.",
    defaultPlans: ["empire"]
  },
  {
    key: "team-analytics",
    label: "Team Analytics",
    description: "Team performance, funnel, PV, and duplication reporting.",
    defaultPlans: ["empire"]
  }
];

const tierLabels: Record<SubscriptionTier, string> = {
  ignite: "Basic",
  ascent: "Growth",
  empire: "Pro"
};

function PlanFeaturePanel({ salesPage }: { salesPage: SalesPageContent }) {
  const [plans, setPlans] = useState<PlanSetup[]>(
    salesPage.pricing.map((plan) => ({
      ...plan,
      trialDays: 14,
      isPublic: true,
      enabledFeatures: planFeatureCatalog
        .filter((feature) => feature.defaultPlans.includes(plan.tier))
        .map((feature) => feature.key)
    }))
  );
  const [saved, setSaved] = useState(false);

  const updatePlan = <Key extends keyof PlanSetup>(tier: SubscriptionTier, key: Key, value: PlanSetup[Key]) => {
    setPlans((current) => current.map((plan) => (plan.tier === tier ? { ...plan, [key]: value } : plan)));
    setSaved(false);
  };

  const toggleFeature = (tier: SubscriptionTier, feature: FeatureKey) => {
    setPlans((current) =>
      current.map((plan) => {
        if (plan.tier !== tier) return plan;
        const enabledFeatures = plan.enabledFeatures.includes(feature)
          ? plan.enabledFeatures.filter((item) => item !== feature)
          : [...plan.enabledFeatures, feature];

        return { ...plan, enabledFeatures };
      })
    );
    setSaved(false);
  };

  const savePlans = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Grid>
      <BentoTile title="Plan Offering and Feature Selection" eyebrow="Packaging Control" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<CreditCard />} label="Plans" value={String(plans.length)} compact />
          <Metric icon={<ShieldCheck />} label="Trial" value="14 days" compact />
          <Metric icon={<Settings />} label="Feature toggles" value={String(planFeatureCatalog.length)} compact />
          <Metric icon={<Users />} label="Public offers" value={String(plans.filter((plan) => plan.isPublic).length)} compact />
        </div>

        <div className="mb-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-white">Central plan packaging</p>
              <p className="mt-1 text-sm leading-6 text-crown-champagne">
                Control what Basic, Growth, and Pro include. This is where Superadmin can shape the
                sales offer, trial length, visibility, and feature access before publishing.
              </p>
            </div>
            <button
              type="button"
              onClick={savePlans}
              className="h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
            >
              {saved ? "Saved" : "Save Plan Setup"}
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.tier} className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crown-gold">
                    {tierLabels[plan.tier]}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">{plan.name}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-crown-mist">
                  Public
                  <input
                    type="checkbox"
                    checked={plan.isPublic}
                    onChange={(event) => updatePlan(plan.tier, "isPublic", event.target.checked)}
                    className="h-4 w-4 accent-crown-gold"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <ControlledField label="Plan name" value={plan.name} onChange={(value) => updatePlan(plan.tier, "name", value)} />
                <ControlledField label="Monthly price" value={plan.price} onChange={(value) => updatePlan(plan.tier, "price", value)} />
                <ControlledField
                  label="Positioning"
                  value={plan.description}
                  textarea
                  onChange={(value) => updatePlan(plan.tier, "description", value)}
                />
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Free trial days</span>
                  <input
                    type="number"
                    min={0}
                    value={plan.trialDays}
                    onChange={(event) => updatePlan(plan.tier, "trialDays", Number(event.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                  />
                </label>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-sm font-semibold text-white">Feature access</p>
                {planFeatureCatalog.map((feature) => {
                  const isEnabled = plan.enabledFeatures.includes(feature.key);

                  return (
                    <button
                      key={feature.key}
                      type="button"
                      onClick={() => toggleFeature(plan.tier, feature.key)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isEnabled
                          ? "border-crown-gold/35 bg-crown-gold/10"
                          : "border-white/10 bg-white/[0.035]"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-sm font-semibold text-white">{feature.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-crown-mist">{feature.description}</span>
                        </span>
                        <span className={`mt-1 h-5 w-9 rounded-full p-0.5 ${isEnabled ? "bg-crown-gold" : "bg-white/15"}`}>
                          <span className={`block h-4 w-4 rounded-full bg-white transition ${isEnabled ? "translate-x-4" : ""}`} />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </BentoTile>
    </Grid>
  );
}

function CMSPanel({ salesPage }: { salesPage: SalesPageContent }) {
  const [page, setPage] = useState<SalesPageContent>(salesPage);
  const [publishState, setPublishState] = useState<"draft" | "review" | "published">("draft");

  const updatePage = <Key extends keyof SalesPageContent>(key: Key, value: SalesPageContent[Key]) => {
    setPage((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
    setPublishState("draft");
  };

  const updateList = (key: "proofPoints" | "offerStack", index: number, value: string) => {
    updatePage(
      key,
      page[key].map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const removeListItem = (key: "proofPoints" | "offerStack", index: number) => {
    updatePage(
      key,
      page[key].filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const addListItem = (key: "proofPoints" | "offerStack", value: string) => {
    updatePage(key, [...page[key], value]);
  };

  return (
    <Grid>
      <BentoTile title="Sales Page CMS" eyebrow="Platform Review" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<FileText />} label="Sections" value="6" compact />
          <Metric icon={<ShieldCheck />} label="Status" value={publishState} compact />
          <Metric icon={<Users />} label="Testimonials" value={String(page.testimonials.length)} compact />
          <Metric icon={<CreditCard />} label="Plans" value={String(page.pricing.length)} compact />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">Hero and CTA</p>
                <button
                  type="button"
                  onClick={() => setPublishState("published")}
                  className="rounded-lg bg-crown-gold px-3 py-2 text-sm font-semibold text-crown-navy"
                >
                  Publish
                </button>
              </div>
              <div className="grid gap-3">
                <ControlledField label="Headline" value={page.headline} onChange={(value) => updatePage("headline", value)} />
                <ControlledField label="Subheadline" value={page.subheadline} onChange={(value) => updatePage("subheadline", value)} textarea />
                <ControlledField label="Primary CTA" value={page.primaryCta} onChange={(value) => updatePage("primaryCta", value)} />
              </div>
            </div>

            <EditableStringList
              title="Proof Points"
              addLabel="Add proof"
              items={page.proofPoints}
              onAdd={() => addListItem("proofPoints", "New measurable proof point")}
              onChange={(index, value) => updateList("proofPoints", index, value)}
              onDelete={(index) => removeListItem("proofPoints", index)}
            />

            <EditableStringList
              title="Offer Stack"
              addLabel="Add offer"
              items={page.offerStack}
              onAdd={() => addListItem("offerStack", "New offer asset")}
              onChange={(index, value) => updateList("offerStack", index, value)}
              onDelete={(index) => removeListItem("offerStack", index)}
            />

            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <ContentHeader
                title="Features"
                action="Add feature"
                onClick={() =>
                  updatePage("features", [
                    ...page.features,
                    { title: "New growth feature", body: "Describe the business outcome this feature creates." }
                  ])
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                {page.features.map((feature, index) => (
                  <EditableCard key={`${feature.title}-${index}`} onDelete={() => updatePage("features", page.features.filter((_, itemIndex) => itemIndex !== index))}>
                    <ControlledField
                      label="Feature title"
                      value={feature.title}
                      onChange={(value) =>
                        updatePage(
                          "features",
                          page.features.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: value } : item
                          )
                        )
                      }
                    />
                    <ControlledField
                      label="Feature body"
                      value={feature.body}
                      textarea
                      onChange={(value) =>
                        updatePage(
                          "features",
                          page.features.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, body: value } : item
                          )
                        )
                      }
                    />
                  </EditableCard>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <ContentHeader
                title="Pricing Cards"
                action="Add plan"
                onClick={() =>
                  updatePage("pricing", [
                    ...page.pricing,
                    {
                      tier: "ignite",
                      name: "Custom",
                      price: "$0",
                      description: "Describe this package.",
                      features: ["New feature"],
                      highlighted: false
                    }
                  ])
                }
              />
              <div className="grid gap-3 lg:grid-cols-3">
                {page.pricing.map((plan, index) => (
                  <EditableCard key={`${plan.name}-${index}`} onDelete={() => updatePage("pricing", page.pricing.filter((_, itemIndex) => itemIndex !== index))}>
                    <ControlledField
                      label="Plan name"
                      value={plan.name}
                      onChange={(value) =>
                        updatePage(
                          "pricing",
                          page.pricing.map((item, itemIndex) => (itemIndex === index ? { ...item, name: value } : item))
                        )
                      }
                    />
                    <ControlledField
                      label="Price"
                      value={plan.price}
                      onChange={(value) =>
                        updatePage(
                          "pricing",
                          page.pricing.map((item, itemIndex) => (itemIndex === index ? { ...item, price: value } : item))
                        )
                      }
                    />
                    <ControlledField
                      label="Description"
                      value={plan.description}
                      textarea
                      onChange={(value) =>
                        updatePage(
                          "pricing",
                          page.pricing.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: value } : item
                          )
                        )
                      }
                    />
                  </EditableCard>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-5">
              <FileText className="mb-4 text-crown-gold" />
              <p className="text-lg font-semibold text-white">CMS governance</p>
              <p className="mt-2 text-sm leading-6 text-crown-champagne">
                Superadmin can create, update, review, publish, and remove tenant sales-page content before it goes live.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <Status label="Compliance review" active={publishState !== "draft"} value={publishState} />
                <Status label="Pricing claims checked" active />
                <Status label="Testimonials approved" active={page.testimonials.length > 0} />
                <Status label="Last updated" active value={new Date(page.updatedAt).toLocaleDateString()} />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <ContentHeader
                title="Testimonials"
                action="Add testimonial"
                onClick={() =>
                  updatePage("testimonials", [
                    ...page.testimonials,
                    { quote: "Add customer outcome here.", name: "Customer name", title: "Role or market" }
                  ])
                }
              />
              <div className="space-y-3">
                {page.testimonials.map((testimonial, index) => (
                  <EditableCard key={`${testimonial.name}-${index}`} onDelete={() => updatePage("testimonials", page.testimonials.filter((_, itemIndex) => itemIndex !== index))}>
                    <ControlledField
                      label="Quote"
                      value={testimonial.quote}
                      textarea
                      onChange={(value) =>
                        updatePage(
                          "testimonials",
                          page.testimonials.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, quote: value } : item
                          )
                        )
                      }
                    />
                    <ControlledField
                      label="Name"
                      value={testimonial.name}
                      onChange={(value) =>
                        updatePage(
                          "testimonials",
                          page.testimonials.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: value } : item
                          )
                        )
                      }
                    />
                  </EditableCard>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <ContentHeader
                title="FAQs"
                action="Add FAQ"
                onClick={() =>
                  updatePage("faqs", [
                    ...page.faqs,
                    { question: "New customer question?", answer: "Answer it clearly here." }
                  ])
                }
              />
              <div className="space-y-3">
                {page.faqs.map((faq, index) => (
                  <EditableCard key={`${faq.question}-${index}`} onDelete={() => updatePage("faqs", page.faqs.filter((_, itemIndex) => itemIndex !== index))}>
                    <ControlledField
                      label="Question"
                      value={faq.question}
                      onChange={(value) =>
                        updatePage(
                          "faqs",
                          page.faqs.map((item, itemIndex) => (itemIndex === index ? { ...item, question: value } : item))
                        )
                      }
                    />
                    <ControlledField
                      label="Answer"
                      value={faq.answer}
                      textarea
                      onChange={(value) =>
                        updatePage(
                          "faqs",
                          page.faqs.map((item, itemIndex) => (itemIndex === index ? { ...item, answer: value } : item))
                        )
                      }
                    />
                  </EditableCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

type PreviewStage = "new_joiner" | "growing" | "leader";

const previewStageLabels: Record<PreviewStage, string> = {
  new_joiner: "New Joiner",
  growing: "Growing Builder",
  leader: "Leader"
};

const previewNav: Record<PreviewStage, string[]> = {
  new_joiner: ["Home", "Fast Start OS", "Playbook", "Settings"],
  growing: ["Home", "Fast Start OS", "Growth CRM", "Playbook", "Resource Vault", "Tasks", "AI Scripts", "Social Outreach", "Settings"],
  leader: [
    "Home",
    "Fast Start OS",
    "Growth CRM",
    "Playbook",
    "Sales Sprint",
    "Resource Vault",
    "AI Scripts",
    "Network & PV",
    "Team Metrics",
    "Team Hub",
    "Automation",
    "Superadmin"
  ]
};

const stageFeaturePreview: Record<PreviewStage, string[]> = {
  new_joiner: ["Daily path", "Approved script copy", "Simple training", "Language and stage settings"],
  growing: ["Lead CRM", "Follow-up tasks", "AI scripts", "Social outreach workflow", "Resource vault"],
  leader: ["Team hierarchy", "Duplication push", "Team analytics", "Automation", "Plan and access controls"]
};

function RolePreviewPanel({ users }: { users: AccessUser[] }) {
  const [stage, setStage] = useState<PreviewStage>("new_joiner");
  const [plan, setPlan] = useState<SubscriptionTier>("ignite");
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [language, setLanguage] = useState<"English" | "Malay" | "Chinese" | "Other">("English");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [applied, setApplied] = useState(false);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0];
  const enabledFeatures = planFeatureCatalog.filter((feature) => {
    if (stage === "new_joiner") {
      return ["daily-apex", "script-vault"].includes(feature.key);
    }

    if (stage === "growing") {
      return ["daily-apex", "script-vault", "personal-crm", "automation-sequences", "team-snapshot"].includes(feature.key);
    }

    return feature.defaultPlans.includes(plan) || plan === "empire";
  });

  const applyPreview = () => {
    setApplied(true);
    window.setTimeout(() => setApplied(false), 1800);
  };

  return (
    <Grid>
      <BentoTile title="Role Testing Sandbox" eyebrow="Preview Before Apply" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<Users />} label="Preview user" value={selectedUser?.displayName ?? "Demo user"} compact />
          <Metric icon={<ShieldCheck />} label="Stage" value={previewStageLabels[stage]} compact />
          <Metric icon={<CreditCard />} label="Plan" value={tierLabels[plan]} compact />
          <Metric icon={<Settings />} label="Device" value={device} compact />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <p className="mb-4 font-semibold text-white">Sandbox controls</p>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Test as user</span>
                  <select
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.displayName} · {user.email}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Team member stage</span>
                  <select
                    value={stage}
                    onChange={(event) => setStage(event.target.value as PreviewStage)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
                  >
                    <option value="new_joiner">New Joiner</option>
                    <option value="growing">Growing Builder</option>
                    <option value="leader">Leader</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Plan</span>
                  <select
                    value={plan}
                    onChange={(event) => setPlan(event.target.value as SubscriptionTier)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
                  >
                    <option value="ignite">Basic</option>
                    <option value="ascent">Growth</option>
                    <option value="empire">Pro</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["desktop", "mobile"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDevice(item)}
                      className={`h-10 rounded-lg text-sm font-semibold capitalize ${
                        device === item ? "bg-crown-gold text-crown-navy" : "border border-white/10 text-crown-mist"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm text-crown-mist">Language</span>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as typeof language)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none"
                  >
                    <option>English</option>
                    <option>Malay</option>
                    <option>Chinese</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={applyPreview}
              className="h-11 w-full rounded-lg bg-crown-gold text-sm font-semibold text-crown-navy"
            >
              {applied ? "Preview Approved" : "Apply After Review"}
            </button>
          </div>

          <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crown-gold">
                  {device} preview
                </p>
                <p className="text-xl font-semibold text-white">{previewStageLabels[stage]} experience</p>
              </div>
              <span className="rounded-full bg-crown-gold px-3 py-1 text-xs font-semibold text-crown-navy">
                {language}
              </span>
            </div>

            <div className={`mx-auto rounded-2xl border border-white/10 bg-crown-navy p-4 ${device === "mobile" ? "max-w-[360px]" : "w-full"}`}>
              <div className="mb-4 rounded-xl bg-white/[0.045] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-crown-gold">First screen</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {stage === "new_joiner" ? "Do these few things today." : stage === "growing" ? "Grow your personal pipeline." : "Lead and duplicate your team."}
                </h3>
                <p className="mt-2 text-sm leading-6 text-crown-mist">
                  {stage === "new_joiner"
                    ? "Simple checklist, approved scripts, and sponsor help only."
                    : stage === "growing"
                      ? "CRM, follow-up, scripts, outreach, and resources."
                      : "Team hierarchy, analytics, automation, and Superadmin controls."}
                </p>
              </div>

              <div className={`grid gap-2 ${device === "mobile" ? "grid-cols-2" : "md:grid-cols-4"}`}>
                {previewNav[stage].map((item) => (
                  <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-semibold text-white">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="font-semibold text-white">Visible features</p>
                  <div className="mt-3 space-y-2">
                    {stageFeaturePreview[stage].map((item) => (
                      <Status key={item} label={item} active />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <p className="font-semibold text-white">Plan gates</p>
                  <div className="mt-3 space-y-2">
                    {enabledFeatures.slice(0, 5).map((feature) => (
                      <Status key={feature.key} label={feature.label} active />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

const legalCategoryLabels: Record<LegalDocument["category"], string> = {
  terms: "Terms",
  privacy: "Privacy",
  refund: "Refund",
  acceptable_use: "Acceptable Use",
  earnings: "Earnings",
  medical: "Medical",
  testimonial: "Testimonials",
  compliance: "Compliance"
};

const legalStatusLabels: Record<LegalDocument["status"], string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published"
};

function LegalReviewPanel({ documents }: { documents: LegalDocument[] }) {
  const [docs, setDocs] = useState<LegalDocument[]>(documents);
  const [selectedId, setSelectedId] = useState(documents[0]?.id ?? "");
  const selectedDoc = docs.find((doc) => doc.id === selectedId) ?? docs[0];
  const publishedDocs = docs.filter((doc) => doc.status === "published");
  const reviewDocs = docs.filter((doc) => doc.status === "in_review");
  const requiredOpen = docs.filter((doc) => doc.required && doc.status !== "published").length;
  const requiredCategories: LegalDocument["category"][] = ["terms", "privacy", "refund", "earnings", "medical", "compliance"];
  const coveredRequired = requiredCategories.filter((category) =>
    docs.some((doc) => doc.category === category && ["approved", "published"].includes(doc.status))
  ).length;

  const addDocument = () => {
    const nextDoc: LegalDocument = {
      id: `legal-${Date.now()}`,
      title: "New Legal Document",
      category: "compliance",
      status: "draft",
      required: false,
      updatedAt: new Date().toISOString(),
      body: "Add reviewed legal copy here before publishing it to the customer-facing footer."
    };
    setDocs((current) => [nextDoc, ...current]);
    setSelectedId(nextDoc.id);
  };

  const updateDocument = <Key extends keyof LegalDocument>(id: string, key: Key, value: LegalDocument[Key]) => {
    setDocs((current) =>
      current.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              [key]: value,
              updatedAt: new Date().toISOString()
            }
          : doc
      )
    );
  };

  const setReviewStatus = (id: string, status: LegalDocument["status"]) => {
    setDocs((current) =>
      current.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              status,
              reviewedBy: status === "approved" || status === "published" ? "Platform Superadmin" : doc.reviewedBy,
              updatedAt: new Date().toISOString()
            }
          : doc
      )
    );
  };

  const deleteDocument = (id: string) => {
    setDocs((current) => {
      const next = current.filter((doc) => doc.id !== id);
      if (selectedId === id) {
        window.setTimeout(() => setSelectedId(next[0]?.id ?? ""), 0);
      }
      return next;
    });
  };

  return (
    <Grid>
      <BentoTile title="Legal and Disclaimer Library" eyebrow="Editable Compliance Copy" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<FileText />} label="Legal documents" value={String(docs.length)} compact />
          <Metric icon={<ShieldCheck />} label="Published" value={String(publishedDocs.length)} compact />
          <Metric icon={<CalendarClock />} label="In review" value={String(reviewDocs.length)} compact />
          <Metric icon={<Bell />} label="Required open" value={String(requiredOpen)} compact />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <ContentHeader title="Document register" action="Add Legal Doc" onClick={addDocument} />
            <div className="space-y-3">
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  className={`w-full rounded-lg border p-4 text-left transition ${
                    selectedDoc?.id === doc.id
                      ? "border-crown-gold/60 bg-crown-gold/10"
                      : "border-white/10 bg-crown-navy hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{doc.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-crown-mist">
                        {legalCategoryLabels[doc.category]} · {doc.required ? "Required" : "Optional"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        doc.status === "published"
                          ? "bg-crown-emerald/15 text-crown-emerald"
                          : doc.status === "approved"
                            ? "bg-crown-gold/15 text-crown-gold"
                            : doc.status === "in_review"
                              ? "bg-blue-500/15 text-blue-200"
                              : "bg-white/10 text-crown-mist"
                      }`}
                    >
                      {legalStatusLabels[doc.status]}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-crown-mist">{doc.body}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedDoc ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Review editor</p>
                    <p className="text-sm text-crown-mist">
                      Last updated {new Date(selectedDoc.updatedAt).toLocaleDateString()} · {selectedDoc.reviewedBy ?? "Not reviewed"}
                    </p>
                  </div>
                  <IconButton label="Delete legal document" onClick={() => deleteDocument(selectedDoc.id)} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ControlledField
                    label="Title"
                    value={selectedDoc.title}
                    onChange={(value) => updateDocument(selectedDoc.id, "title", value)}
                  />
                  <label className="block">
                    <span className="mb-2 block text-sm text-crown-mist">Category</span>
                    <select
                      value={selectedDoc.category}
                      onChange={(event) => updateDocument(selectedDoc.id, "category", event.target.value as LegalDocument["category"])}
                      className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                    >
                      {Object.entries(legalCategoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm text-crown-mist">Review status</span>
                    <select
                      value={selectedDoc.status}
                      onChange={(event) => setReviewStatus(selectedDoc.id, event.target.value as LegalDocument["status"])}
                      className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                    >
                      {Object.entries(legalStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-crown-champagne">
                    <input
                      type="checkbox"
                      checked={selectedDoc.required}
                      onChange={(event) => updateDocument(selectedDoc.id, "required", event.target.checked)}
                      className="h-4 w-4 accent-crown-gold"
                    />
                    Required before public launch
                  </label>
                </div>

                <div className="mt-3">
                  <ControlledField
                    label="Legal copy / disclaimer body"
                    value={selectedDoc.body}
                    textarea
                    onChange={(value) => updateDocument(selectedDoc.id, "body", value)}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus(selectedDoc.id, "in_review")}
                    className="h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-crown-champagne"
                  >
                    Send To Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus(selectedDoc.id, "approved")}
                    className="h-10 rounded-lg border border-crown-gold/30 px-4 text-sm font-semibold text-crown-gold"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewStatus(selectedDoc.id, "published")}
                    className="h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
                  >
                    Publish To Footer
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
                <p className="font-semibold text-white">Launch review checklist</p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <Status label="Terms or acceptable use approved" active={docs.some((doc) => ["terms", "acceptable_use"].includes(doc.category) && ["approved", "published"].includes(doc.status))} />
                  <Status label="Privacy and tracking disclosed" active={docs.some((doc) => doc.category === "privacy" && ["approved", "published"].includes(doc.status))} />
                  <Status label="Refund and trial terms present" active={docs.some((doc) => doc.category === "refund" && ["approved", "published"].includes(doc.status))} />
                  <Status label="Earnings disclaimer published" active={docs.some((doc) => doc.category === "earnings" && doc.status === "published")} />
                  <Status label="Medical or wellness disclaimer published" active={docs.some((doc) => doc.category === "medical" && doc.status === "published")} />
                  <Status label={`${coveredRequired}/${requiredCategories.length} required categories covered`} active={coveredRequired === requiredCategories.length} />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </BentoTile>

      <BentoTile title="Customer Footer Preview" eyebrow="Published Documents" className="md:col-span-4 lg:col-span-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {publishedDocs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-crown-gold">{legalCategoryLabels[doc.category]}</p>
              <p className="mt-2 font-semibold text-white">{doc.title}</p>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-crown-mist">{doc.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-white/10 bg-crown-navy p-4 text-sm leading-6 text-crown-champagne">
          Footer note: this module stores template language for operational review. Final public legal copy should still be checked by qualified counsel for each country, claim type, processor, and business model before launch.
        </div>
      </BentoTile>
    </Grid>
  );
}

function ContentHeader({
  title,
  action,
  onClick
}: {
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="font-semibold text-white">{title}</p>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-crown-gold/30 px-3 text-sm font-semibold text-crown-champagne"
      >
        <Plus size={15} />
        {action}
      </button>
    </div>
  );
}

function EditableStringList({
  title,
  addLabel,
  items,
  onAdd,
  onChange,
  onDelete
}: {
  title: string;
  addLabel: string;
  items: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
      <ContentHeader title={title} action={addLabel} onClick={onAdd} />
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex gap-2">
            <input
              value={item}
              onChange={(event) => onChange(index, event.target.value)}
              className="h-11 flex-1 rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
            />
            <IconButton label="Delete item" onClick={() => onDelete(index)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableCard({
  children,
  onDelete
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-crown-navy p-3">
      <div className="mb-3 flex justify-end">
        <IconButton label="Delete block" onClick={onDelete} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ControlledField({
  label,
  value,
  onChange,
  textarea = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const className =
    "w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4";

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-mist">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${className} min-h-24 resize-none`}
        />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />
      )}
    </label>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-crown-rose/30 text-crown-rose transition hover:bg-crown-rose/10"
    >
      <Trash2 size={16} />
    </button>
  );
}

function AccessPanel({ users, invites }: { users: AccessUser[]; invites: AccessInvite[] }) {
  const [userRows, setUserRows] = useState<AccessUser[]>(users);
  const [inviteRows, setInviteRows] = useState<AccessInvite[]>(invites);
  const [draftUser, setDraftUser] = useState<AccessUser>({
    id: "new-user",
    displayName: "",
    email: "",
    role: "member",
    tier: "ignite",
    status: "invited",
    mfaEnabled: false
  });
  const [draftInvite, setDraftInvite] = useState<AccessInvite>({
    id: "new-invite",
    email: "",
    role: "member",
    tier: "ignite",
    status: "pending",
    invitedBy: "Superadmin",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  const addUser = () => {
    if (!draftUser.displayName.trim() || !draftUser.email.trim()) return;
    const nextUser = {
      ...draftUser,
      id: draftUser.email.trim().toLowerCase(),
      lastSeenAt: new Date().toISOString()
    };
    setUserRows((current) => [nextUser, ...current.filter((user) => user.id !== nextUser.id)]);
    setDraftUser((current) => ({ ...current, displayName: "", email: "" }));
  };

  const addInvite = () => {
    if (!draftInvite.email.trim()) return;
    const nextInvite = {
      ...draftInvite,
      id: `invite-${Date.now()}`,
      email: draftInvite.email.trim().toLowerCase(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    setInviteRows((current) => [nextInvite, ...current]);
    setDraftInvite((current) => ({ ...current, email: "" }));
  };

  const updateUser = <Key extends keyof AccessUser>(id: string, key: Key, value: AccessUser[Key]) => {
    setUserRows((current) => current.map((user) => (user.id === id ? { ...user, [key]: value } : user)));
  };

  const updateInvite = <Key extends keyof AccessInvite>(id: string, key: Key, value: AccessInvite[Key]) => {
    setInviteRows((current) => current.map((invite) => (invite.id === id ? { ...invite, [key]: value } : invite)));
  };

  const activeUsers = userRows.filter((user) => user.status === "active").length;
  const suspendedUsers = userRows.filter((user) => user.status === "suspended").length;
  const pendingInvites = inviteRows.filter((invite) => invite.status === "pending").length;
  const mfaCoverage = Math.round((userRows.filter((user) => user.mfaEnabled).length / Math.max(userRows.length, 1)) * 100);

  return (
    <Grid>
      <BentoTile title="Access Management" eyebrow="RBAC + Invites" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <Metric icon={<Users />} label="Active users" value={String(activeUsers)} compact />
          <Metric icon={<ShieldCheck />} label="MFA coverage" value={`${mfaCoverage}%`} compact />
          <Metric icon={<Mail />} label="Pending invites" value={String(pendingInvites)} compact />
          <Metric icon={<Bell />} label="Suspended" value={String(suspendedUsers)} compact />
        </div>

        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
            <ContentHeader title="Create User" action="Add User" onClick={addUser} />
            <div className="grid gap-3 md:grid-cols-2">
              <PricingInput label="Display name" value={draftUser.displayName} onChange={(value) => setDraftUser((current) => ({ ...current, displayName: value }))} />
              <PricingInput label="Email" value={draftUser.email} onChange={(value) => setDraftUser((current) => ({ ...current, email: value }))} />
              <AccessSelect label="Role" value={draftUser.role} options={["new_joiner", "member", "leader", "admin", "superadmin"]} onChange={(value) => setDraftUser((current) => ({ ...current, role: value as AccessUser["role"] }))} />
              <AccessSelect label="Plan" value={draftUser.tier} options={["ignite", "ascent", "empire"]} labels={{ ignite: "Basic", ascent: "Growth", empire: "Pro" }} onChange={(value) => setDraftUser((current) => ({ ...current, tier: value as AccessUser["tier"] }))} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
            <ContentHeader title="Create Invite" action="Send Invite" onClick={addInvite} />
            <div className="grid gap-3 md:grid-cols-2">
              <PricingInput label="Invite email" value={draftInvite.email} onChange={(value) => setDraftInvite((current) => ({ ...current, email: value }))} />
              <AccessSelect label="Role" value={draftInvite.role} options={["new_joiner", "member", "leader", "admin"]} onChange={(value) => setDraftInvite((current) => ({ ...current, role: value as AccessInvite["role"] }))} />
              <AccessSelect label="Plan" value={draftInvite.tier} options={["ignite", "ascent", "empire"]} labels={{ ignite: "Basic", ascent: "Growth", empire: "Pro" }} onChange={(value) => setDraftInvite((current) => ({ ...current, tier: value as AccessInvite["tier"] }))} />
              <AccessSelect label="Status" value={draftInvite.status} options={["pending", "accepted", "expired"]} onChange={(value) => setDraftInvite((current) => ({ ...current, status: value as AccessInvite["status"] }))} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-crown-ink p-4">
            <p className="mb-4 font-semibold text-white">Users</p>
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="text-crown-mist">
                <tr className="border-b border-white/10">
                  <th className="py-3 font-medium">Name</th>
                  <th className="py-3 font-medium">Email</th>
                  <th className="py-3 font-medium">Role</th>
                  <th className="py-3 font-medium">Plan</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">MFA</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((user) => (
                  <tr key={user.id} className="border-b border-white/10 text-white">
                    <td className="py-3">
                      <input value={user.displayName} onChange={(event) => updateUser(user.id, "displayName", event.target.value)} className="w-44 rounded-lg border border-white/10 bg-crown-navy p-2 text-sm outline-none" />
                    </td>
                    <td className="py-3">
                      <input value={user.email} onChange={(event) => updateUser(user.id, "email", event.target.value)} className="w-56 rounded-lg border border-white/10 bg-crown-navy p-2 text-sm outline-none" />
                    </td>
                    <td className="py-3">
                      <SmallSelect value={user.role} options={["new_joiner", "member", "leader", "admin", "superadmin"]} onChange={(value) => updateUser(user.id, "role", value as AccessUser["role"])} />
                    </td>
                    <td className="py-3">
                      <SmallSelect value={user.tier} options={["ignite", "ascent", "empire"]} labels={{ ignite: "Basic", ascent: "Growth", empire: "Pro" }} onChange={(value) => updateUser(user.id, "tier", value as AccessUser["tier"])} />
                    </td>
                    <td className="py-3">
                      <SmallSelect value={user.status} options={["active", "invited", "suspended"]} onChange={(value) => updateUser(user.id, "status", value as AccessUser["status"])} />
                    </td>
                    <td className="py-3">
                      <input type="checkbox" checked={user.mfaEnabled} onChange={(event) => updateUser(user.id, "mfaEnabled", event.target.checked)} className="h-4 w-4 accent-crown-gold" />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => updateUser(user.id, "status", user.status === "active" ? "suspended" : "active")} className="h-8 rounded-lg border border-crown-gold/30 px-3 text-xs text-crown-champagne">
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        <button onClick={() => setUserRows((current) => current.filter((item) => item.id !== user.id))} className="h-8 rounded-lg border border-crown-rose/30 px-3 text-xs text-crown-rose">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-white">Invites</p>
            {inviteRows.map((invite) => (
              <div key={invite.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
                <input value={invite.email} onChange={(event) => updateInvite(invite.id, "email", event.target.value)} className="w-full rounded-lg border border-white/10 bg-crown-navy p-2 text-sm text-white outline-none" />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <SmallSelect value={invite.role} options={["new_joiner", "member", "leader", "admin"]} onChange={(value) => updateInvite(invite.id, "role", value as AccessInvite["role"])} />
                  <SmallSelect value={invite.tier} options={["ignite", "ascent", "empire"]} labels={{ ignite: "Basic", ascent: "Growth", empire: "Pro" }} onChange={(value) => updateInvite(invite.id, "tier", value as AccessInvite["tier"])} />
                  <SmallSelect value={invite.status} options={["pending", "accepted", "expired"]} onChange={(value) => updateInvite(invite.id, "status", value as AccessInvite["status"])} />
                </div>
                <p className="mt-3 text-xs text-crown-mist">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/?view=activate&invite=${invite.id}`)} className="h-8 rounded-lg border border-crown-gold/30 px-3 text-xs text-crown-champagne">
                    Copy Link
                  </button>
                  <button onClick={() => setInviteRows((current) => current.filter((item) => item.id !== invite.id))} className="h-8 rounded-lg border border-crown-rose/30 px-3 text-xs text-crown-rose">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BentoTile>
    </Grid>
  );
}

function LocationPricingPanel({ rules }: { rules: LocationPricingRule[] }) {
  const [pricingRules, setPricingRules] = useState<LocationPricingRule[]>(() => rules.map(applyConvertedPrices));
  const [draft, setDraft] = useState<LocationPricingRule>({
    id: "custom-usd",
    countryCode: "US",
    currency: "USD",
    ignitePrice: 29,
    ascentPrice: 59,
    empirePrice: 99,
    taxMode: "stripe_tax",
    enabled: true
  });
  const [conversionRate, setConversionRate] = useState(1);
  const activeRules = pricingRules.filter((rule) => rule.enabled).length;

  const updateDraft = <Key extends keyof LocationPricingRule>(
    key: Key,
    value: LocationPricingRule[Key]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const addRule = () => {
    const countryCode = draft.countryCode.trim().toUpperCase();
    const currency = draft.currency.trim().toUpperCase();

    if (!countryCode || !currency) {
      return;
    }

    const nextRule: LocationPricingRule = {
      ...draft,
      id: `${countryCode.toLowerCase()}-${currency.toLowerCase()}`,
      countryCode,
      currency,
      ignitePrice: Number(draft.ignitePrice),
      ascentPrice: Number(draft.ascentPrice),
      empirePrice: Number(draft.empirePrice)
    };

    setPricingRules((current) => [
      nextRule,
      ...current.filter((rule) => rule.id !== nextRule.id)
    ]);
    setDraft((current) => ({ ...current, countryCode: "", id: "custom-usd" }));
  };

  const updateRule = <Key extends keyof LocationPricingRule>(
    id: string,
    key: Key,
    value: LocationPricingRule[Key]
  ) => {
    setPricingRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, [key]: value } : rule))
    );
  };

  const convertDraftFromUsd = () => {
    setDraft((current) => ({
      ...current,
      ...pricesFromUsdRate(conversionRate)
    }));
  };

  const convertAllKnownCurrencies = () => {
    setPricingRules((current) => current.map(applyConvertedPrices));
  };

  return (
    <Grid>
      <BentoTile title="Location-Based Pricing" eyebrow="Stripe Tax Ready" className="md:col-span-4 lg:col-span-6">
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <Metric icon={<Globe2 />} label="Supported regions" value={`${pricingRules.length}+`} compact />
          <Metric icon={<CreditCard />} label="Active checkout rules" value={String(activeRules)} compact />
          <Metric icon={<ShieldCheck />} label="Tax mode" value="Stripe" compact />
        </div>

        <div className="mb-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="rounded-lg border border-white/10 bg-crown-navy p-4">
              <p className="text-sm font-semibold text-white">USD base pricing</p>
              <p className="mt-2 text-sm text-crown-champagne">
                Basic USD {baseUsdPrices.ignitePrice} · Growth USD {baseUsdPrices.ascentPrice} · Pro USD {baseUsdPrices.empirePrice}
              </p>
              <p className="mt-1 text-xs leading-5 text-crown-mist">
                Stripe remains the billing source of truth. Use this module to prepare regional display rules from the USD base.
              </p>
            </div>
            <PricingInput
              label="Conversion rate"
              type="number"
              value={String(conversionRate)}
              onChange={(value) => setConversionRate(Number(value))}
            />
            <div className="flex flex-col justify-end gap-2">
              <button
                type="button"
                onClick={convertDraftFromUsd}
                className="h-10 rounded-lg border border-crown-gold/30 px-4 text-sm font-semibold text-crown-gold transition hover:bg-crown-gold/10"
              >
                Convert Draft
              </button>
              <button
                type="button"
                onClick={convertAllKnownCurrencies}
                className="h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
              >
                Recalculate Known
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-white">Add another country</p>
              <p className="mt-1 text-sm text-crown-champagne">
                Create regional price rules for Stripe checkout, tax collection, and localized sales-page pricing.
              </p>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
            >
              <Plus size={16} />
              Add Rule
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
            <PricingInput
              label="Country"
              value={draft.countryCode}
              placeholder="AE"
              onChange={(value) => updateDraft("countryCode", value.toUpperCase().slice(0, 2))}
            />
            <PricingInput
              label="Currency"
              value={draft.currency}
              placeholder="AED"
              onChange={(value) => {
                const currency = value.toUpperCase().slice(0, 3);
                updateDraft("currency", currency);
                setConversionRate(usdConversionRates[currency] ?? conversionRate);
              }}
            />
            <PricingInput
              label="Basic"
              type="number"
              value={String(draft.ignitePrice)}
              onChange={(value) => updateDraft("ignitePrice", Number(value))}
            />
            <PricingInput
              label="Growth"
              type="number"
              value={String(draft.ascentPrice)}
              onChange={(value) => updateDraft("ascentPrice", Number(value))}
            />
            <PricingInput
              label="Pro"
              type="number"
              value={String(draft.empirePrice)}
              onChange={(value) => updateDraft("empirePrice", Number(value))}
            />
            <label className="block">
              <span className="mb-2 block text-sm text-crown-champagne">Tax mode</span>
              <select
                value={draft.taxMode}
                onChange={(event) =>
                  updateDraft("taxMode", event.target.value as LocationPricingRule["taxMode"])
                }
                className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              >
                <option value="stripe_tax">Stripe Tax</option>
                <option value="inclusive">Inclusive</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="flex h-full min-h-16 items-end gap-3 rounded-lg border border-white/10 bg-crown-navy px-3 py-3 text-sm text-crown-champagne">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => updateDraft("enabled", event.target.checked)}
                className="h-4 w-4 accent-crown-gold"
              />
              Enabled
            </label>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {pricingRules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Globe2 className="text-crown-gold" />
                  <div>
                    <p className="font-semibold text-white">{rule.countryCode}</p>
                    <p className="text-sm text-crown-mist">{rule.currency} · {rule.taxMode.replace("_", " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    rule.enabled ? "bg-crown-emerald/15 text-crown-emerald" : "bg-crown-rose/15 text-crown-rose"
                  }`}>
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateRule(rule.id, "enabled", event.target.checked)}
                      className="sr-only"
                    />
                    {rule.enabled ? "Live" : "Off"}
                  </label>
                  <IconButton
                    label={`Delete ${rule.countryCode} pricing`}
                    onClick={() => setPricingRules((current) => current.filter((item) => item.id !== rule.id))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <EditablePrice label="Basic" value={rule.ignitePrice} onChange={(value) => updateRule(rule.id, "ignitePrice", value)} />
                <EditablePrice label="Growth" value={rule.ascentPrice} onChange={(value) => updateRule(rule.id, "ascentPrice", value)} />
                <EditablePrice label="Pro" value={rule.empirePrice} onChange={(value) => updateRule(rule.id, "empirePrice", value)} />
              </div>
            </div>
          ))}
        </div>
      </BentoTile>
    </Grid>
  );
}

function PricingInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-champagne">{label}</span>
      <input
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
      />
    </label>
  );
}

function AccessSelect({
  label,
  value,
  options,
  labels,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-champagne">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-white/10 bg-crown-navy px-3 text-sm capitalize text-white outline-none ring-crown-gold/30 focus:ring-4"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option.replace("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function SmallSelect({
  value,
  options,
  labels,
  onChange
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-lg border border-white/10 bg-crown-navy px-2 text-xs capitalize text-white outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

function EditablePrice({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-lg bg-white/[0.045] p-3">
      <span className="text-xs text-crown-mist">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full bg-transparent font-semibold text-white outline-none"
      />
    </label>
  );
}

function NotificationsPanel({ rules }: { rules: NotificationRule[] }) {
  return (
    <Grid>
      <BentoTile title="Push + Email Notifications" eyebrow="Lifecycle Automation" className="md:col-span-4 lg:col-span-6">
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {rule.channel === "email" ? <Mail className="text-crown-gold" /> : <Bell className="text-crown-gold" />}
                  <p className="font-semibold text-white">{rule.subject}</p>
                </div>
                <input type="checkbox" defaultChecked={rule.enabled} className="h-4 w-4 accent-crown-gold" />
              </div>
              <p className="text-sm capitalize text-crown-mist">
                {rule.trigger.replaceAll("_", " ")} · {rule.channel} · {rule.audience.replace("_", " ")}
              </p>
            </div>
          ))}
        </div>
      </BentoTile>
    </Grid>
  );
}

function SettingsPanel({ settings }: { settings: SystemSetting[] }) {
  return (
    <Grid>
      <BentoTile title="System Settings" eyebrow="Configuration" className="md:col-span-4 lg:col-span-6">
        <div className="grid gap-3 md:grid-cols-3">
          {settings.map((setting) => (
            <label key={setting.key} className="rounded-lg border border-white/10 bg-crown-ink p-4">
              <span className="block text-sm text-crown-mist">{setting.label}</span>
              <input
                defaultValue={setting.value}
                className="mt-3 w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              />
              <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-crown-gold">
                {setting.scope}
              </span>
            </label>
          ))}
        </div>
      </BentoTile>
    </Grid>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-6">{children}</div>;
}

function Metric({
  icon,
  label,
  value,
  compact = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 ${compact ? "rounded-lg border border-white/10 bg-crown-ink p-4" : ""}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
        {icon}
      </div>
      <div>
        <p className="text-sm text-crown-mist">{label}</p>
        <p className="text-3xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  textarea = false,
  placeholder
}: {
  label: string;
  value: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  const className =
    "w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4";
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-mist">{label}</span>
      {textarea ? (
        <textarea defaultValue={value} placeholder={placeholder} className={`${className} min-h-28 resize-none`} />
      ) : (
        <input defaultValue={value} placeholder={placeholder} className={className} />
      )}
    </label>
  );
}

function Status({ label, active, value }: { label: string; active: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.045] px-3 py-2">
      <span className="text-crown-mist">{label}</span>
      <span className={active ? "text-crown-emerald" : "text-crown-rose"}>{value ?? (active ? "On" : "Off")}</span>
    </div>
  );
}
