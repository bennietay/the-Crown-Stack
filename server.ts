import crypto from "crypto";
import path from "path";
import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { calculateLeadScore, leadCaptureSchema } from "./src/lib/businessLogic";
import { authenticateUser, AuthenticatedRequest, logAuditEvent, requireRole, requireWorkspace } from "./src/server/authMiddleware";
import { createSupabaseRequestClient, supabaseServer, supabaseServerUrl, supabaseWorkspaceId } from "./src/server/supabase";

const isProduction = process.env.NODE_ENV === "production";
const appMode = process.env.APP_MODE || (isProduction ? "" : "demo");

if (!['live', 'demo'].includes(appMode)) throw new Error("APP_MODE must be either live or demo.");
if (isProduction && appMode !== "live") throw new Error("Production startup refused: APP_MODE=live is required.");

const supabaseReady = Boolean(supabaseServer);
const publicProposalFunctionUrl = `${supabaseServerUrl}/functions/v1/public-proposal`;

const developmentLeads: any[] = [];
const developmentSettings: Record<string, any> = {};

const getDefaultSettings = (workspaceId: string) => ({
  workspaceId,
  business: {
    name: "Bennie Studio",
    currency: "MYR",
    locale: "en-MY",
    timezone: "Asia/Kuala_Lumpur",
    leadSlaHours: 4,
    monthlyTarget: 15000,
  },
  sales: {
    taxRate: 9,
    proposalValidityDays: 14,
    hotThreshold: 70,
    warmThreshold: 40,
    defaultOwner: "usr-bennie",
  },
  leadCapture: {
    eyebrow: "Websites that turn attention into enquiries",
    headline: "Get a clearer website plan, price and next step.",
    subheadline: "Tell us what you need. Bennie will review it personally and recommend the fastest practical path to launch or improve your website.",
    offerTitle: "Request your free project review",
    benefitBullets: ["A practical scope matched to your budget", "Clear one-off and monthly options", "No-obligation WhatsApp follow-up"],
    responsePromise: "Personal reply within 4 business hours",
    trustNote: "Your details stay private and are used only to respond to this enquiry.",
    ctaLabel: "Get my project review",
    successMessage: "Your request is safely recorded. Bennie will review it and contact you with the clearest next step.",
    serviceOptions: ["Launch Website", "Growth Website + SEO", "Care Plan", "Custom Application"],
    budgetRanges: ["RM1,500 - RM3,000", "RM3,000 - RM6,000", "RM6,000 - RM12,000", "RM12,000+"],
    timingOptions: ["ASAP", "Within 2 weeks", "Within 1 month", "1–3 months", "Just exploring"],
    whatsappUrl: process.env.PUBLIC_WHATSAPP_URL || "",
    bookingUrl: process.env.PUBLIC_BOOKING_URL || "",
    privacyUrl: process.env.PUBLIC_PRIVACY_URL || "",
    termsUrl: process.env.PUBLIC_TERMS_URL || "",
    requireCompany: false,
    requirePhone: true,
    requireCountry: false,
  },
  cadence: [
    { day: 1, channel: "email", title: "Send introduction and discovery form" },
    { day: 3, channel: "whatsapp", title: "Follow up on project review" },
    { day: 5, channel: "call", title: "Schedule discovery call" },
  ],
  integrations: {
    supabaseConfigured: supabaseReady,
    whatsappConfigured: false,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
});

const mergeSettings = (base: any, stored: any = {}) => ({
  ...base,
  ...stored,
  business: { ...base.business, ...(stored.business || {}) },
  sales: { ...base.sales, ...(stored.sales || {}) },
  leadCapture: { ...base.leadCapture, ...(stored.leadCapture || {}) },
  integrations: { ...base.integrations, ...(stored.integrations || {}) },
});

const optionalUrl = z.union([z.literal(""), z.string().url().max(500)]);
const settingsSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2).max(100),
    currency: z.string().trim().regex(/^[A-Z]{3}$/),
    locale: z.string().trim().min(2).max(20),
    timezone: z.string().trim().min(3).max(100),
    whatsappNumber: z.string().trim().max(40).optional(),
    leadSlaHours: z.number().int().min(1).max(168),
    monthlyTarget: z.number().min(0).max(100000000),
  }),
  sales: z.object({
    taxRate: z.number().min(0).max(100),
    proposalValidityDays: z.number().int().min(1).max(365),
    hotThreshold: z.number().int().min(1).max(100),
    warmThreshold: z.number().int().min(0).max(99),
    defaultOwner: z.string().trim().max(128).optional(),
  }).refine(value => value.hotThreshold > value.warmThreshold, { message: "Hot threshold must be higher than warm threshold" }),
  leadCapture: z.object({
    eyebrow: z.string().trim().max(100).optional(),
    headline: z.string().trim().min(5).max(180),
    subheadline: z.string().trim().min(10).max(500),
    offerTitle: z.string().trim().max(140).optional(),
    benefitBullets: z.array(z.string().trim().min(2).max(160)).min(1).max(6).optional(),
    responsePromise: z.string().trim().max(120).optional(),
    trustNote: z.string().trim().max(300).optional(),
    ctaLabel: z.string().trim().max(80).optional(),
    successMessage: z.string().trim().min(5).max(500),
    serviceOptions: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    budgetRanges: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    timingOptions: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
    whatsappUrl: optionalUrl.optional(),
    bookingUrl: optionalUrl.optional(),
    privacyUrl: optionalUrl.optional(),
    termsUrl: optionalUrl.optional(),
    requireCompany: z.boolean().optional(),
    requirePhone: z.boolean().optional(),
    requireCountry: z.boolean().optional(),
  }),
  cadence: z.array(z.object({
    day: z.number().int().min(0).max(365),
    channel: z.enum(["email", "whatsapp", "call", "manual"]),
    title: z.string().trim().min(2).max(160),
  })).max(20),
});

async function readSettings(workspaceId: string) {
  let settings = mergeSettings(getDefaultSettings(workspaceId), developmentSettings[workspaceId]);
  const { data, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "settings", record_id: workspaceId, is_soft_deleted: false }).maybeSingle();
  if (!error && data?.data) settings = mergeSettings(settings, data.data);
  return settings;
}

const app = express();
const port = Number(process.env.PORT || 3000);

app.set("trust proxy", 1);
app.use((req: AuthenticatedRequest, res, next) => {
  req.requestId = String(req.headers["x-request-id"] || crypto.randomUUID());
  res.setHeader("X-Request-ID", req.requestId);
  next();
});
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "wss://*.firebaseio.com", "https://*.supabase.co", "wss://*.supabase.co"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: false,
  frameguard: isProduction ? { action: "deny" } : false,
}));

const rateKey = (req: express.Request) => ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 120, keyGenerator: rateKey, message: { error: "Too many requests. Please try again later." } }));
const captureLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyGenerator: rateKey, message: { error: "Too many enquiry attempts. Please try again later." } });
const acceptanceLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: rateKey, message: { error: "Too many acceptance attempts. Please try again later." } });

app.use(express.json({ limit: "256kb" }));

app.get("/healthz", (_req, res) => res.status(200).json({ status: "alive", timestamp: new Date().toISOString() }));
app.get("/readyz", (_req, res) => {
  const ready = supabaseReady && (!isProduction || appMode === "live");
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
});

app.post("/api/bootstrap", authenticateUser, async (req: AuthenticatedRequest, res) => {
  const allowedEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const email = req.user?.email?.trim().toLowerCase();
  if (!allowedEmail || !email || email !== allowedEmail) {
    return res.status(403).json({ error: "This account has not been invited." });
  }

  if (!req.user) return res.status(503).json({ error: "Account provisioning is temporarily unavailable." });
  const token = String(req.headers.authorization).slice("Bearer ".length);
  const client = createSupabaseRequestClient(token);
  const now = new Date().toISOString();
  const { error: profileError } = await client.from("bos_profiles").upsert({ id: req.user.uid, email, display_name: email.split("@")[0], updated_at: now }, { onConflict: "id" });
  const { error: workspaceError } = await client.from("bos_workspaces").upsert({ id: supabaseWorkspaceId, owner_id: req.user.uid, name: "Bennie Studio", settings: { dailyTarget: 30, marketAllocation: { MY: 10, SG: 10, UK: 10 } }, updated_at: now }, { onConflict: "id" });
  const { error: memberError } = await client.from("bos_workspace_members").upsert({ workspace_id: supabaseWorkspaceId, user_id: req.user.uid, role: "workspace_admin", status: "active", updated_at: now }, { onConflict: "workspace_id,user_id" });
  if (profileError || workspaceError || memberError) return res.status(503).json({ error: "Account provisioning is temporarily unavailable." });
  await logAuditEvent({
    workspaceId: supabaseWorkspaceId,
    userId: req.user.uid,
    userEmail: email,
    action: "bootstrap_admin",
    resourceType: "users",
    resourceId: req.user.uid,
    after: { email, role: "workspace_admin" },
    ip: req.ip,
    requestId: req.requestId,
  });
  return res.status(201).json({ status: "provisioned" });
});

app.post("/api/capture", captureLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const validated = leadCaptureSchema.parse(req.body);
    const workspaceId = supabaseWorkspaceId;
    const settings = await readSettings(workspaceId);
    if (!supabaseReady) return res.status(503).json({ error: "Lead capture is temporarily unavailable" });

    if (!settings.leadCapture.serviceOptions.includes(validated.service)) {
      return res.status(400).json({ error: "Validation failed", details: [{ path: ["service"], message: "Choose a valid service" }] });
    }
    if (!settings.leadCapture.budgetRanges.includes(validated.budget)) {
      return res.status(400).json({ error: "Validation failed", details: [{ path: ["budget"], message: "Choose a valid budget" }] });
    }
    if (!settings.leadCapture.timingOptions.includes(validated.timing)) {
      return res.status(400).json({ error: "Validation failed", details: [{ path: ["timing"], message: "Choose a valid timing" }] });
    }

    const requiredIssues = [
      settings.leadCapture.requireCompany && validated.company.trim().length < 2 ? { path: ["company"], message: "Enter your company name" } : null,
      settings.leadCapture.requirePhone !== false && validated.phone.replace(/\D/g, "").length < 8 ? { path: ["phone"], message: "Enter a valid WhatsApp or phone number" } : null,
      settings.leadCapture.requireCountry && validated.country.trim().length < 2 ? { path: ["country"], message: "Enter your country" } : null,
    ].filter(Boolean);
    if (requiredIssues.length) return res.status(400).json({ error: "Validation failed", details: requiredIssues });

    const score = calculateLeadScore(validated);
    const temperature = score >= settings.sales.hotThreshold ? "hot" : score >= settings.sales.warmThreshold ? "warm" : "cold";
    const now = new Date().toISOString();
    const lead = {
      id: `l-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      workspaceId,
      contactName: validated.name.trim(),
      companyName: validated.company.trim(),
      email: validated.email.toLowerCase().trim(),
      phone: validated.phone.trim(),
      country: validated.country.trim(),
      status: "new",
      temperature,
      score,
      assignedTo: settings.sales.defaultOwner || undefined,
      details: {
        website: validated.website || "",
        service: validated.service,
        budget: validated.budget,
        timing: validated.timing,
        message: validated.message || "",
        source: validated.source || "",
        utm_source: validated.utm_source || "",
        utm_medium: validated.utm_medium || "",
        utm_campaign: validated.utm_campaign || "",
        utm_term: validated.utm_term || "",
        utm_content: validated.utm_content || "",
      },
      createdAt: now,
      updatedAt: now,
    };
    const records = [{ workspace_id: workspaceId, collection_name: "leads", record_id: lead.id, data: lead, is_soft_deleted: false, updated_at: now }];
    const { error: leadWriteError } = await supabaseServer.from("bos_records").upsert(records, { onConflict: "workspace_id,collection_name,record_id" });
    if (leadWriteError) return res.status(503).json({ error: "Lead capture is temporarily unavailable" });

    await logAuditEvent({ workspaceId, userId: "public_lead_form", userEmail: lead.email, action: "lead_captured", resourceType: "lead", resourceId: lead.id, after: { score, temperature, service: validated.service }, requestId: req.requestId });
    return res.status(201).json({ success: true, id: lead.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: error.issues });
    console.error("Lead capture failed", error);
    return res.status(500).json({ error: "Lead capture failed" });
  }
});

app.get("/api/settings/:workspaceId/public", async (req, res) => {
  if (req.params.workspaceId !== supabaseWorkspaceId) return res.status(404).json({ error: "Workspace not found" });
  try {
    const settings = await readSettings("ws-bennie");
    return res.json({
      business: { name: settings.business.name },
      leadCapture: {
        ...settings.leadCapture,
        whatsappUrl: process.env.PUBLIC_WHATSAPP_URL || settings.leadCapture.whatsappUrl || "",
        bookingUrl: process.env.PUBLIC_BOOKING_URL || settings.leadCapture.bookingUrl || "",
        privacyUrl: process.env.PUBLIC_PRIVACY_URL || settings.leadCapture.privacyUrl || "",
        termsUrl: process.env.PUBLIC_TERMS_URL || settings.leadCapture.termsUrl || "",
      },
    });
  } catch (error) {
    console.error("Public settings read failed", error);
    return res.status(503).json({ error: "Enquiry form is temporarily unavailable" });
  }
});

app.get("/api/settings/:workspaceId", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await readSettings(req.workspaceId!);
    settings.integrations = {
      supabaseConfigured: supabaseReady,
      whatsappConfigured: !!process.env.PUBLIC_WHATSAPP_URL,
      lastVerified: new Date().toISOString(),
    };
    return res.json(settings);
  } catch (error) {
    console.error("Protected settings read failed", error);
    return res.status(500).json({ error: "Settings could not be loaded" });
  }
});

app.put("/api/settings/:workspaceId", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.workspaceId!;
    const parsed = settingsSchema.parse(req.body);
    const updates = mergeSettings(getDefaultSettings(workspaceId), parsed);
    updates.workspaceId = workspaceId;
    updates.updatedAt = new Date().toISOString();
    updates.updatedBy = req.user!.uid;
    updates.integrations = {};
    const { error } = await supabaseServer.from("bos_records").upsert({ workspace_id: workspaceId, collection_name: "settings", record_id: workspaceId, data: updates, is_soft_deleted: false, updated_at: updates.updatedAt }, { onConflict: "workspace_id,collection_name,record_id" });
    if (error) return res.status(503).json({ error: "Settings storage is unavailable" });
    await logAuditEvent({ workspaceId, userId: req.user!.uid, userEmail: req.user!.email, action: "settings_updated", resourceType: "systemSettings", resourceId: workspaceId, requestId: req.requestId });
    return res.json({ success: true, settings: updates });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid settings", details: error.issues });
    console.error("Settings update failed", error);
    return res.status(500).json({ error: "Settings could not be saved" });
  }
});

app.get("/api/proposals/public/:token", async (req, res) => {
  try {
    const edgeResponse = await fetch(`${publicProposalFunctionUrl}?token=${encodeURIComponent(req.params.token)}`);
    return res.status(edgeResponse.status).json(await edgeResponse.json());
    /* Legacy implementation retained below for rollback reference. */
    /* istanbul ignore next */
    const { data: rows, error } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "proposals").eq("is_soft_deleted", false);
    if (error) throw error;
    const row = (rows || []).find(item => item.data?.token === req.params.token);
    if (!row) return res.status(404).json({ error: "Proposal not found or no longer available" });
    const proposal = row.data as any;
    if (!['sent', 'accepted'].includes(String(proposal.status).toLowerCase())) return res.status(404).json({ error: "Proposal not found or no longer available" });
    if (proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: "This proposal has expired" });

    const productIds = Array.from(new Set((proposal.items || []).map((item: any) => item.productId).filter(Boolean))) as string[];
    const { data: productRows } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "products").in("record_id", productIds);
    const products = productIds.map(id => { const product = (productRows || []).find(item => item.record_id === id); return product ? { id, ...(product.data as any) } : { id, name: "Custom service" }; });
    const now = new Date().toISOString();
    const viewedProposal = { ...proposal, viewsCount: Number(proposal.viewsCount || 0) + 1, firstViewedAt: proposal.firstViewedAt || now, lastViewedAt: now };
    await supabaseServer.from("bos_records").update({ data: viewedProposal, updated_at: now }).match({ workspace_id: supabaseWorkspaceId, collection_name: "proposals", record_id: row.record_id });
    return res.json({ success: true, proposal: { id: row.record_id, ...viewedProposal }, products });
  } catch (error) {
    console.error("Proposal read failed", error);
    return res.status(500).json({ error: "Failed to load proposal" });
  }
});

const acceptanceSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().email().max(200),
  customerTitle: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(160),
  confirmedCheckboxes: z.object({ reviewedScope: z.literal(true), acceptCommercialTerms: z.literal(true), hasAuthority: z.literal(true), agreeTermsAndPolicies: z.literal(true) }),
});

app.post("/api/proposals/public/:token/accept", acceptanceLimiter, async (req, res) => {
  try {
    const edgeResponse = await fetch(`${publicProposalFunctionUrl}?token=${encodeURIComponent(req.params.token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req.body) });
    return res.status(edgeResponse.status).json(await edgeResponse.json());
    /* Legacy implementation retained below for rollback reference. */
    /* istanbul ignore next */
    const acceptance = acceptanceSchema.parse(req.body);
    const { data: rows, error } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "proposals").eq("is_soft_deleted", false);
    if (error) throw error;
    const proposalRow = (rows || []).find(item => item.data?.token === req.params.token);
    if (!proposalRow) return res.status(404).json({ error: "Proposal not found or no longer available" });
    const proposal = proposalRow.data as any;
    if (String(proposal.status).toLowerCase() !== "sent") return res.status(409).json({ error: "This proposal is not awaiting acceptance" });
    if (proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: "This proposal has expired" });

    const acceptedAt = new Date().toISOString();
    const userAgent = String(req.headers["user-agent"] || "");
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "");
    const evidence = JSON.stringify({ proposalId: proposalRow.record_id, ...acceptance, acceptedAt, userAgent, ip });
    const acceptanceId = `accept-${crypto.randomUUID()}`;
    const acceptanceRecord = {
      id: acceptanceId,
      proposalId: proposalRow.record_id,
      proposalVersion: proposal.version || 1,
      ...acceptance,
      acceptedAt,
      termsVersion: "v2026.1",
      userAgent,
      ipHash: crypto.createHash("sha256").update(ip).digest("hex"),
      acceptanceEvidenceHash: crypto.createHash("sha256").update(evidence).digest("hex"),
    };
    const { error: acceptanceError } = await supabaseServer.from("bos_records").upsert([
      { workspace_id: supabaseWorkspaceId, collection_name: "proposal_acceptances", record_id: acceptanceId, data: acceptanceRecord, is_soft_deleted: false, updated_at: acceptedAt },
      { workspace_id: supabaseWorkspaceId, collection_name: "proposals", record_id: proposalRow.record_id, data: { ...proposal, status: "accepted", decisionDate: acceptedAt, updatedAt: acceptedAt }, is_soft_deleted: false, updated_at: acceptedAt },
    ], { onConflict: "workspace_id,collection_name,record_id" });
    if (acceptanceError) throw acceptanceError;
    return res.json({ success: true, acceptanceRecord });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Complete all signatory details and confirmations" });
    if (error.message === "Proposal is no longer awaiting acceptance") return res.status(409).json({ error: error.message });
    console.error("Proposal acceptance failed", error);
    return res.status(500).json({ error: "Acceptance could not be recorded" });
  }
});

app.all("/api/*", (_req, res) => res.status(404).json({ error: "API endpoint not found" }));

if (isProduction) {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

async function startLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  app.listen(port, "0.0.0.0", () => console.log(`Server running on http://localhost:${port}`));
}

if (process.env.VERCEL !== "1") startLocalServer();

export default app;
