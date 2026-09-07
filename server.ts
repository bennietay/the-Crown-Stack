import crypto from "crypto";
import path from "path";
import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import Stripe from "stripe";
import { calculateLeadScore, leadCaptureSchema } from "./src/lib/businessLogic";
import { authenticateUser, AuthenticatedRequest, logAuditEvent, requireRole, requireWorkspace } from "./src/server/authMiddleware";
import { createSupabaseRequestClient, hasSupabaseServiceRole, supabaseServer, supabaseServerUrl, supabaseWorkspaceId } from "./src/server/supabase";
import { decryptCredential, encryptCredential, EncryptedPayload } from "./src/server/credentialCrypto";
import { revenueByBusiness, summarizeRevenue } from "./src/lib/revenue";
import { getHostingProvider, getHostingProviderKind } from "./src/server/hostingerProvider";
import { WAAS_DEPLOYMENT_STEPS } from "./src/server/waasDeploymentEngine";

const isProduction = process.env.NODE_ENV === "production";
const appMode = process.env.APP_MODE || (isProduction ? "" : "demo");

if (!['live', 'demo'].includes(appMode)) throw new Error("APP_MODE must be either live or demo.");
if (isProduction && appMode !== "live") throw new Error("Production startup refused: APP_MODE=live is required.");

const supabaseReady = hasSupabaseServiceRole;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const publicProposalFunctionUrl = `${supabaseServerUrl}/functions/v1/public-proposal`;

const integrationStatus = () => ({
  supabaseConfigured: supabaseReady,
  hostingerConfigured: Boolean(process.env.HOSTINGER_API_TOKEN && process.env.HOSTINGER_ORDER_ID && process.env.HOSTINGER_USERNAME),
  waasIngestConfigured: Boolean(process.env.WAAS_INGEST_API_KEY && process.env.WAAS_CONNECTOR_INGEST_SECRET),
  waasDeploymentConfigured: Boolean(process.env.HOSTINGER_API_TOKEN && process.env.HOSTINGER_ORDER_ID && process.env.HOSTINGER_USERNAME && (process.env.HOSTINGER_WP_ADMIN_EMAIL || process.env.EMAIL_FROM) && process.env.CREDENTIAL_ENCRYPTION_KEY && process.env.WAAS_CONNECTOR_INGEST_SECRET),
  whatsappConfigured: Boolean(process.env.PUBLIC_WHATSAPP_URL || (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)),
  whatsappApiConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  // Vercel preserves variable names exactly; accept the lowercase name that was
  // already added so a secret does not need to be copied or exposed again.
  paymentsConfigured: Boolean(process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_WEBHOOK_SECRET || process.env.stripe_webhook_secret)),
  emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  affiliateApiConfigured: Boolean(process.env.AFFILIATE_INGEST_API_KEY),
  etsyConfigured: Boolean(process.env.ETSY_API_KEY && process.env.ETSY_SHARED_SECRET && process.env.ETSY_REDIRECT_URI && process.env.CREDENTIAL_ENCRYPTION_KEY),
  printifyConfigured: Boolean(process.env.PRINTIFY_API_TOKEN),
  aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  lastVerified: new Date().toISOString(),
});

const integrationEncryptionSecret = () => process.env.CREDENTIAL_ENCRYPTION_KEY || "";
const waasAssetBucket = () => process.env.WAAS_ASSET_BUCKET || "waas-assets";
const etsyApiHeader = () => `${process.env.ETSY_API_KEY || ""}:${process.env.ETSY_SHARED_SECRET || ""}`;
const etsyScopes = ["listings_r", "listings_w", "shops_r", "transactions_r"];
const safeAppRedirect = (query: string) => `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/businesses?${query}`;

async function readEncryptedIntegration<T>(workspaceId: string, recordId: string): Promise<T | null> {
  const { data, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "integration_secrets", record_id: recordId, is_soft_deleted: false }).maybeSingle();
  if (error) throw error;
  if (!data?.data?.encrypted) return null;
  return decryptCredential<T>(data.data.encrypted as EncryptedPayload, integrationEncryptionSecret());
}

async function writeEncryptedIntegration(workspaceId: string, recordId: string, value: unknown, publicMetadata: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();
  const encrypted = encryptCredential(value, integrationEncryptionSecret());
  const { error } = await supabaseServer.from("bos_records").upsert({ workspace_id: workspaceId, collection_name: "integration_secrets", record_id: recordId, data: { ...publicMetadata, encrypted, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp }, { onConflict: "workspace_id,collection_name,record_id" });
  if (error) throw error;
}

type EtsyToken = { access_token: string; refresh_token: string; expires_at: string; scope: string; shop_id?: number; shop_name?: string; last_sync_at?: string };
async function etsyToken(workspaceId: string): Promise<EtsyToken> {
  let token = await readEncryptedIntegration<EtsyToken>(workspaceId, "etsy");
  if (!token) throw new Error("Etsy is not connected");
  if (new Date(token.expires_at).getTime() > Date.now() + 120_000) return token;
  const response = await fetch("https://api.etsy.com/v3/public/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.ETSY_API_KEY || "", refresh_token: token.refresh_token }) });
  const result = await response.json() as any;
  if (!response.ok) throw new Error(result?.error_description || "Etsy token refresh failed");
  token = { ...token, access_token: result.access_token, refresh_token: result.refresh_token || token.refresh_token, expires_at: new Date(Date.now() + Number(result.expires_in || 3600) * 1000).toISOString(), scope: result.scope || token.scope };
  await writeEncryptedIntegration(workspaceId, "etsy", token, { provider: "etsy", connected: true, scopes: token.scope.split(" "), shopId: token.shop_id, shopName: token.shop_name, lastSyncAt: token.last_sync_at });
  return token;
}

async function etsyRequest(token: EtsyToken, pathname: string) {
  const response = await fetch(`https://api.etsy.com/v3/application${pathname}`, { headers: { "x-api-key": etsyApiHeader(), Authorization: `Bearer ${token.access_token}` } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as any)?.error || `Etsy request failed (${response.status})`);
  return result as any;
}

async function printifyRequest(pathname: string) {
  const response = await fetch(`https://api.printify.com/v1${pathname}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN || ""}`,
      "User-Agent": "Bennie-Revenue-OS/1.0 (admin.bennietay.com)",
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as any)?.message || `Printify request failed (${response.status})`);
  return result as any;
}

const outreachSecret = () => process.env.OUTREACH_TOKEN_SECRET || process.env.SESSION_SECRET || "development-outreach-secret";
const outreachToken = (lead: { id: string; email: string }) => crypto.createHmac("sha256", outreachSecret()).update(`${lead.id}:${lead.email.toLowerCase()}`).digest("hex");
const outreachTokenValid = (lead: { id: string; email: string }, token: string) => {
  const expected = Buffer.from(outreachToken(lead));
  const provided = Buffer.from(token);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
};
const templateValue = (value: string, lead: any, settings: any) => value
  .replaceAll("{{name}}", lead.contactName || "there")
  .replaceAll("{{company}}", lead.companyName || "your business")
  .replaceAll("{{business}}", settings.business.name || "Bennie Studio")
  .replaceAll("{{bookingUrl}}", settings.leadCapture.bookingUrl || "");

const privateHost = (hostname: string) => {
  const value = hostname.toLowerCase().replace(/\.$/, "");
  if (!value || value === "localhost" || value.endsWith(".local") || value === "::1") return true;
  const parts = value.split(".").map(Number);
  if (parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return parts[0] === 10 || parts[0] === 127 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
  }
  return false;
};

async function auditWebsite(rawUrl: string, redirectDepth = 0) {
  let url: URL;
  try { url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`); } catch { return { status: "review_required", reason: "Invalid website URL" }; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || privateHost(url.hostname)) return { status: "review_required", reason: "Website URL is not a permitted public HTTP(S) address" };
  const started = Date.now(); const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url.toString(), { redirect: "manual", signal: controller.signal, headers: { "User-Agent": "Bennie-Website-Audit/1.0" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) return { status: "review_required", reason: "Website redirects without a destination" };
      if (redirectDepth >= 3) return { status: "review_required", reason: "Website redirects too many times" };
      return auditWebsite(new URL(location, url).toString(), redirectDepth + 1);
    }
    if (!response.ok) return { status: "review_required", url: url.toString(), reason: `Website returned HTTP ${response.status}`, httpStatus: response.status };
    const html = (await response.text()).slice(0, 700000);
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").trim();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
    const description = (html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)?.[1] || "").trim();
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html); const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html); const https = url.protocol === "https:";
    const findings = [!title && "Missing page title", !description && "Missing meta description", !h1 && "No clear H1 headline", !hasViewport && "Missing mobile viewport", !https && "Site is not using HTTPS"].filter(Boolean) as string[];
    const score = Math.max(0, 100 - findings.length * 15);
    return { status: "ready", url: url.toString(), httpStatus: response.status, responseMs: Date.now() - started, title, description, h1, wordCount: text.split(/\s+/).filter(Boolean).length, hasViewport, hasCanonical, https, score, findings, recommendations: findings.length ? findings : ["Look for a stronger conversion path and clearer enquiry CTA."] };
  } catch (error: any) { return { status: "review_required", url: url.toString(), reason: error?.name === "AbortError" ? "Website audit timed out" : "Website could not be reached" }; }
  finally { clearTimeout(timeout); }
}

const websiteInsight = (audit: any) => {
  if (audit.findings?.length) return `I noticed ${audit.findings.slice(0, 2).join(" and ").toLowerCase()}.`;
  return `The site currently presents “${audit.title || "a business website"}”; I also noticed an opportunity to make the enquiry path clearer.`;
};

async function createOutreachTasks(lead: any, settings: any) {
  const cadence = Array.isArray(settings.cadence) ? settings.cadence : [];
  if (!cadence.length) return;
  const base = new Date(lead.createdAt).getTime();
  const records = cadence.map((step: any, index: number) => {
    const dueDate = new Date(base + Number(step.day || 0) * 86400000).toISOString();
    const body = step.body || "";
    const id = `${lead.id}-outreach-${index}`;
    return { workspace_id: lead.workspaceId, collection_name: "tasks", record_id: id, data: {
      id, workspaceId: lead.workspaceId, leadId: lead.id, title: step.title, channel: step.channel, category: "revenue", dueDate,
      status: "pending", owner: lead.assignedTo || settings.sales.defaultOwner || "usr-bennie", contactName: lead.contactName, companyName: lead.companyName,
      reason: "Automated lead outreach cadence", recommendedAction: step.channel === "email" ? "Send the approved email template or run the email queue." : step.channel === "whatsapp" ? "Open the prefilled WhatsApp message manually." : "Complete this follow-up action.",
      notes: JSON.stringify({ subject: step.subject || step.title, body, sequenceIndex: index }), createdAt: lead.createdAt,
    }, is_soft_deleted: false, updated_at: new Date().toISOString() };
  });
  const { error } = await supabaseServer.from("bos_records").upsert(records, { onConflict: "workspace_id,collection_name,record_id" });
  if (error) throw error;
}

async function sendOutreachEmail(lead: any, task: any, settings: any, audit: any) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent: false, reason: "email_not_configured" };
  const metadata = typeof task.notes === "string" ? JSON.parse(task.notes) : (task.notes || {});
  const unsubscribe = `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/api/outreach/opt-out?token=${outreachToken(lead)}`;
  const customBody = metadata.sequenceIndex === 0 || !metadata.body?.trim() ? `Hi {{name}},\n\nI was reviewing {{company}}'s website and noticed an opportunity worth addressing: ${websiteInsight(audit)}\n\nI help businesses turn more website visits into qualified enquiries through clearer messaging, stronger trust signals and a simpler next step. I can send you a short, practical review with the highest-impact changes—no obligation.\n\nWould you like me to send it?\n\nBennie\n{{business}}` : metadata.body;
  const body = templateValue(customBody, lead, settings);
  const subject = metadata.sequenceIndex === 0 || !metadata.subject?.trim() ? `A quick website idea for ${lead.companyName || "your business"}` : metadata.subject;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [lead.email], subject: templateValue(subject, lead, settings), text: `${body}\n\nUnsubscribe from follow-ups: ${unsubscribe}` }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || "Email provider rejected the message");
  return { sent: true, providerMessageId: result?.id || null };
}

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
    { day: 1, channel: "email", title: "Send introduction and discovery form", subject: "Thanks for reaching out, {{name}}", body: "Hi {{name}},\n\nThanks for reaching out to {{business}}. I have reviewed your enquiry and will recommend the fastest practical next step.\n\nYou can book a quick call here: {{bookingUrl}}" },
    { day: 3, channel: "whatsapp", title: "Follow up on project review" },
    { day: 5, channel: "call", title: "Schedule discovery call" },
    { day: 7, channel: "email", title: "Send case studies and testimonials", subject: "A few ideas for {{company}}", body: "Hi {{name}},\n\nSharing a few relevant examples and ideas for {{company}}. If you would like to move forward, reply to this email or book a time here: {{bookingUrl}}" },
  ],
  integrations: {
    ...integrationStatus(),
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
    subject: z.string().trim().max(200).optional(),
    body: z.string().trim().max(5000).optional(),
  })).max(20),
});

async function readSettings(workspaceId: string) {
  let settings = mergeSettings(getDefaultSettings(workspaceId), developmentSettings[workspaceId]);
  const { data, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "settings", record_id: workspaceId, is_soft_deleted: false }).maybeSingle();
  if (!error && data?.data) settings = mergeSettings(settings, data.data);
  if (!settings.leadCapture.whatsappUrl && settings.business.whatsappNumber) {
    const digits = String(settings.business.whatsappNumber).replace(/\D/g, "");
    if (digits) settings.leadCapture.whatsappUrl = `https://wa.me/${digits}`;
  }
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
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.supabase.co", "wss://*.supabase.co"],
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

// Stripe must receive the exact request bytes for signature verification. All
// other JSON endpoints are parsed here, before any route handlers are
// registered. The previous parser was registered after most WAAS routes, so
// production requests could reach Zod with an undefined body.
const jsonBodyParser = express.json({ limit: "2mb", verify: (req, _res, buffer) => { (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer); } });
app.use((req, res, next) => req.path === "/api/webhooks/stripe" ? next() : jsonBodyParser(req, res, next));
const captureLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, keyGenerator: rateKey, message: { error: "Too many enquiry attempts. Please try again later." } });
const acceptanceLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyGenerator: rateKey, message: { error: "Too many acceptance attempts. Please try again later." } });

const waasOrderSchema = z.object({
  id: z.string().trim().max(120).optional(), customerId: z.string().trim().max(120).optional(), customerName: z.string().trim().min(2).max(160), customerEmail: z.string().email().max(254).optional(), productType: z.enum(["launch", "business"]), planId: z.string().trim().max(120).optional(), niche: z.string().trim().max(100).optional(), style: z.enum(["modern", "bold", "premium"]).optional(), paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).default("pending"), externalId: z.string().trim().max(200).optional(),
});
const waasOnboardingSchema = z.object({ orderId: z.string().trim().min(1).max(120), business: z.record(z.string(), z.unknown()).default({}), branding: z.record(z.string(), z.unknown()).default({}), services: z.record(z.string(), z.unknown()).default({}), website: z.record(z.string(), z.unknown()).default({}), assets: z.array(z.object({ name: z.string().max(160), url: z.string().url().max(1000), type: z.string().max(80) })).max(50).default([]), completionPercentage: z.number().min(0).max(100).default(0) });
const waasTicketSchema = z.object({ id: z.string().trim().max(120).optional(), orderId: z.string().trim().max(120).optional(), websiteId: z.string().trim().max(120).optional(), customerId: z.string().trim().max(120).optional(), subject: z.string().trim().min(2).max(200), description: z.string().trim().min(2).max(10000), category: z.enum(["content_update", "technical_issue", "website_down", "domain_dns", "form_lead", "email", "billing", "seo", "feature_request", "general"]).default("general"), priority: z.enum(["critical", "high", "normal", "request"]).default("normal") });
const waasTicketMessageSchema = z.object({ ticketId: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(20000), authorType: z.enum(["customer", "admin", "connector"]).default("customer"), authorId: z.string().trim().max(120).optional(), internal: z.boolean().default(false) });
const waasAssetSchema = z.object({ orderId: z.string().trim().max(120).optional(), websiteId: z.string().trim().max(120).optional(), ticketId: z.string().trim().max(120).optional(), originalName: z.string().trim().min(1).max(160), contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/svg+xml", "application/pdf"]), byteSize: z.number().int().positive().max(10 * 1024 * 1024), sha256: z.string().regex(/^[0-9a-f]{64}$/i) });
const waasTicketStatusSchema = z.object({ status: z.enum(["new", "open", "in_progress", "waiting_for_customer", "resolved", "closed"]).optional(), priority: z.enum(["critical", "high", "normal", "request"]).optional() });

const waasSlaHours: Record<string, { response: number; resolution: number }> = { critical: { response: 1, resolution: 4 }, high: { response: 4, resolution: 24 }, normal: { response: 8, resolution: 72 }, request: { response: 24, resolution: 120 } };
function slaDeadline(priority: string, createdAt = new Date()) { const hours = waasSlaHours[priority] || waasSlaHours.normal; return { responseDueAt: new Date(createdAt.getTime() + hours.response * 3600000).toISOString(), resolutionDueAt: new Date(createdAt.getTime() + hours.resolution * 3600000).toISOString() }; }

async function upsertWaasRecord(workspaceId: string, collectionName: string, id: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const { error } = await supabaseServer.from("bos_records").upsert({ workspace_id: workspaceId, collection_name: collectionName, record_id: id, data: { ...data, id, workspaceId }, is_soft_deleted: false, updated_at: timestamp }, { onConflict: "workspace_id,collection_name,record_id" });
  if (error) throw error;
}

async function recordWaasActivity(workspaceId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}, actor = "system") {
  await upsertWaasRecord(workspaceId, "waas_activities", `activity-${crypto.randomUUID()}`, { actor, action, entityType, entityId, metadata, createdAt: new Date().toISOString() });
}

async function readWaasRecord(workspaceId: string, collectionName: string, recordId: string) {
  const { data, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: collectionName, record_id: recordId, is_soft_deleted: false }).maybeSingle();
  if (error) throw error;
  return data?.data as Record<string, any> | undefined;
}

async function validateTicketAssociations(workspaceId: string, ticket: { customerId?: string; orderId?: string; websiteId?: string }) {
  const customer = ticket.customerId ? await readWaasRecord(workspaceId, "customers", ticket.customerId) : undefined;
  const order = ticket.orderId ? await readWaasRecord(workspaceId, "waas_orders", ticket.orderId) : undefined;
  const website = ticket.websiteId ? await readWaasRecord(workspaceId, "waas_websites", ticket.websiteId) : undefined;
  if (ticket.customerId && !customer) throw new Error("Referenced customer was not found");
  if (ticket.orderId && !order) throw new Error("Referenced order was not found");
  if (ticket.websiteId && !website) throw new Error("Referenced website was not found");
  if (ticket.customerId && order?.customerId && order.customerId !== ticket.customerId) throw new Error("Order does not belong to the referenced customer");
  if (ticket.customerId && website?.customerId && website.customerId !== ticket.customerId) throw new Error("Website does not belong to the referenced customer");
  if (ticket.orderId && website?.orderId && website.orderId !== ticket.orderId) throw new Error("Website does not belong to the referenced order");
}

// Secured storefront contract. The standalone sales app can submit orders with
// an idempotency key; the same external order is never duplicated.
app.post("/api/integrations/waas/orders", async (req, res) => {
  const supplied = String(req.headers["x-waas-ingest-key"] || "");
  if (!process.env.WAAS_INGEST_API_KEY || supplied !== process.env.WAAS_INGEST_API_KEY) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = waasOrderSchema.parse(req.body); const id = parsed.id || (parsed.externalId ? `external-${parsed.externalId}` : `waas-order-${crypto.randomUUID()}`); const now = new Date().toISOString();
    const existing = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_orders", record_id: id, is_soft_deleted: false }).maybeSingle();
    if (existing.data?.data) return res.json({ success: true, id, duplicate: true, order: existing.data.data });
    const order = { ...parsed, id, workspaceId: supabaseWorkspaceId, status: parsed.paymentStatus === "paid" ? "paid" : "pending_payment", createdAt: now, updatedAt: now };
    await upsertWaasRecord(supabaseWorkspaceId, "waas_orders", id, order);
    await upsertWaasRecord(supabaseWorkspaceId, "waas_activities", `order-created-${id}`, { actor: "storefront", action: "order_created", entityType: "waas_order", entityId: id, createdAt: now });
    return res.status(201).json({ success: true, id, order });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid WAAS order", details: error.issues }); return res.status(503).json({ error: "WAAS order could not be recorded" }); }
});

function validWaasKey(req: express.Request) { const supplied = String(req.headers["x-waas-ingest-key"] || ""); return Boolean(process.env.WAAS_INGEST_API_KEY && supplied === process.env.WAAS_INGEST_API_KEY); }

function validPortalToken(orderId: string, token: string) {
  const secret = String(process.env.WAAS_PORTAL_SECRET || "");
  if (!secret || !token) return false;
  const expected = crypto.createHmac("sha256", secret).update(`order:${orderId}`).digest("hex");
  const actual = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function validConnectorSignature(req: express.Request) {
  const masterSecret = String(process.env.WAAS_CONNECTOR_INGEST_SECRET || "");
  const websiteId = typeof req.body?.websiteId === "string" ? req.body.websiteId.trim() : "";
  const timestamp = String(req.headers["x-bennietay-timestamp"] || "");
  const supplied = String(req.headers["x-bennietay-signature"] || "");
  const epoch = Number(timestamp);
  if (!masterSecret || !websiteId || !supplied || !Number.isFinite(epoch) || Math.abs(Date.now() - epoch * 1000) > 300000) return false;
  // Compromise of one WordPress installation must not grant authority to
  // impersonate another customer site. Each connector receives only this
  // deterministic, site-scoped key; the master stays on the admin server.
  const siteSecret = crypto.createHmac("sha256", masterSecret).update(`website:${websiteId}`).digest("hex");
  const raw = (req as express.Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = Buffer.from(crypto.createHmac("sha256", siteSecret).update(`${timestamp}.`).update(raw).digest("hex"));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const connectorLeadSchema = z.object({
  externalId: z.string().trim().min(8).max(160),
  websiteId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2).max(160),
  email: z.string().email().max(254),
  phone: z.string().trim().max(80).optional(),
  message: z.string().trim().max(10000).optional(),
  sourceUrl: z.string().url().max(1000).optional(),
});

app.post("/api/integrations/waas/leads", async (req, res) => {
  if (!validConnectorSignature(req)) return res.status(401).json({ error: "Invalid or expired connector signature" });
  try {
    const parsed = connectorLeadSchema.parse(req.body);
    const website = await readWaasRecord(supabaseWorkspaceId, "waas_websites", parsed.websiteId);
    if (!website) return res.status(404).json({ error: "Managed website not found" });
    const eventId = `connector-${parsed.externalId}`;
    const now = new Date().toISOString();
    const leadId = `waas-lead-${crypto.randomUUID()}`;
    const lead = { id: leadId, workspaceId: supabaseWorkspaceId, businessUnit: "WAAS", source: "managed_wordpress", sourceDetail: parsed.sourceUrl, websiteId: parsed.websiteId, customerId: website.customerId, companyName: website.businessName || website.domain || "Website enquiry", contactName: parsed.name, email: parsed.email.toLowerCase(), phone: parsed.phone || "", details: { message: parsed.message || "", connectorEventId: parsed.externalId }, status: "new", temperature: "warm", score: 50, createdAt: now, updatedAt: now };
    const event = { externalId: parsed.externalId, websiteId: parsed.websiteId, leadId, receivedAt: now };
    const { data: result, error: ingestError } = await supabaseServer.rpc("ingest_waas_connector_lead", { p_workspace_id: supabaseWorkspaceId, p_event_id: eventId, p_lead_id: leadId, p_event_data: event, p_lead_data: lead });
    if (ingestError) throw ingestError;
    if (result?.duplicate) return res.json({ success: true, duplicate: true, leadId: result.leadId });
    await recordWaasActivity(supabaseWorkspaceId, "website_lead_received", "waas_website", parsed.websiteId, { leadId, externalId: parsed.externalId }, "wordpress_connector");
    return res.status(201).json({ success: true, leadId });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid lead payload", details: error.issues });
    console.error("WordPress connector lead ingestion failed", error);
    return res.status(503).json({ error: "Lead could not be stored" });
  }
});

const waasCustomerSchema = z.object({ id: z.string().trim().max(120).optional(), externalId: z.string().trim().max(200).optional(), name: z.string().trim().min(2).max(160), email: z.string().email().max(254).optional(), phone: z.string().trim().max(80).optional(), company: z.string().trim().max(160).optional(), country: z.string().trim().max(80).optional() });
app.post("/api/integrations/waas/customers", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try { const parsed = waasCustomerSchema.parse(req.body); const id = parsed.id || (parsed.externalId ? `external-customer-${parsed.externalId}` : `waas-customer-${crypto.randomUUID()}`); const existing = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "customers", record_id: id, is_soft_deleted: false }).maybeSingle(); if (existing.data?.data) return res.json({ success: true, duplicate: true, customer: existing.data.data }); const now = new Date().toISOString(); const customer = { ...parsed, id, workspaceId: supabaseWorkspaceId, createdAt: now, updatedAt: now }; await upsertWaasRecord(supabaseWorkspaceId, "customers", id, customer); await recordWaasActivity(supabaseWorkspaceId, "customer_created", "customer", id, { source: "storefront" }, "storefront"); return res.status(201).json({ success: true, customer }); } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid customer", details: error.issues }); return res.status(503).json({ error: "Customer could not be created" }); }
});
app.put("/api/integrations/waas/customers/:id", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try { const parsed = waasCustomerSchema.partial().parse(req.body); const row = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "customers", record_id: req.params.id, is_soft_deleted: false }).maybeSingle(); if (!row.data?.data) return res.status(404).json({ error: "Customer not found" }); const customer = { ...(row.data.data as Record<string, unknown>), ...parsed, id: req.params.id, updatedAt: new Date().toISOString() }; await upsertWaasRecord(supabaseWorkspaceId, "customers", req.params.id, customer); await recordWaasActivity(supabaseWorkspaceId, "customer_updated", "customer", req.params.id, { source: "storefront" }, "storefront"); return res.json({ success: true, customer }); } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid customer", details: error.issues }); return res.status(503).json({ error: "Customer could not be updated" }); }
});

app.post("/api/integrations/waas/onboarding", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = waasOnboardingSchema.parse(req.body);
    const order = await readWaasRecord(supabaseWorkspaceId, "waas_orders", parsed.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const id = `onboarding-${parsed.orderId}`; const now = new Date().toISOString();
    await upsertWaasRecord(supabaseWorkspaceId, "waas_onboardings", id, { ...parsed, id, workspaceId: supabaseWorkspaceId, customerId: order.customerId, state: parsed.completionPercentage >= 100 ? "complete" : "in_progress", updatedAt: now });
    await upsertWaasRecord(supabaseWorkspaceId, "waas_orders", parsed.orderId, { ...order, status: parsed.completionPercentage >= 100 ? "ready_for_deployment" : "onboarding_in_progress", onboardingId: id, updatedAt: now });
    await recordWaasActivity(supabaseWorkspaceId, "onboarding_submitted", "waas_order", parsed.orderId, { completionPercentage: parsed.completionPercentage }, "storefront");
    return res.json({ success: true, id, completionPercentage: parsed.completionPercentage });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid onboarding payload", details: error.issues }); return res.status(503).json({ error: "Onboarding could not be saved" }); }
});

app.post("/api/integrations/waas/assets/upload-url", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = waasAssetSchema.parse(req.body);
    const assetId = `asset-${crypto.randomUUID()}`;
    const safeName = parsed.originalName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "upload";
    const storagePath = `${supabaseWorkspaceId}/${assetId}/${safeName}`;
    const upload = await supabaseServer.storage.from(waasAssetBucket()).createSignedUploadUrl(storagePath);
    if (upload.error || !upload.data) return res.status(503).json({ error: upload.error?.message || "Asset upload is unavailable" });
    const now = new Date().toISOString();
    const { error } = await supabaseServer.from("waas_assets").insert({ id: assetId, workspace_id: supabaseWorkspaceId, order_id: parsed.orderId || null, website_id: parsed.websiteId || null, ticket_id: parsed.ticketId || null, original_name: parsed.originalName, storage_path: storagePath, content_type: parsed.contentType, byte_size: parsed.byteSize, sha256: parsed.sha256.toLowerCase(), status: "pending", created_at: now, updated_at: now });
    if (error) throw error;
    return res.status(201).json({ assetId, path: storagePath, token: upload.data.token, signedUrl: upload.data.signedUrl, expiresInSeconds: 7200 });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid asset metadata", details: error.issues }); return res.status(503).json({ error: "Asset upload could not be prepared" }); }
});

app.post("/api/integrations/waas/assets/:assetId/complete", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  const shaSchema = z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/i).optional() });
  try {
    const parsed = shaSchema.parse(req.body);
    const assetRow = await supabaseServer.from("waas_assets").select("*").eq("id", req.params.assetId).eq("workspace_id", supabaseWorkspaceId).maybeSingle();
    if (assetRow.error) throw assetRow.error;
    if (!assetRow.data) return res.status(404).json({ error: "Asset not found" });
    const download = await supabaseServer.storage.from(waasAssetBucket()).download(assetRow.data.storage_path);
    if (download.error || !download.data) return res.status(409).json({ error: "Uploaded asset could not be verified" });
    const bytes = Buffer.from(await download.data.arrayBuffer());
    if (bytes.length !== assetRow.data.byte_size) return res.status(422).json({ error: "Uploaded asset size does not match declared metadata" });
    const actualSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const expectedSha256 = String(parsed.sha256 || assetRow.data.sha256).toLowerCase();
    if (actualSha256 !== expectedSha256) return res.status(422).json({ error: "Uploaded asset checksum does not match declared metadata" });
    const contentType = String(assetRow.data.content_type);
    const header = bytes.subarray(0, 16);
    const validSignature = contentType === "image/jpeg" ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      : contentType === "image/png" ? header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : contentType === "image/webp" ? header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP"
          : contentType === "application/pdf" ? header.subarray(0, 5).toString("ascii") === "%PDF-"
            : contentType === "image/svg+xml" ? !/<\\s*(script|iframe|object|embed)\\b|\\bon[a-z]+\\s*=|<!ENTITY|javascript:/i.test(bytes.subarray(0, 1024 * 1024).toString("utf8"))
              : false;
    if (!validSignature) return res.status(422).json({ error: "Uploaded asset content does not match its declared type" });
    const updates: Record<string, unknown> = { status: "ready", sha256: actualSha256, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseServer.from("waas_assets").update(updates).eq("id", req.params.assetId).eq("workspace_id", supabaseWorkspaceId).select("*").maybeSingle();
    if (error) throw error;
    await recordWaasActivity(supabaseWorkspaceId, "asset_uploaded", "waas_asset", req.params.assetId, { path: data?.storage_path, sha256: actualSha256 }, "storefront");
    return res.json({ success: true, asset: data });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid asset completion", details: error.issues }); return res.status(503).json({ error: "Asset could not be completed" }); }
});

app.post("/api/integrations/waas/orders/:id/payment", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  const schema = z.object({ eventId: z.string().trim().min(1).max(200), status: z.enum(["paid", "failed", "refunded"]), subscriptionId: z.string().trim().max(200).optional(), amount: z.number().nonnegative().optional(), currency: z.string().trim().max(3).optional() });
  try { const parsed = schema.parse(req.body); const duplicate = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_payment_events", record_id: parsed.eventId, is_soft_deleted: false }).maybeSingle(); if ((duplicate.data?.data as any)?.status === "processed") return res.json({ success: true, duplicate: true }); const orderRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_orders", record_id: req.params.id, is_soft_deleted: false }).maybeSingle(); if (!orderRow.data?.data) return res.status(404).json({ error: "Order not found" }); const now = new Date().toISOString(); await upsertWaasRecord(supabaseWorkspaceId, "waas_payment_events", parsed.eventId, { ...parsed, orderId: req.params.id, status: "processing", receivedAt: now, updatedAt: now }); await upsertWaasRecord(supabaseWorkspaceId, "waas_orders", req.params.id, { ...(orderRow.data.data as Record<string, unknown>), paymentStatus: parsed.status, status: parsed.status === "paid" ? "paid" : parsed.status === "refunded" ? "cancelled" : "failed", subscriptionId: parsed.subscriptionId, paidAt: parsed.status === "paid" ? now : undefined, updatedAt: now }); await upsertWaasRecord(supabaseWorkspaceId, "waas_payment_events", parsed.eventId, { ...parsed, orderId: req.params.id, status: "processed", processedAt: now, updatedAt: now }); await recordWaasActivity(supabaseWorkspaceId, `payment_${parsed.status}`, "waas_order", req.params.id, { eventId: parsed.eventId }, "payment_provider"); return res.json({ success: true, orderId: req.params.id, status: parsed.status }); } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid payment update", details: error.issues }); return res.status(503).json({ error: "Payment update could not be applied" }); }
});

app.get("/api/integrations/waas/orders/:id/status", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  const { data: row, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_orders", record_id: req.params.id, is_soft_deleted: false }).maybeSingle();
  if (error) return res.status(503).json({ error: "Status unavailable" }); if (!row?.data) return res.status(404).json({ error: "Order not found" });
  const order = row.data as any; const websiteRow = order.websiteId ? await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_websites", record_id: order.websiteId, is_soft_deleted: false }).maybeSingle() : { data: null } as any;
  return res.json({ order, website: websiteRow.data?.data || null });
});

app.get("/api/integrations/waas/catalog", async (_req, res) => {
  try {
    const { data, error } = await supabaseServer.from("bos_records").select("collection_name,record_id,data").eq("workspace_id", supabaseWorkspaceId).in("collection_name", ["waas_plans", "waas_templates"]).eq("is_soft_deleted", false).limit(200);
    if (error) throw error;
    const rows = (data || []).map(row => ({ id: row.record_id, collection: row.collection_name, ...(row.data || {}) })).filter(row => row.active !== false && row.status !== "inactive");
    const latest = <T extends Record<string, any>>(items: T[], key: (item: T) => string) => Array.from(items.reduce((map, item) => { const current = map.get(key(item)); if (!current || new Date(String(item.updatedAt || item.createdAt || 0)).getTime() >= new Date(String(current.updatedAt || current.createdAt || 0)).getTime()) map.set(key(item), item); return map; }, new Map<string, T>()).values());
    const plans = latest(rows.filter(row => row.collection === "waas_plans" && (Number(row.setupFee || 0) > 0 || Number(row.recurringFee || 0) > 0)), row => String(row.productType || row.id));
    const templates = latest(rows.filter(row => row.collection === "waas_templates"), row => `${row.productType || ""}:${row.niche || ""}:${row.style || ""}`).map(({ configuration: _configuration, ...template }) => template);
    return res.json({ plans, templates });
  } catch (error) { console.error("WAAS catalogue lookup failed", error); return res.status(503).json({ error: "Catalogue is temporarily unavailable" }); }
});

// Server-to-server storefront contract for customer portal links. The
// storefront never needs the portal secret: it authenticates with the scoped
// ingest key and receives an order-bound token that is safe to place in the
// customer's portal URL. No customer or payment data is returned here.
app.post("/api/integrations/waas/orders/:id/portal-token", (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  const orderId = String(req.params.id || "").trim();
  if (!orderId || orderId.length > 120) return res.status(400).json({ error: "Invalid order id" });
  void (async () => {
    const order = await readWaasRecord(supabaseWorkspaceId, "waas_orders", orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const secret = String(process.env.WAAS_PORTAL_SECRET || "");
    if (!secret) return res.status(503).json({ error: "Customer portal is not configured" });
    const token = crypto.createHmac("sha256", secret).update(`order:${orderId}`).digest("hex");
    res.setHeader("Cache-Control", "no-store");
    return res.json({ orderId, token, portalUrl: `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/portal?order=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}` });
  })().catch(error => { console.error("Portal token issuance failed", error); if (!res.headersSent) res.status(503).json({ error: "Portal token could not be issued" }); });
});

// Customer portal contract. The standalone storefront should mint a portal
// token server-side using WAAS_PORTAL_SECRET; the secret is never sent to the
// browser. Tokens are order-scoped and only return customer-safe fields.
app.get("/api/portal/orders/:id", async (req, res) => {
  if (!validPortalToken(req.params.id, String(req.query.token || ""))) return res.status(401).json({ error: "Invalid portal token" });
  try {
    const order = await readWaasRecord(supabaseWorkspaceId, "waas_orders", req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const website = order.websiteId ? await readWaasRecord(supabaseWorkspaceId, "waas_websites", String(order.websiteId)) : undefined;
    const { data: ticketRows, error: ticketError } = await supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_support_tickets", is_soft_deleted: false }).eq("data->>orderId", req.params.id).order("updated_at", { ascending: false }).limit(50);
    if (ticketError) throw ticketError;
    return res.json({ order: { id: order.id, status: order.status, paymentStatus: order.paymentStatus, productType: order.productType, niche: order.niche, style: order.style, createdAt: order.createdAt, updatedAt: order.updatedAt }, website: website ? { id: website.id, domain: website.domain, temporaryUrl: website.temporaryUrl, liveUrl: website.liveUrl, status: website.status, deploymentStatus: website.deploymentStatus, lastHealthCheck: website.lastHealthCheck } : null, tickets: (ticketRows || []).map(row => ({ id: row.record_id, ...(row.data || {}) })) });
  } catch (error) { console.error("Portal order lookup failed", error); return res.status(503).json({ error: "Portal data is temporarily unavailable" }); }
});

app.post("/api/portal/orders/:id/tickets", async (req, res) => {
  if (!validPortalToken(req.params.id, String(req.query.token || ""))) return res.status(401).json({ error: "Invalid portal token" });
  try {
    const parsed = waasTicketSchema.parse({ ...req.body, orderId: req.params.id });
    const order = await readWaasRecord(supabaseWorkspaceId, "waas_orders", req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const ticketId = parsed.id || `portal-ticket-${crypto.createHash("sha256").update(`${req.params.id}:${parsed.subject}:${parsed.description}`).digest("hex").slice(0, 32)}`;
    const existing = await readWaasRecord(supabaseWorkspaceId, "waas_support_tickets", ticketId);
    if (existing) return res.json({ success: true, duplicate: true, ticket: existing });
    const now = new Date(); const nowIso = now.toISOString(); const ticket = { ...parsed, id: ticketId, customerId: order.customerId, workspaceId: supabaseWorkspaceId, ticketNumber: `WAAS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`, source: "customer_portal", status: "new", createdAt: nowIso, updatedAt: nowIso };
    await upsertWaasRecord(supabaseWorkspaceId, "waas_support_tickets", ticketId, ticket);
    const deadlines = slaDeadline(parsed.priority, now);
    await supabaseServer.from("waas_ticket_sla").upsert({ id: `sla-${ticketId}`, workspace_id: supabaseWorkspaceId, ticket_id: ticketId, priority: parsed.priority, response_due_at: deadlines.responseDueAt, resolution_due_at: deadlines.resolutionDueAt, updated_at: nowIso }, { onConflict: "workspace_id,ticket_id" });
    await recordWaasActivity(supabaseWorkspaceId, "ticket_created", "waas_ticket", ticketId, { priority: parsed.priority, category: parsed.category }, "customer_portal");
    return res.status(201).json({ success: true, ticket, sla: deadlines });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid support ticket", details: error.issues }); return res.status(503).json({ error: "Support ticket could not be created" }); }
});

// Customer-facing ticket conversation. Every read/write is checked against
// the order embedded in the HMAC token; knowing a ticket id alone is never
// sufficient to access another customer's thread.
app.get("/api/portal/orders/:id/tickets/:ticketId/messages", async (req, res) => {
  if (!validPortalToken(req.params.id, String(req.query.token || ""))) return res.status(401).json({ error: "Invalid portal token" });
  try {
    const ticket = await readWaasRecord(supabaseWorkspaceId, "waas_support_tickets", req.params.ticketId);
    if (!ticket || String(ticket.orderId || "") !== req.params.id) return res.status(404).json({ error: "Support ticket not found" });
    const { data, error } = await supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_ticket_messages", is_soft_deleted: false }).eq("data->>ticketId", req.params.ticketId).order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ messages: (data || []).map(row => ({ id: row.record_id, ...(row.data || {}) })).filter(message => !message.internal) });
  } catch (error) { console.error("Portal ticket messages lookup failed", error); return res.status(503).json({ error: "Ticket messages are temporarily unavailable" }); }
});

app.post("/api/portal/orders/:id/tickets/:ticketId/messages", async (req, res) => {
  if (!validPortalToken(req.params.id, String(req.query.token || ""))) return res.status(401).json({ error: "Invalid portal token" });
  try {
    const ticket = await readWaasRecord(supabaseWorkspaceId, "waas_support_tickets", req.params.ticketId);
    if (!ticket || String(ticket.orderId || "") !== req.params.id) return res.status(404).json({ error: "Support ticket not found" });
    const parsed = waasTicketMessageSchema.parse({ ...req.body, ticketId: req.params.ticketId, authorType: "customer", internal: false });
    const id = `portal-message-${crypto.createHash("sha256").update(`${req.params.id}:${parsed.ticketId}:${parsed.body}`).digest("hex").slice(0, 32)}`;
    const existing = await readWaasRecord(supabaseWorkspaceId, "waas_ticket_messages", id);
    if (existing) return res.json({ success: true, duplicate: true, message: existing });
    const createdAt = new Date().toISOString();
    const message = { ...parsed, id, workspaceId: supabaseWorkspaceId, createdAt };
    await upsertWaasRecord(supabaseWorkspaceId, "waas_ticket_messages", id, message);
    await upsertWaasRecord(supabaseWorkspaceId, "waas_support_tickets", req.params.ticketId, { ...ticket, status: "open", updatedAt: createdAt });
    await supabaseServer.from("waas_ticket_sla").update({ updated_at: createdAt }).eq("workspace_id", supabaseWorkspaceId).eq("ticket_id", req.params.ticketId);
    await recordWaasActivity(supabaseWorkspaceId, "ticket_message_added", "waas_ticket", req.params.ticketId, { messageId: id }, "customer_portal");
    return res.status(201).json({ success: true, message });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid ticket message", details: error.issues }); console.error("Portal ticket message failed", error); return res.status(503).json({ error: "Ticket message could not be created" }); }
});

// Create a real Stripe Checkout session for a WAAS order. Orders remain
// pending until Stripe confirms payment through the signed webhook below.
app.post("/api/waas/orders/:id/checkout", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "sales"]), acceptanceLimiter, async (req: AuthenticatedRequest, res) => {
  if (!stripe) return res.status(503).json({ error: "Online payment is not configured" });
  try {
    const { data: orderRow, error: orderError } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_orders", record_id: req.params.id, is_soft_deleted: false }).maybeSingle();
    if (orderError) throw orderError;
    if (!orderRow?.data) return res.status(404).json({ error: "WAAS order not found" });
    const order = orderRow.data as any;
    if (order.paymentStatus === "paid" || ["paid", "awaiting_onboarding", "ready_for_deployment", "deploying", "review_required", "live"].includes(order.status)) return res.status(409).json({ error: "This order is already paid" });
    if (!order.planId) return res.status(409).json({ error: "Select a WAAS plan before requesting payment" });
    const { data: planRow } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_plans", record_id: order.planId, is_soft_deleted: false }).maybeSingle();
    const plan = planRow?.data as any;
    if (!plan || plan.active === false) return res.status(409).json({ error: "The selected WAAS plan is unavailable" });
    const currency = String(plan.currency || "MYR").toLowerCase();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (Number(plan.setupFee) > 0) lineItems.push({ price_data: { currency, product_data: { name: `${plan.name} setup` }, unit_amount: Math.round(Number(plan.setupFee) * 100) }, quantity: 1 });
    if (Number(plan.recurringFee) > 0) lineItems.push({ price_data: { currency, product_data: { name: `${plan.name} care plan` }, unit_amount: Math.round(Number(plan.recurringFee) * 100), recurring: { interval: plan.billingInterval === "year" ? "year" : "month" } }, quantity: 1 });
    if (!lineItems.length) return res.status(409).json({ error: "The selected plan has no billable amount" });
    const metadata = { workspaceId: req.workspaceId!, waasOrderId: order.id, planId: plan.id };
    if (order.checkoutSessionId) {
      const existingSession = await stripe.checkout.sessions.retrieve(String(order.checkoutSessionId));
      if (existingSession.status === "open" && existingSession.url) return res.json({ checkoutUrl: existingSession.url, sessionId: existingSession.id, reused: true });
    }
    const session = await stripe.checkout.sessions.create({ mode: Number(plan.recurringFee) > 0 ? "subscription" : "payment", line_items: lineItems, customer_email: order.customerEmail || undefined, metadata, subscription_data: Number(plan.recurringFee) > 0 ? { metadata } : undefined, success_url: `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/waas?payment=success&order=${encodeURIComponent(order.id)}`, cancel_url: `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/waas?payment=cancelled&order=${encodeURIComponent(order.id)}` }, { idempotencyKey: `waas-checkout-${req.workspaceId}-${order.id}` });
    await upsertWaasRecord(req.workspaceId!, "waas_orders", order.id, { ...order, paymentStatus: "pending", checkoutSessionId: session.id, updatedAt: new Date().toISOString() });
    return res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) { console.error("WAAS checkout creation failed", error); return res.status(503).json({ error: "WAAS checkout could not be created" }); }
});

app.post("/api/integrations/waas/tickets", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = waasTicketSchema.parse(req.body);
    await validateTicketAssociations(supabaseWorkspaceId, parsed);
    const id = parsed.id || `portal-ticket-${crypto.randomUUID()}`;
    const now = new Date(); const nowIso = now.toISOString();
    const existing = await readWaasRecord(supabaseWorkspaceId, "waas_support_tickets", id);
    if (existing) return res.json({ success: true, duplicate: true, ticket: existing });
    const ticket = { ...parsed, id, workspaceId: supabaseWorkspaceId, ticketNumber: `WAAS-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`, source: "customer_portal", status: "new", createdAt: nowIso, updatedAt: nowIso };
    await upsertWaasRecord(supabaseWorkspaceId, "waas_support_tickets", id, ticket);
    const deadlines = slaDeadline(parsed.priority, now);
    await supabaseServer.from("waas_ticket_sla").upsert({ id: `sla-${id}`, workspace_id: supabaseWorkspaceId, ticket_id: id, priority: parsed.priority, response_due_at: deadlines.responseDueAt, resolution_due_at: deadlines.resolutionDueAt, updated_at: nowIso }, { onConflict: "workspace_id,ticket_id" });
    await recordWaasActivity(supabaseWorkspaceId, "ticket_created", "waas_ticket", id, { priority: parsed.priority, category: parsed.category }, "customer_portal");
    return res.status(201).json({ success: true, ticket, sla: deadlines });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid support ticket", details: error.issues });
    if (error instanceof Error && /referenced|belong/i.test(error.message)) return res.status(409).json({ error: error.message });
    return res.status(503).json({ error: "Support ticket could not be created" });
  }
});

app.post("/api/integrations/waas/tickets/:ticketId/messages", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const parsed = waasTicketMessageSchema.parse({ ...req.body, ticketId: req.params.ticketId });
    const id = `portal-message-${crypto.createHash("sha256").update(`${parsed.ticketId}:${parsed.body}:${parsed.authorId || "portal"}`).digest("hex").slice(0, 32)}`;
    const existing = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_ticket_messages", record_id: id, is_soft_deleted: false }).maybeSingle();
    if (existing.data?.data) return res.json({ success: true, duplicate: true, message: existing.data.data });
    const ticketRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_support_tickets", record_id: parsed.ticketId, is_soft_deleted: false }).maybeSingle();
    if (!ticketRow.data?.data) return res.status(404).json({ error: "Support ticket not found" });
    const message = { ...parsed, id, workspaceId: supabaseWorkspaceId, createdAt: new Date().toISOString() };
    await upsertWaasRecord(supabaseWorkspaceId, "waas_ticket_messages", id, message);
    await upsertWaasRecord(supabaseWorkspaceId, "waas_support_tickets", parsed.ticketId, { ...(ticketRow.data?.data as Record<string, unknown> || {}), status: parsed.authorType === "customer" ? "open" : "in_progress", updatedAt: message.createdAt });
    await recordWaasActivity(supabaseWorkspaceId, "ticket_message_added", "waas_ticket", parsed.ticketId, { messageId: id }, parsed.authorType);
    return res.status(201).json({ success: true, message });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid ticket message", details: error.issues }); return res.status(503).json({ error: "Ticket message could not be created" }); }
});

app.get("/api/integrations/waas/tickets/:ticketId/messages", async (req, res) => {
  if (!validWaasKey(req)) return res.status(401).json({ error: "Unauthorized" });
  const { data, error } = await supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: supabaseWorkspaceId, collection_name: "waas_ticket_messages", is_soft_deleted: false }).eq("data->>ticketId", req.params.ticketId).order("updated_at", { ascending: true });
  if (error) return res.status(503).json({ error: "Ticket messages unavailable" });
  return res.json({ messages: (data || []).map(row => ({ id: row.record_id, ...(row.data || {}) })) });
});

app.post("/api/waas/tickets/:ticketId/messages", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "support", "operations"]), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = waasTicketMessageSchema.parse({ ...req.body, ticketId: req.params.ticketId, authorType: "admin", authorId: req.user?.uid || undefined });
    const ticketRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_support_tickets", record_id: parsed.ticketId, is_soft_deleted: false }).maybeSingle();
    if (!ticketRow.data?.data) return res.status(404).json({ error: "Support ticket not found" });
    const id = `admin-message-${crypto.randomUUID()}`; const createdAt = new Date().toISOString();
    await upsertWaasRecord(req.workspaceId!, "waas_ticket_messages", id, { ...parsed, id, workspaceId: req.workspaceId, createdAt });
    await upsertWaasRecord(req.workspaceId!, "waas_support_tickets", parsed.ticketId, { ...(ticketRow.data.data as Record<string, unknown>), status: "in_progress", updatedAt: createdAt });
    await supabaseServer.from("waas_ticket_sla").update({ first_responded_at: new Date().toISOString(), updated_at: createdAt }).eq("workspace_id", req.workspaceId).eq("ticket_id", parsed.ticketId).is("first_responded_at", null);
    await recordWaasActivity(req.workspaceId!, "ticket_message_added", "waas_ticket", parsed.ticketId, { messageId: id }, "admin");
    return res.status(201).json({ success: true, message: { ...parsed, id, workspaceId: req.workspaceId, createdAt } });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid ticket message", details: error.issues }); return res.status(503).json({ error: "Ticket message could not be created" }); }
});

app.patch("/api/waas/tickets/:ticketId", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "support", "operations"]), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = waasTicketStatusSchema.parse(req.body);
    const ticketRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_support_tickets", record_id: req.params.ticketId, is_soft_deleted: false }).maybeSingle();
    if (!ticketRow.data?.data) return res.status(404).json({ error: "Support ticket not found" });
    const updatedAt = new Date().toISOString(); const ticket = { ...(ticketRow.data.data as Record<string, unknown>), ...(parsed.status ? { status: parsed.status } : {}), ...(parsed.priority ? { priority: parsed.priority } : {}), updatedAt };
    await upsertWaasRecord(req.workspaceId!, "waas_support_tickets", req.params.ticketId, ticket);
    const slaPatch: Record<string, unknown> = { updated_at: updatedAt };
    if (parsed.priority) { const deadlines = slaDeadline(parsed.priority); slaPatch.priority = parsed.priority; slaPatch.response_due_at = deadlines.responseDueAt; slaPatch.resolution_due_at = deadlines.resolutionDueAt; }
    if (parsed.status === "resolved" || parsed.status === "closed") slaPatch.resolved_at = updatedAt;
    await supabaseServer.from("waas_ticket_sla").update(slaPatch).eq("workspace_id", req.workspaceId).eq("ticket_id", req.params.ticketId);
    await recordWaasActivity(req.workspaceId!, "ticket_updated", "waas_ticket", req.params.ticketId, parsed, req.user?.email || "admin");
    return res.json({ success: true, ticket });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid ticket update", details: error.issues }); return res.status(503).json({ error: "Support ticket could not be updated" }); }
});

app.get("/api/waas/tickets/sla", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "support", "operations"]), async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabaseServer.from("waas_ticket_sla").select("*").eq("workspace_id", req.workspaceId);
  if (error) return res.status(503).json({ error: "Ticket SLA data unavailable" });
  const now = Date.now();
  return res.json({ sla: (data || []).map(row => ({ ...row, response_breached: Boolean(row.response_breached || (!row.first_responded_at && new Date(row.response_due_at).getTime() < now)), resolution_breached: Boolean(row.resolution_breached || (!row.resolved_at && new Date(row.resolution_due_at).getTime() < now)) })) });
});

app.post("/api/waas/websites/:websiteId/update-usage", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "support", "operations"]), async (req: AuthenticatedRequest, res) => {
  const schema = z.object({ ticketId: z.string().trim().max(120).optional(), classification: z.enum(["included", "chargeable", "not_an_update", "requires_upgrade"]) });
  try {
    const parsed = schema.parse(req.body); const workspaceId = req.workspaceId!; const websiteRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_websites", record_id: req.params.websiteId, is_soft_deleted: false }).maybeSingle();
    if (!websiteRow.data?.data) return res.status(404).json({ error: "Website not found" });
    const website = websiteRow.data.data as any; const periodStart = new Date(); periodStart.setUTCDate(1); periodStart.setUTCHours(0, 0, 0, 0); const start = periodStart.toISOString(); const periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1)).toISOString();
    const usageRows = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_update_usage", is_soft_deleted: false }).eq("data->>websiteId", req.params.websiteId).gte("data->>periodStart", start);
    const used = (usageRows.data || []).filter(row => (row.data as any)?.classification === "included").reduce((sum, row) => sum + Number((row.data as any)?.used || 0), 0); const allowance = Number(website.supportAllowance || website.updateAllowance || 0);
    if (parsed.classification === "included" && used >= allowance) return res.status(409).json({ error: "Included update allowance exhausted", allowance, used });
    const id = `usage-${req.params.websiteId}-${crypto.randomUUID()}`; const usage = { id, workspaceId, websiteId: req.params.websiteId, ticketId: parsed.ticketId, periodStart: start, periodEnd, allowance, used: parsed.classification === "included" ? used + 1 : used, classification: parsed.classification, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const { data: atomicUsage, error: atomicError } = await supabaseServer.rpc("record_waas_update_usage", { p_workspace_id: workspaceId, p_website_id: req.params.websiteId, p_usage_id: id, p_usage: usage, p_allowance: allowance });
    if (atomicError) { if (/allowance exhausted/i.test(atomicError.message || "")) return res.status(409).json({ error: "Included update allowance exhausted", allowance, used }); throw atomicError; }
    const recordedUsage = (atomicUsage || usage) as any;
    await recordWaasActivity(workspaceId, "update_usage_recorded", "waas_website", req.params.websiteId, { classification: parsed.classification, allowance, used: recordedUsage.used }); return res.status(201).json({ success: true, usage: recordedUsage });
  } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid update usage", details: error.issues }); return res.status(503).json({ error: "Update usage could not be recorded" }); }
});

app.get("/api/waas/websites/:websiteId/health", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations", "support"]), async (req: AuthenticatedRequest, res) => {
  const websiteRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_websites", record_id: req.params.websiteId, is_soft_deleted: false }).maybeSingle();
  if (websiteRow.error) return res.status(503).json({ error: "Website health unavailable" });
  if (!websiteRow.data?.data) return res.status(404).json({ error: "Website not found" });
  const website = websiteRow.data.data as any;
  try { const provider = getHostingProvider(); const health = website.wordpressInstallationId ? await provider.getWebsiteStatus(website.wordpressInstallationId) : { status: "not_provisioned", sslStatus: "unknown" }; const checkedAt = new Date().toISOString(); const updated = { ...website, status: health.status === "ready" && website.status !== "live" ? website.status : health.status, sslStatus: health.sslStatus, lastHealthCheck: checkedAt, updatedAt: checkedAt }; await upsertWaasRecord(req.workspaceId!, "waas_websites", req.params.websiteId, updated); await recordWaasActivity(req.workspaceId!, "website_health_checked", "waas_website", req.params.websiteId, health); return res.json({ success: true, health, checkedAt }); } catch (error) { return res.status(503).json({ error: error instanceof Error ? error.message : "Website health check failed" }); }
});

app.post("/api/waas/websites/:websiteId/wordpress-access", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const website = await readWaasRecord(req.workspaceId!, "waas_websites", req.params.websiteId);
    if (!website) return res.status(404).json({ error: "Website not found" });
    const credentialRef = String(website.wordpressCredentialRef || "");
    if (!credentialRef) return res.status(409).json({ error: "WordPress access has not been provisioned" });
    const credentials = await readEncryptedIntegration<{ email: string; login: string; password: string }>(req.workspaceId!, credentialRef);
    if (!credentials) return res.status(404).json({ error: "WordPress credentials are unavailable" });
    await recordWaasActivity(req.workspaceId!, "wordpress_access_revealed", "waas_website", req.params.websiteId, {}, req.user?.email || "admin");
    return res.json({ login: credentials.login, password: credentials.password, email: credentials.email, adminUrl: `${String(website.temporaryUrl || website.liveUrl || "").replace(/\/$/, "")}/wp-admin/` });
  } catch { return res.status(503).json({ error: "WordPress access could not be retrieved" }); }
});

app.post("/api/waas/orders/:id/deploy", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  try {
    if (isProduction && !integrationStatus().waasDeploymentConfigured) return res.status(503).json({ error: "WAAS deployment is not fully configured; Hostinger, WordPress admin email, encryption and connector secrets are required" });
    const orderId = req.params.id; const { data: row, error } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_orders", record_id: orderId, is_soft_deleted: false }).maybeSingle(); if (error) throw error; if (!row?.data) return res.status(404).json({ error: "WAAS order not found" });
    const order = row.data as any;
    if (!['paid', 'ready_for_deployment', 'failed', 'deploying'].includes(String(order.status))) return res.status(409).json({ error: "Order must be paid and onboarding-ready before deployment" });
    const candidateId = `waas-deployment-${crypto.randomUUID()}`;
    const { data: durableJob, error: queueError } = await supabaseServer.rpc("ensure_waas_deployment_job", { p_workspace_id: req.workspaceId!, p_order_id: orderId, p_deployment_id: candidateId });
    if (queueError || !durableJob?.deployment_id) throw queueError || new Error("Deployment queue unavailable");
    const deploymentId = String(durableJob.deployment_id);
    const existing = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_deployments", record_id: deploymentId, is_soft_deleted: false }).maybeSingle();
    const now = new Date().toISOString();
    // A repeated click must be idempotent. Once a deployment is queued,
    // running, complete, or waiting for review, return its current state
    // without moving the order backwards or creating a second run.
    if (existing.data?.data && !["failed", "waiting"].includes(String((existing.data.data as any).status))) {
      const current = existing.data.data as any;
      return res.status(200).json({ success: true, duplicate: true, deploymentId, status: current.status, next: `/api/waas/deployments/${encodeURIComponent(deploymentId)}/run` });
    }
    if (!existing.data?.data) {
      await upsertWaasRecord(req.workspaceId!, "waas_deployments", deploymentId, { id: deploymentId, workspaceId: req.workspaceId, orderId, status: "queued", provider: getHostingProviderKind(), currentStep: WAAS_DEPLOYMENT_STEPS[0], createdAt: now, updatedAt: now });
    } else if (["waiting", "failed"].includes(String((existing.data.data as any).status))) {
      await upsertWaasRecord(req.workspaceId!, "waas_deployments", deploymentId, { ...(existing.data.data as any), status: "queued", errorMessage: undefined, updatedAt: now });
      await supabaseServer.from("waas_deployment_jobs").update({ status: "queued", worker_id: null, lease_expires_at: null, available_at: now, last_error: null, updated_at: now }).eq("workspace_id", req.workspaceId).eq("deployment_id", deploymentId).in("status", ["failed", "leased"]);
    }
    await upsertWaasRecord(req.workspaceId!, "waas_orders", orderId, { ...order, deploymentId, status: "deploying", updatedAt: now });
    await recordWaasActivity(req.workspaceId!, "deployment_queued", "waas_deployment", deploymentId, { orderId }, req.user?.email || "admin");
    return res.status(202).json({ success: true, deploymentId, status: "queued", next: `/api/waas/deployments/${encodeURIComponent(deploymentId)}/run` });
  } catch (error) { console.error("WAAS deployment failed", error); return res.status(503).json({ error: "WAAS deployment could not be started" }); }
});

function deploymentWorkerAuth(req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) {
  const expected = String(process.env.CRON_SECRET || "");
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (expected && supplied === expected) {
    req.user = { uid: "vercel_cron", email: "cron@bennie.com", role: "super_admin" } as any;
    req.workspaceId = String(req.headers["x-workspace-id"] || supabaseWorkspaceId);
    return next();
  }
  return authenticateUser(req, res, next);
}

app.post("/api/waas/deployments/:id/run", deploymentWorkerAuth, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  let deploymentId = req.params.id;
  let currentStepName = "validate_order";
  const workerId = String(req.requestId || crypto.randomUUID());
  try {
    const workspaceId = req.workspaceId!;
    const { data: claimedJob, error: claimError } = await supabaseServer.rpc("claim_waas_deployment_job", { p_workspace_id: workspaceId, p_deployment_id: deploymentId, p_worker_id: workerId, p_lease_seconds: 300 });
    if (claimError) throw claimError;
    if (!claimedJob?.deployment_id) return res.status(409).json({ error: "Deployment is already running or is not queued" });
    const { data: deploymentRow, error: deploymentError } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_deployments", record_id: deploymentId, is_soft_deleted: false }).maybeSingle(); if (deploymentError) throw deploymentError; if (!deploymentRow?.data) return res.status(404).json({ error: "Deployment not found" });
    let deployment = deploymentRow.data as any; if (["complete", "cancelled", "review_required"].includes(deployment.status)) return res.status(409).json({ error: "Deployment is not runnable in its current state" });
    const { data: orderRow } = deployment.orderId ? await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_orders", record_id: deployment.orderId, is_soft_deleted: false }).maybeSingle() : { data: null } as any; const order = orderRow?.data as any;
    if (!order) {
      await supabaseServer.from("waas_deployment_jobs").update({ status: "failed", worker_id: null, lease_expires_at: null, last_error: "Deployment order is missing", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId);
      return res.status(409).json({ error: "Deployment order is missing" });
    }
    const { data: onboardingRow } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_onboardings", is_soft_deleted: false }).eq("data->>orderId", deployment.orderId).maybeSingle();
    if (!onboardingRow?.data || (onboardingRow.data as any).state !== "complete") {
      await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, status: "waiting", currentStep: "validate_onboarding", errorMessage: "Completed onboarding is required before deployment", updatedAt: new Date().toISOString() });
      await upsertWaasRecord(workspaceId, "waas_orders", deployment.orderId, { ...order, status: "awaiting_onboarding", updatedAt: new Date().toISOString() });
      await supabaseServer.from("waas_deployment_jobs").update({ status: "failed", worker_id: null, lease_expires_at: null, last_error: "Completed onboarding is required before deployment", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId);
      return res.status(409).json({ error: "Completed onboarding is required before deployment" });
    }
    const template = order.templateId ? await readWaasRecord(workspaceId, "waas_templates", String(order.templateId)) : undefined;
    if (!template || template.status !== "active") {
      await supabaseServer.from("waas_deployment_jobs").update({ status: "failed", worker_id: null, lease_expires_at: null, last_error: "An active template must be assigned before deployment", updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId);
      throw new Error("An active template must be assigned before deployment");
    }
    if (template.productType !== order.productType) throw new Error("The selected template does not match the ordered product");
    const themePackageId = String(template.themePackageId || (order.productType === "launch" ? "bennietay-launch" : "bennietay-business"));
    const plan = order.planId ? await readWaasRecord(workspaceId, "waas_plans", String(order.planId)) : undefined;
    const names = WAAS_DEPLOYMENT_STEPS; const now = new Date().toISOString(); const providerKind = getHostingProviderKind(); await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, status: "running", provider: providerKind, startedAt: deployment.startedAt || now, currentStep: deployment.currentStep || names[0], updatedAt: now }); deployment = { ...deployment, status: "running", provider: providerKind, startedAt: deployment.startedAt || now, currentStep: deployment.currentStep || names[0] };
    const provider = getHostingProvider(); let hosting: { installationId: string; temporaryUrl: string } | null = deployment.hostingInstallationId ? { installationId: deployment.hostingInstallationId, temporaryUrl: deployment.temporaryUrl } : null; let wordpressVersion = deployment.wordpressVersion;
    const websiteId = deployment.websiteId || `waas-site-${crypto.randomUUID()}`;
    if (!deployment.websiteId) { deployment = { ...deployment, websiteId }; await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, updatedAt: new Date().toISOString() }); }
    const credentialRef = String(deployment.wordpressCredentialRef || `waas-wordpress-${deploymentId}`);
    let wordpressCredentials = await readEncryptedIntegration<{ email: string; login: string; password: string; siteTitle: string }>(workspaceId, credentialRef);
    if (!wordpressCredentials) {
      const email = String(process.env.HOSTINGER_WP_ADMIN_EMAIL || process.env.EMAIL_FROM || "").trim();
      if (!email) throw new Error("HOSTINGER_WP_ADMIN_EMAIL or EMAIL_FROM is required for WordPress administration");
      wordpressCredentials = { email, login: `bennie_${crypto.randomBytes(6).toString("hex")}`, password: crypto.randomBytes(24).toString("base64url"), siteTitle: String((onboardingRow.data as any).business?.name || order.customerName || "Managed Website") };
      await writeEncryptedIntegration(workspaceId, credentialRef, wordpressCredentials, { kind: "waas_wordpress_credentials", deploymentId });
      deployment = { ...deployment, wordpressCredentialRef: credentialRef };
      await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, updatedAt: new Date().toISOString() });
    }
    currentStepName = deployment.currentStep || names[0];
    for (const [index, name] of names.entries()) {
      currentStepName = name;
      const jobState = await supabaseServer.from("waas_deployment_jobs").select("status").eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).maybeSingle();
      if (jobState.data?.status === "cancelled") throw new Error("Deployment was cancelled");
      const stepId = `${deploymentId}-${name}`;
      const existingStepRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_deployment_steps", record_id: stepId, is_soft_deleted: false }).maybeSingle();
      const existingStep = existingStepRow.data?.data as any;
      if (existingStep?.status === "complete") continue;
      const step = { ...(existingStep || {}), id: stepId, workspaceId, deploymentId, name, status: "running", startedAt: new Date().toISOString(), retryCount: Number(existingStep?.retryCount || 0), logs: [...(existingStep?.logs || []), `Started ${name}`] };
      await upsertWaasRecord(workspaceId, "waas_deployment_steps", stepId, step);
      await supabaseServer.from("waas_deployment_jobs").update({ lease_expires_at: new Date(Date.now() + 300000).toISOString(), updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId).eq("status", "leased");
      if (process.env.WAAS_MOCK_FAIL_STEP === name && providerKind === "mock") throw new Error(`Configured mock failure at ${name}`);
      const domain = String((onboardingRow.data as any).website?.domain || "").trim();
      if (name === "validate_domain" && !domain) throw new Error("A domain is required before fulfilment can start");
      if (name === "provision_hosting" && !hosting) { hosting = await provider.createWebsite({ customerName: order.customerName, domain: domain || undefined }); deployment = { ...deployment, hostingInstallationId: hosting.installationId, temporaryUrl: hosting.temporaryUrl }; await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, updatedAt: new Date().toISOString() }); }
      if (name === "install_wordpress" && hosting) { const wp = await provider.installWordPress(hosting.installationId, wordpressCredentials); wordpressVersion = wp.wordpressVersion; if (wp.installationId) hosting = { ...hosting, installationId: wp.installationId }; deployment = { ...deployment, wordpressVersion, hostingInstallationId: hosting.installationId }; await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, updatedAt: new Date().toISOString() }); }
      if (name === "deploy_managed_connector" && hosting) await provider.installPlugin(hosting.installationId, "bennietay-managed-connector");
      if (name === "apply_template" && hosting) await provider.installTheme(hosting.installationId, themePackageId);
      if (name === "configure_lead_capture" && hosting) {
        const masterSecret = String(process.env.WAAS_CONNECTOR_INGEST_SECRET || "");
        if (!masterSecret) throw new Error("WAAS_CONNECTOR_INGEST_SECRET is required to configure lead capture");
        const connectorSecret = crypto.createHmac("sha256", masterSecret).update(`website:${websiteId}`).digest("hex");
        const onboarding = onboardingRow.data as any;
        await provider.configureManagedSite(hosting.installationId, { websiteId, adminApiUrl: String(process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"), connectorSecret, configuration: { ...template.configuration, business_name: onboarding.business?.name || order.customerName, hero: onboarding.business?.description || template.configuration?.hero, intro: onboarding.business?.description, phone: onboarding.business?.phone, email: onboarding.business?.email, service_areas: onboarding.business?.serviceAreas, services: onboarding.services?.mainServices, cta: onboarding.website?.preferredCta, primary_colour: onboarding.branding?.primaryColour, secondary_colour: onboarding.branding?.secondaryColour, template_id: order.templateId, template_version: template.version, niche: order.niche, style: order.style } });
      }
      if (name === "configure_domain_ssl" && hosting && domain) await provider.configureDomain(hosting.installationId, domain);
      if (name === "run_qa") {
        if (!hosting) throw new Error("Hosting must be provisioned before automated QA");
        const health = await provider.getWebsiteStatus(hosting.installationId);
        if (health.status !== "ready") throw new Error(`Website is not ready for review (status: ${health.status})`);
        if (health.sslStatus !== "active") throw new Error(`Website SSL is not active (status: ${health.sslStatus})`);
        if (providerKind === "hostinger") {
          const response = await fetch(hosting.temporaryUrl, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(10000) });
          if (response.status >= 500) throw new Error(`Preview returned HTTP ${response.status}`);
        }
        await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, qa: { passed: true, checkedAt: new Date().toISOString(), checks: ["hosting_ready", "ssl_active", "preview_reachable"] }, updatedAt: new Date().toISOString() });
      }
      const completed = { ...step, status: "complete", completedAt: new Date().toISOString(), logs: [...step.logs, `Completed ${name}`] };
      await upsertWaasRecord(workspaceId, "waas_deployment_steps", stepId, completed);
      deployment = { ...deployment, status: "running", provider: providerKind, currentStep: names[index + 1] || "review_gate", startedAt: deployment.startedAt || now, startedStep: index };
      if (index < names.length - 1) await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, updatedAt: new Date().toISOString() });
    }
    const website = { id: websiteId, workspaceId, orderId: deployment.orderId, customerId: order.customerId, domain: String((onboardingRow.data as any).website?.domain || "").trim(), productType: order.productType, niche: order.niche, style: order.style, theme: themePackageId, templateId: order.templateId, version: String(template.version || "1.0.0"), status: "review_required", deploymentStatus: "review_required", wordpressInstallationId: hosting?.installationId, wordpressCredentialRef: credentialRef, temporaryUrl: hosting?.temporaryUrl, wordpressVersion, supportAllowance: Number(plan?.updateAllowance || 0), updateAllowanceUsed: 0, connectorConfigured: true, lastHealthCheck: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; await upsertWaasRecord(workspaceId, "waas_websites", websiteId, website);
    await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, status: "review_required", provider: providerKind, currentStep: "review_gate", websiteId, completedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await upsertWaasRecord(workspaceId, "waas_orders", deployment.orderId, { ...order, websiteId, deploymentId, status: "review_required", updatedAt: new Date().toISOString() });
    await supabaseServer.from("waas_deployment_jobs").update({ status: "complete", worker_id: null, lease_expires_at: null, last_error: null, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId);
    await recordWaasActivity(workspaceId, "deployment_ready_for_review", "waas_deployment", deploymentId, { websiteId, previewUrl: hosting?.temporaryUrl });
    return res.json({ success: true, deploymentId, websiteId, status: "review_required", previewUrl: hosting?.temporaryUrl, requiresApproval: true });
  } catch (error) { console.error("WAAS deployment run failed", error); if (req.workspaceId && deploymentId) { try { const message = error instanceof Error ? error.message : "Deployment step failed"; const failedAt = new Date().toISOString(); const cancelled = message === "Deployment was cancelled"; const deploymentRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_deployments", record_id: deploymentId, is_soft_deleted: false }).maybeSingle(); const failedDeployment = deploymentRow.data?.data as any; const failedStepName = currentStepName || failedDeployment?.currentStep; await upsertWaasRecord(req.workspaceId, "waas_deployments", deploymentId, { ...(failedDeployment || {}), status: cancelled ? "cancelled" : "failed", currentStep: failedStepName, errorMessage: cancelled ? undefined : message, updatedAt: failedAt }); if (!cancelled && failedStepName) { const stepId = `${deploymentId}-${failedStepName}`; const stepRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_deployment_steps", record_id: stepId, is_soft_deleted: false }).maybeSingle(); await upsertWaasRecord(req.workspaceId, "waas_deployment_steps", stepId, { ...(stepRow.data?.data as any || {}), status: "failed", errorMessage: message, completedAt: failedAt, retryCount: Number((stepRow.data?.data as any)?.retryCount || 0) + 1 }); } if (!cancelled) await supabaseServer.from("waas_deployment_jobs").update({ status: "failed", worker_id: null, lease_expires_at: null, last_error: message, updated_at: failedAt }).eq("workspace_id", req.workspaceId).eq("deployment_id", deploymentId).eq("worker_id", workerId); await recordWaasActivity(req.workspaceId, cancelled ? "deployment_cancelled" : "deployment_failed", "waas_deployment", deploymentId, cancelled ? {} : { error: message, step: failedStepName }); } catch (persistError) { console.error("Could not persist WAAS deployment failure", persistError); } } return res.status(error instanceof Error && error.message === "Deployment was cancelled" ? 409 : 503).json({ error: error instanceof Error ? error.message : "WAAS deployment job failed" }); }
});

app.post("/api/waas/deployments/:id/retry", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  const deploymentId = req.params.id; const workspaceId = req.workspaceId!;
  const row = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_deployments", record_id: deploymentId, is_soft_deleted: false }).maybeSingle();
  if (row.error) return res.status(503).json({ error: "Deployment unavailable" });
  if (!row.data?.data) return res.status(404).json({ error: "Deployment not found" });
  const deployment = row.data.data as any;
  if (deployment.status !== "failed") return res.status(409).json({ error: "Only failed deployments can be retried" });
  const retryAt = new Date().toISOString();
  await upsertWaasRecord(workspaceId, "waas_deployments", deploymentId, { ...deployment, status: "queued", currentStep: deployment.currentStep || WAAS_DEPLOYMENT_STEPS[0], errorMessage: undefined, retryRequestedAt: retryAt, updatedAt: retryAt });
  await supabaseServer.from("waas_deployment_jobs").update({ status: "queued", worker_id: null, lease_expires_at: null, available_at: retryAt, last_error: null, updated_at: retryAt }).eq("workspace_id", workspaceId).eq("deployment_id", deploymentId);
  await recordWaasActivity(workspaceId, "deployment_retry_requested", "waas_deployment", deploymentId);
  return res.json({ success: true, deploymentId, status: "queued", next: `/api/waas/deployments/${encodeURIComponent(deploymentId)}/run` });
});

// Operational read model for the deployment console. Keeping logs server-side
// means operators can diagnose a failed job without exposing provider secrets
// or relying on the browser's in-memory state.
app.get("/api/waas/deployments/:id/logs", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations", "support"]), async (req: AuthenticatedRequest, res) => {
  const workspaceId = req.workspaceId!;
  const deploymentId = req.params.id;
  const deployment = await readWaasRecord(workspaceId, "waas_deployments", deploymentId);
  if (!deployment) return res.status(404).json({ error: "Deployment not found" });
  const [stepResult, activityResult, jobResult] = await Promise.all([
    supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: workspaceId, collection_name: "waas_deployment_steps", is_soft_deleted: false }).eq("data->>deploymentId", deploymentId).order("created_at", { ascending: true }),
    supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: workspaceId, collection_name: "waas_activities", is_soft_deleted: false }).eq("data->>entityId", deploymentId).order("created_at", { ascending: true }),
    supabaseServer.from("waas_deployment_jobs").select("status,attempts,worker_id,lease_expires_at,last_error,available_at,updated_at").match({ workspace_id: workspaceId, deployment_id: deploymentId }).maybeSingle(),
  ]);
  if (stepResult.error || activityResult.error || jobResult.error) return res.status(503).json({ error: "Deployment logs unavailable" });
  const steps = (stepResult.data || []).map(row => ({ id: row.record_id, ...(row.data as Record<string, unknown>) }));
  const activities = (activityResult.data || []).map(row => ({ id: row.record_id, ...(row.data as Record<string, unknown>) }));
  return res.json({ deployment: { id: deploymentId, ...deployment }, steps, activities, job: jobResult.data || null });
});

app.post("/api/waas/deployments/:id/cancel", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  const workspaceId = req.workspaceId!;
  const row = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_deployments", record_id: req.params.id, is_soft_deleted: false }).maybeSingle();
  if (row.error) return res.status(503).json({ error: "Deployment unavailable" });
  if (!row.data?.data) return res.status(404).json({ error: "Deployment not found" });
  const deployment = row.data.data as any;
  if (["review_required", "complete", "cancelled"].includes(String(deployment.status))) return res.status(409).json({ error: "Deployment cannot be cancelled in its current state" });
  const now = new Date().toISOString();
  await upsertWaasRecord(workspaceId, "waas_deployments", req.params.id, { ...deployment, status: "cancelled", cancelledAt: now, cancelledBy: req.user?.email, updatedAt: now });
  await supabaseServer.from("waas_deployment_jobs").update({ status: "cancelled", worker_id: null, lease_expires_at: null, updated_at: now }).eq("workspace_id", workspaceId).eq("deployment_id", req.params.id);
  await recordWaasActivity(workspaceId, "deployment_cancelled", "waas_deployment", req.params.id, {}, req.user?.email || "admin");
  return res.json({ success: true, deploymentId: req.params.id, status: "cancelled" });
});

app.post("/api/waas/websites/:websiteId/approve", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  const workspaceId = req.workspaceId!;
  const row = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_websites", record_id: req.params.websiteId, is_soft_deleted: false }).maybeSingle();
  if (row.error) return res.status(503).json({ error: "Website unavailable" });
  if (!row.data?.data) return res.status(404).json({ error: "Website not found" });
  const website = row.data.data as any;
  if (website.status !== "review_required" && website.status !== "customer_review") return res.status(409).json({ error: "Only a reviewed website can be approved" });
  const now = new Date().toISOString();
  const approved = { ...website, status: "approved", deploymentStatus: "approved", approvedAt: now, approvedBy: req.user?.email, updatedAt: now };
  await upsertWaasRecord(workspaceId, "waas_websites", req.params.websiteId, approved);
  if (website.orderId) {
    const orderRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_orders", record_id: website.orderId, is_soft_deleted: false }).maybeSingle();
    if (orderRow.data?.data) await upsertWaasRecord(workspaceId, "waas_orders", website.orderId, { ...(orderRow.data.data as any), status: "approved", updatedAt: now });
  }
  await recordWaasActivity(workspaceId, "website_approved", "waas_website", req.params.websiteId, {}, req.user?.email || "admin");
  return res.json({ success: true, website: approved });
});

app.post("/api/waas/websites/:websiteId/publish", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  const workspaceId = req.workspaceId!;
  const row = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_websites", record_id: req.params.websiteId, is_soft_deleted: false }).maybeSingle();
  if (row.error) return res.status(503).json({ error: "Website unavailable" });
  if (!row.data?.data) return res.status(404).json({ error: "Website not found" });
  const website = row.data.data as any;
  if (website.status !== "approved") return res.status(409).json({ error: "Website requires explicit approval before publishing" });
  if (!website.wordpressInstallationId) return res.status(409).json({ error: "WordPress installation is missing" });
  try {
    const health = await getHostingProvider().getWebsiteStatus(website.wordpressInstallationId);
    if (health.status !== "ready" || health.sslStatus !== "active") return res.status(409).json({ error: "Website cannot be marked live until WordPress and SSL are healthy", health });
    const now = new Date().toISOString();
    const liveUrl = website.liveUrl || website.temporaryUrl;
    const published = { ...website, status: "live", deploymentStatus: "complete", liveUrl, sslStatus: health.sslStatus, publishedAt: now, publishedBy: req.user?.email, lastHealthCheck: now, updatedAt: now };
    await upsertWaasRecord(workspaceId, "waas_websites", req.params.websiteId, published);
    if (website.orderId) {
      const orderRow = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_orders", record_id: website.orderId, is_soft_deleted: false }).maybeSingle();
      if (orderRow.data?.data) await upsertWaasRecord(workspaceId, "waas_orders", website.orderId, { ...(orderRow.data.data as any), status: "live", updatedAt: now });
    }
    await recordWaasActivity(workspaceId, "website_published", "waas_website", req.params.websiteId, { liveUrl }, req.user?.email || "admin");
    return res.json({ success: true, website: published });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : "Website publish verification failed" });
  }
});

app.post("/api/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || process.env.stripe_webhook_secret;
  const signature = req.headers["stripe-signature"];
  if (!stripe || !webhookSecret || !signature) return res.status(503).json({ error: "Stripe webhook is not configured" });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret); }
  catch (error: any) { return res.status(400).json({ error: `Invalid Stripe signature: ${error.message}` }); }
  try {
    const object: any = event.data.object; let metadata: any = object.metadata || {};
    if (event.type.startsWith("invoice.")) metadata = object.parent?.subscription_details?.metadata || object.subscription_details?.metadata || object.metadata || {};
    const workspaceId = String(metadata.workspaceId || ""); const proposalId = String(metadata.proposalId || ""); const waasOrderId = String(metadata.waasOrderId || "");
    const lifecycleEvents = new Set(["checkout.session.completed", "invoice.payment_succeeded", "invoice.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "charge.refunded"]);
    if (workspaceId && (proposalId || waasOrderId) && workspaceId === supabaseWorkspaceId && lifecycleEvents.has(event.type)) {
      const providerEventType = event.type === "checkout.session.completed" ? "checkout.completed" : event.type === "invoice.payment_succeeded" ? "invoice.paid" : event.type === "invoice.payment_failed" ? "invoice.payment_failed" : event.type === "charge.refunded" ? "refund.created" : event.type as any;
      const subscriptionEvent = { id: `subscription-event-${event.id}`, workspace_id: workspaceId, order_id: waasOrderId || proposalId, provider: "stripe", provider_event_id: event.id, event_type: providerEventType, status: "received", subscription_id: object.subscription || object.id || undefined, amount: Number(object.amount_paid ?? object.amount_total ?? object.amount_refunded ?? 0) / 100, currency: object.currency ? String(object.currency).toUpperCase() : undefined, payload: { type: event.type, id: event.id }, occurred_at: new Date((Number(object.created || event.created) || Math.floor(Date.now() / 1000)) * 1000).toISOString() };
      // A received event is deliberately retryable.  Never acknowledge a
      // duplicate until the business writes below have completed; otherwise a
      // transient database error can permanently lose a paid event.
      const existingEvent = await supabaseServer.from("waas_subscription_events").select("status").eq("workspace_id", workspaceId).eq("provider", "stripe").eq("provider_event_id", event.id).maybeSingle();
      if (existingEvent.error) throw existingEvent.error;
      if (existingEvent.data?.status === "processed") return res.json({ received: true, duplicate: true });
      const { error: eventUpsertError } = await supabaseServer.from("waas_subscription_events").upsert({ ...subscriptionEvent, status: "received" }, { onConflict: "workspace_id,provider,provider_event_id" });
      if (eventUpsertError) throw eventUpsertError;
      const isCheckoutPayment = event.type === "checkout.session.completed" && object.mode === "payment";
      const isSubscriptionInvoice = event.type === "invoice.payment_succeeded";
      const amountMinor = Number(isSubscriptionInvoice ? object.amount_paid : object.amount_total || 0);
      const currency = String(object.currency || "myr").toUpperCase(); const timestamp = new Date((Number(object.created || event.created) || Math.floor(Date.now() / 1000)) * 1000).toISOString();
      const { data: proposalRow } = proposalId ? await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "proposals", record_id: proposalId, is_soft_deleted: false }).maybeSingle() : { data: null } as any;
      const { data: waasOrderRow } = waasOrderId ? await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "waas_orders", record_id: waasOrderId, is_soft_deleted: false }).maybeSingle() : { data: null } as any;
      const writes: any[] = [{ workspace_id: workspaceId, collection_name: "stripe_events", record_id: event.id, data: { id: event.id, type: event.type, proposalId: proposalId || undefined, waasOrderId: waasOrderId || undefined, amount: amountMinor / 100, currency, processedAt: new Date().toISOString() }, is_soft_deleted: false, updated_at: new Date().toISOString() }];
      if ((isCheckoutPayment || isSubscriptionInvoice) && amountMinor > 0) {
        const revenueId = `stripe-${event.id}`;
        writes.push({ workspace_id: workspaceId, collection_name: "revenue_events", record_id: revenueId, data: { id: revenueId, workspaceId, businessUnit: "WAAS", sourceType: isSubscriptionInvoice ? "subscription" : "sale", externalId: object.id, customerName: object.customer_name || object.customer_details?.name || undefined, currency, grossRevenue: amountMinor / 100, costs: 0, fees: 0, status: "collected", occurredAt: timestamp, collectedAt: timestamp, metadata: { costsKnown: false, stripeEventId: event.id, proposalId: proposalId || undefined, waasOrderId: waasOrderId || undefined }, createdAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
      }
      if (proposalRow?.data) writes.push({ workspace_id: workspaceId, collection_name: "proposals", record_id: proposalId, data: { ...(proposalRow.data as any), status: "Paid", paymentStatus: "paid", stripeCustomerId: object.customer || undefined, stripeSubscriptionId: object.subscription || object.parent?.subscription_details?.subscription || undefined, paidAt: timestamp, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
      if (waasOrderRow?.data) {
        const nextStatus = event.type === "invoice.payment_failed" ? "failed" : event.type === "customer.subscription.deleted" || event.type === "charge.refunded" ? "cancelled" : "paid";
        const nextPaymentStatus = event.type === "charge.refunded" ? "refunded" : event.type === "invoice.payment_failed" ? "failed" : "paid";
        writes.push({ workspace_id: workspaceId, collection_name: "waas_orders", record_id: waasOrderId, data: { ...(waasOrderRow.data as any), status: nextStatus, paymentStatus: nextPaymentStatus, subscriptionId: object.subscription || object.id || object.parent?.subscription_details?.subscription || undefined, ...(nextStatus === "paid" ? { paidAt: timestamp } : {}), updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
      }
      const { error } = await supabaseServer.from("bos_records").upsert(writes, { onConflict: "workspace_id,collection_name,record_id" }); if (error) throw error;
      await supabaseServer.from("waas_subscription_events").update({ status: "processed" }).eq("workspace_id", workspaceId).eq("provider", "stripe").eq("provider_event_id", event.id);
      await recordWaasActivity(workspaceId, `stripe_${event.type.replaceAll(".", "_")}`, waasOrderId ? "waas_order" : "proposal", waasOrderId || proposalId, { eventId: event.id });
    }
    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    // Stripe must retry while the event remains unprocessed.  Marking the
    // durable event failed preserves the diagnostic without acknowledging it.
    try {
      const object: any = event.data.object;
      const metadata: any = object.metadata || object.parent?.subscription_details?.metadata || {};
      if (metadata.workspaceId && event.id) await supabaseServer.from("waas_subscription_events").update({ status: "failed" }).eq("workspace_id", String(metadata.workspaceId)).eq("provider", "stripe").eq("provider_event_id", event.id);
    } catch (persistError) { console.error("Stripe webhook failure state could not be persisted", persistError); }
    return res.status(503).json({ error: "Webhook could not be processed" });
  }
});

app.get("/healthz", (_req, res) => res.status(200).json({ status: "alive", timestamp: new Date().toISOString() }));
app.get("/readyz", (_req, res) => {
  const checks = {
    supabase: supabaseReady,
    liveMode: !isProduction || appMode === "live",
    waasIngest: !isProduction || Boolean(process.env.WAAS_INGEST_API_KEY),
    connectorSecret: !isProduction || Boolean(process.env.WAAS_CONNECTOR_INGEST_SECRET),
    portalSecret: !isProduction || Boolean(process.env.WAAS_PORTAL_SECRET),
  };
  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready", checks, environment: isProduction ? "production" : "development" });
});

app.get("/api/ops/monitoring", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations", "support"]), async (req: AuthenticatedRequest, res) => {
  try {
    const [deployments, tickets, sla] = await Promise.all([
      supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_deployments", is_soft_deleted: false }).limit(500),
      supabaseServer.from("bos_records").select("data").match({ workspace_id: req.workspaceId, collection_name: "waas_support_tickets", is_soft_deleted: false }).limit(500),
      supabaseServer.from("waas_ticket_sla").select("response_breached,resolution_breached").eq("workspace_id", req.workspaceId).limit(500),
    ]);
    if (deployments.error || tickets.error || sla.error) throw deployments.error || tickets.error || sla.error;
    const deploymentRows = deployments.data || []; const ticketRows = tickets.data || []; const slaRows = sla.data || [];
    return res.json({ timestamp: new Date().toISOString(), integrations: integrationStatus(), deployments: { queued: deploymentRows.filter(row => ["queued", "running", "waiting"].includes(String((row.data as any)?.status))).length, failed: deploymentRows.filter(row => (row.data as any)?.status === "failed").length, review: deploymentRows.filter(row => (row.data as any)?.status === "review_required").length }, support: { open: ticketRows.filter(row => !["resolved", "closed"].includes(String((row.data as any)?.status))).length, critical: ticketRows.filter(row => ["critical", "high"].includes(String((row.data as any)?.priority)) && !["resolved", "closed"].includes(String((row.data as any)?.status))).length, breached: slaRows.filter(row => row.response_breached || row.resolution_breached).length } });
  } catch (error) { console.error("Operations monitoring failed", error); return res.status(503).json({ error: "Monitoring data unavailable" }); }
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

    try {
      await createOutreachTasks(lead, settings);
    } catch (error) {
      // The lead is durable even if task creation is temporarily unavailable; the queue can be rebuilt safely.
      console.error("Outreach enrollment failed", error);
    }

    await logAuditEvent({ workspaceId, userId: "public_lead_form", userEmail: lead.email, action: "lead_captured", resourceType: "lead", resourceId: lead.id, after: { score, temperature, service: validated.service }, requestId: req.requestId });
    return res.status(201).json({ success: true, id: lead.id });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Validation failed", details: error.issues });
    console.error("Lead capture failed", error);
    return res.status(500).json({ error: "Lead capture failed" });
  }
});

async function processDueOutreach(workspaceId: string, actor: { uid: string; email?: string }, requestId?: string) {
    const settings = await readSettings(workspaceId);
    const [{ data: taskRows, error: taskError }, { data: leadRows, error: leadError }] = await Promise.all([
      supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: workspaceId, collection_name: "tasks", is_soft_deleted: false }),
      supabaseServer.from("bos_records").select("record_id,data").match({ workspace_id: workspaceId, collection_name: "leads", is_soft_deleted: false }),
    ]);
    if (taskError || leadError) throw taskError || leadError;
    const leads = new Map((leadRows || []).map(row => [row.record_id, { id: row.record_id, ...(row.data as any) }]));
    const due = (taskRows || []).map(row => ({ id: row.record_id, ...(row.data as any) })).filter((task: any) => task.status === "pending" && task.channel === "email" && new Date(task.dueDate).getTime() <= Date.now());
    let sent = 0; let skipped = 0; const errors: string[] = [];
    for (const task of due.slice(0, 50)) {
      const lead = leads.get(task.leadId);
      if (!lead || lead.details?.emailOptOut || !lead.email) { skipped++; continue; }
      try {
        const website = String(lead.details?.website || "").trim();
        if (!website) { skipped++; errors.push(`${task.id}: website audit required before custom outreach`); continue; }
        const audit = await auditWebsite(website);
        const auditTimestamp = new Date().toISOString();
        await supabaseServer.from("bos_records").upsert({ workspace_id: workspaceId, collection_name: "website_audits", record_id: lead.id, data: { id: lead.id, leadId: lead.id, ...audit, auditedAt: auditTimestamp }, is_soft_deleted: false, updated_at: auditTimestamp }, { onConflict: "workspace_id,collection_name,record_id" });
        if (audit.status !== "ready") { skipped++; errors.push(`${task.id}: ${audit.reason || "website audit requires review"}`); continue; }
        const result = await sendOutreachEmail(lead, task, settings, audit);
        if (!result.sent) { skipped++; continue; }
        const timestamp = new Date().toISOString();
        await supabaseServer.from("bos_records").upsert([
          { workspace_id: workspaceId, collection_name: "tasks", record_id: task.id, data: { ...task, status: "completed", completedAt: timestamp, outcome: "Email sent automatically", providerMessageId: result.providerMessageId }, is_soft_deleted: false, updated_at: timestamp },
          { workspace_id: workspaceId, collection_name: "outreach_events", record_id: `send-${task.id}`, data: { id: `send-${task.id}`, leadId: lead.id, taskId: task.id, channel: "email", direction: "outbound", status: "sent", providerMessageId: result.providerMessageId, auditId: lead.id, createdAt: timestamp }, is_soft_deleted: false, updated_at: timestamp },
        ], { onConflict: "workspace_id,collection_name,record_id" });
        sent++;
      } catch (error: any) { errors.push(`${task.id}: ${error?.message || "send failed"}`); }
    }
    await logAuditEvent({ workspaceId, userId: actor.uid, userEmail: actor.email, action: "outreach_queue_processed", resourceType: "outreach", resourceId: workspaceId, after: { due: due.length, sent, skipped, errors: errors.length }, requestId });
    return { success: true, due: due.length, sent, skipped, errors };
}

app.post("/api/outreach/process-due", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    return res.json(await processDueOutreach(req.workspaceId!, { uid: req.user!.uid, email: req.user!.email }, req.requestId));
  } catch (error) {
    console.error("Outreach queue processing failed", error);
    return res.status(503).json({ error: "Outreach queue could not be processed" });
  }
});

// Vercel Cron invokes this endpoint without a user session. Keep it fail-closed
// behind CRON_SECRET and process only the configured workspace.
app.all("/api/cron/outreach", async (req, res) => {
  const expected = String(process.env.CRON_SECRET || "");
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return res.status(401).json({ error: "Unauthorized" });
  try {
    return res.json(await processDueOutreach(supabaseWorkspaceId, { uid: "vercel_cron", email: "cron@bennietay.com" }, String(req.headers["x-request-id"] || "cron")));
  } catch (error) {
    console.error("Scheduled outreach processing failed", error);
    return res.status(503).json({ error: "Scheduled outreach could not be processed" });
  }
});

// Vercel Cron claims a small batch of queued WAAS deployments and starts the
// same idempotent runner used by the admin UI. The runner persists each step,
// so a timeout or retry resumes safely rather than duplicating completed work.
app.all("/api/cron/waas-deployments", async (req, res) => {
  const expected = String(process.env.CRON_SECRET || "");
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return res.status(401).json({ error: "Unauthorized" });
  try {
    const now = new Date().toISOString();
    const { data: rows, error } = await supabaseServer.from("waas_deployment_jobs").select("deployment_id,status,lease_expires_at").eq("workspace_id", supabaseWorkspaceId).or(`status.eq.queued,lease_expires_at.lt.${now}`).order("created_at", { ascending: true }).limit(5);
    if (error) throw error;
    const baseUrl = process.env.PUBLIC_APP_URL || "https://admin.bennietay.com";
    const results = [];
    for (const row of rows || []) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Number(process.env.WAAS_CRON_RUN_TIMEOUT_MS || 240000));
      try {
        const response = await fetch(`${baseUrl}/api/waas/deployments/${encodeURIComponent(row.deployment_id)}/run`, { method: "POST", headers: { Authorization: `Bearer ${expected}`, "x-workspace-id": supabaseWorkspaceId, "x-request-id": `cron-waas-${row.deployment_id}` }, signal: controller.signal });
        results.push({ deploymentId: row.deployment_id, status: response.status });
      } catch (runError) { results.push({ deploymentId: row.deployment_id, status: "error", error: runError instanceof Error ? runError.message : "runner unavailable" }); }
      finally { clearTimeout(timer); }
    }
    return res.json({ success: true, claimed: results.length, results });
  } catch (error) { console.error("Scheduled WAAS deployment processing failed", error); return res.status(503).json({ error: "Scheduled WAAS deployments could not be processed" }); }
});

app.get("/api/outreach/opt-out", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).send("Missing unsubscribe token");
  try {
    const { data: rows, error } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "leads").eq("is_soft_deleted", false);
    if (error) throw error;
    const row = (rows || []).find(item => { const lead = { id: item.record_id, ...(item.data as any) }; return lead.email && outreachTokenValid(lead, token); });
    if (!row) return res.status(404).send("This unsubscribe link is invalid or expired.");
    const lead = { id: row.record_id, ...(row.data as any) }; const timestamp = new Date().toISOString();
    await supabaseServer.from("bos_records").upsert([
      { workspace_id: supabaseWorkspaceId, collection_name: "leads", record_id: lead.id, data: { ...lead, details: { ...(lead.details || {}), emailOptOut: true, optedOutAt: timestamp }, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp },
    ], { onConflict: "workspace_id,collection_name,record_id" });
    return res.status(200).send("You have been unsubscribed from Bennie Studio follow-up emails.");
  } catch (error) { console.error("Outreach opt-out failed", error); return res.status(503).send("Unable to process unsubscribe right now."); }
});

const affiliateEventSchema = z.object({
  type: z.enum(["program", "link", "click", "conversion", "commission", "content", "lead", "lead_magnet", "campaign"]),
  externalId: z.string().trim().min(1).max(200),
  occurredAt: z.string().datetime().optional(),
  status: z.string().trim().max(80).optional(),
  name: z.string().trim().max(240).optional(),
  partner: z.string().trim().max(160).optional(),
  url: z.string().url().max(2000).optional(),
  currency: z.string().trim().regex(/^[A-Z]{3}$/).optional(),
  amount: z.number().finite().min(0).max(100000000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function secretMatches(provided: string, expected: string) {
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

app.get("/api/integrations/affiliate/health", (_req, res) => {
  return res.status(process.env.AFFILIATE_INGEST_API_KEY ? 200 : 503).json({ configured: Boolean(process.env.AFFILIATE_INGEST_API_KEY), timestamp: new Date().toISOString() });
});

app.post("/api/integrations/affiliate/events", async (req: AuthenticatedRequest, res) => {
  const expectedKey = process.env.AFFILIATE_INGEST_API_KEY || "";
  const providedKey = String(req.headers["x-affiliate-api-key"] || "");
  if (!expectedKey) return res.status(503).json({ error: "Affiliate ingestion is not configured" });
  if (!providedKey || !secretMatches(providedKey, expectedKey)) return res.status(401).json({ error: "Invalid integration credential" });
  try {
    const event = affiliateEventSchema.parse(req.body); const timestamp = event.occurredAt || new Date().toISOString();
    const recordId = `${event.type}-${event.externalId}`;
    const record = { id: recordId, workspaceId: supabaseWorkspaceId, kind: event.type, ...event, createdAt: timestamp, updatedAt: new Date().toISOString() };
    const writes: any[] = [{ workspace_id: supabaseWorkspaceId, collection_name: "affiliate_records", record_id: recordId, data: record, is_soft_deleted: false, updated_at: record.updatedAt }];
    if (event.type === "commission" && event.amount !== undefined) {
      const commissionStatus = String(event.status || "pending").toLowerCase();
      const revenueStatus = commissionStatus === "paid" ? "collected" : commissionStatus === "confirmed" ? "booked" : commissionStatus === "reversed" ? "cancelled" : "expected";
      const revenueId = `affiliate-${event.externalId}`;
      writes.push({ workspace_id: supabaseWorkspaceId, collection_name: "revenue_events", record_id: revenueId, data: { id: revenueId, workspaceId: supabaseWorkspaceId, businessUnit: "AFFILIATE", sourceType: "commission", externalId: event.externalId, customerName: event.partner, currency: event.currency || "MYR", grossRevenue: event.amount, costs: 0, fees: 0, status: revenueStatus, occurredAt: timestamp, collectedAt: revenueStatus === "collected" ? timestamp : undefined, metadata: { costsKnown: false, affiliateStatus: commissionStatus }, createdAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
    }
    const { error } = await supabaseServer.from("bos_records").upsert(writes, { onConflict: "workspace_id,collection_name,record_id" });
    if (error) throw error;
    await logAuditEvent({ workspaceId: supabaseWorkspaceId, userId: "affiliate_integration", action: "affiliate_event_ingested", resourceType: event.type, resourceId: event.externalId, after: { status: event.status, amount: event.amount, currency: event.currency }, requestId: req.requestId });
    return res.status(202).json({ accepted: true, id: recordId });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid affiliate event", details: error.issues });
    console.error("Affiliate event ingestion failed", error); return res.status(503).json({ error: "Affiliate event could not be stored" });
  }
});

app.post("/api/integrations/etsy/connect", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  if (!integrationStatus().etsyConfigured) return res.status(503).json({ error: "Etsy OAuth environment variables are incomplete" });
  try {
    const state = crypto.randomBytes(32).toString("base64url"); const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    await writeEncryptedIntegration(req.workspaceId!, `etsy-flow-${state}`, { verifier, userId: req.user!.uid, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() }, { provider: "etsy_oauth_flow" });
    const params = new URLSearchParams({ response_type: "code", client_id: process.env.ETSY_API_KEY || "", redirect_uri: process.env.ETSY_REDIRECT_URI || "", scope: etsyScopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256" });
    return res.json({ authorizationUrl: `https://www.etsy.com/oauth/connect?${params.toString()}` });
  } catch (error) { console.error("Etsy connect failed", error); return res.status(503).json({ error: "Unable to start Etsy connection" }); }
});

app.get("/api/integrations/etsy/callback", async (req, res) => {
  const state = String(req.query.state || ""); const code = String(req.query.code || "");
  if (!state || !code) return res.redirect(safeAppRedirect("etsy=connection_failed"));
  try {
    const flow = await readEncryptedIntegration<{ verifier: string; userId: string; expiresAt: string }>(supabaseWorkspaceId, `etsy-flow-${state}`);
    if (!flow || new Date(flow.expiresAt).getTime() < Date.now()) throw new Error("OAuth request expired");
    const response = await fetch("https://api.etsy.com/v3/public/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: process.env.ETSY_API_KEY || "", redirect_uri: process.env.ETSY_REDIRECT_URI || "", code, code_verifier: flow.verifier }) });
    const result = await response.json() as any;
    if (!response.ok) throw new Error(result?.error_description || "Etsy rejected the authorization code");
    const token: EtsyToken = { access_token: result.access_token, refresh_token: result.refresh_token, expires_at: new Date(Date.now() + Number(result.expires_in || 3600) * 1000).toISOString(), scope: result.scope || etsyScopes.join(" ") };
    await writeEncryptedIntegration(supabaseWorkspaceId, "etsy", token, { provider: "etsy", connected: true, scopes: token.scope.split(" ") });
    await supabaseServer.from("bos_records").update({ is_soft_deleted: true, updated_at: new Date().toISOString() }).match({ workspace_id: supabaseWorkspaceId, collection_name: "integration_secrets", record_id: `etsy-flow-${state}` });
    return res.redirect(safeAppRedirect("etsy=connected"));
  } catch (error) { console.error("Etsy callback failed", error); return res.redirect(safeAppRedirect("etsy=connection_failed")); }
});

app.get("/api/integrations/etsy/status", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  try {
    const token = await readEncryptedIntegration<EtsyToken>(req.workspaceId!, "etsy");
    return res.json({ configured: integrationStatus().etsyConfigured, connected: Boolean(token), shopId: token?.shop_id, shopName: token?.shop_name, scopes: token?.scope?.split(" ") || [], tokenHealthy: token ? new Date(token.expires_at).getTime() > Date.now() : false, lastSyncAt: token?.last_sync_at });
  } catch (error) { console.error("Etsy status failed", error); return res.status(503).json({ error: "Etsy status is unavailable" }); }
});

app.post("/api/integrations/etsy/sync", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  try {
    let token = await etsyToken(req.workspaceId!); const userId = token.access_token.split(".")[0];
    const shopResult = await etsyRequest(token, `/users/${encodeURIComponent(userId)}/shops`); const shop = shopResult.results?.[0] || shopResult;
    if (!shop?.shop_id) throw new Error("No Etsy shop was found for this account");
    const [listingResult, receiptResult] = await Promise.all([etsyRequest(token, `/shops/${shop.shop_id}/listings/active?limit=100`), etsyRequest(token, `/shops/${shop.shop_id}/receipts?limit=100`)]);
    const timestamp = new Date().toISOString(); const records: any[] = [];
    for (const listing of listingResult.results || []) {
      const money = listing.price || {}; const price = Number(money.amount || 0) / Number(money.divisor || 100);
      const id = `listing-${listing.listing_id}`; records.push({ workspace_id: req.workspaceId, collection_name: "etsy_records", record_id: id, data: { id, workspaceId: req.workspaceId, kind: "listing", name: listing.title || id, status: listing.state || "active", revenue: price, externalId: String(listing.listing_id), createdAt: listing.creation_timestamp ? new Date(listing.creation_timestamp * 1000).toISOString() : timestamp, updatedAt: timestamp, metadata: { quantity: listing.quantity, url: listing.url, taxonomyId: listing.taxonomy_id } }, is_soft_deleted: false, updated_at: timestamp });
    }
    for (const receipt of receiptResult.results || []) {
      const total = receipt.grandtotal || receipt.total_price || {}; const gross = Number(total.amount || 0) / Number(total.divisor || 100); const currency = total.currency_code || "MYR";
      const id = `order-${receipt.receipt_id}`; records.push({ workspace_id: req.workspaceId, collection_name: "etsy_records", record_id: id, data: { id, workspaceId: req.workspaceId, kind: "order", name: receipt.name || `Etsy order ${receipt.receipt_id}`, status: receipt.status || (receipt.is_paid ? "paid" : "pending"), revenue: gross, externalId: String(receipt.receipt_id), createdAt: receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000).toISOString() : timestamp, updatedAt: timestamp, metadata: { isPaid: Boolean(receipt.is_paid), isShipped: Boolean(receipt.is_shipped), messageFromBuyer: receipt.message_from_buyer || undefined } }, is_soft_deleted: false, updated_at: timestamp });
      const revenueStatus = receipt.is_paid ? "collected" : "booked"; const revenueId = `etsy-${receipt.receipt_id}`;
      records.push({ workspace_id: req.workspaceId, collection_name: "revenue_events", record_id: revenueId, data: { id: revenueId, workspaceId: req.workspaceId, businessUnit: "ETSY", sourceType: "sale", externalId: String(receipt.receipt_id), customerName: receipt.name || undefined, currency, grossRevenue: gross, costs: 0, fees: 0, status: revenueStatus, occurredAt: receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000).toISOString() : timestamp, collectedAt: receipt.is_paid ? timestamp : undefined, metadata: { costsKnown: false, source: "etsy_sync" }, createdAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
    }
    if (records.length) { const { error } = await supabaseServer.from("bos_records").upsert(records, { onConflict: "workspace_id,collection_name,record_id" }); if (error) throw error; }
    token = { ...token, shop_id: Number(shop.shop_id), shop_name: shop.shop_name || shop.title, last_sync_at: timestamp };
    await writeEncryptedIntegration(req.workspaceId!, "etsy", token, { provider: "etsy", connected: true, scopes: token.scope.split(" "), shopId: token.shop_id, shopName: token.shop_name, lastSyncAt: timestamp });
    await logAuditEvent({ workspaceId: req.workspaceId!, userId: req.user!.uid, userEmail: req.user!.email, action: "etsy_synced", resourceType: "integration", resourceId: "etsy", after: { listings: listingResult.results?.length || 0, orders: receiptResult.results?.length || 0 }, requestId: req.requestId });
    return res.json({ success: true, shop: token.shop_name, listings: listingResult.results?.length || 0, orders: receiptResult.results?.length || 0, lastSyncAt: timestamp });
  } catch (error: any) { console.error("Etsy sync failed", error); return res.status(503).json({ error: error?.message || "Etsy sync failed" }); }
});

app.delete("/api/integrations/etsy", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  const { error } = await supabaseServer.from("bos_records").update({ is_soft_deleted: true, updated_at: new Date().toISOString() }).match({ workspace_id: req.workspaceId, collection_name: "integration_secrets", record_id: "etsy" });
  if (error) return res.status(503).json({ error: "Etsy could not be disconnected" });
  await logAuditEvent({ workspaceId: req.workspaceId!, userId: req.user!.uid, userEmail: req.user!.email, action: "etsy_disconnected", resourceType: "integration", resourceId: "etsy", requestId: req.requestId });
  return res.json({ success: true });
});

app.get("/api/integrations/printify/status", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  return res.json({ configured: Boolean(process.env.PRINTIFY_API_TOKEN) });
});

app.post("/api/integrations/printify/sync", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations"]), async (req: AuthenticatedRequest, res) => {
  if (!process.env.PRINTIFY_API_TOKEN) return res.status(503).json({ error: "Printify is not configured" });
  try {
    const shops = await printifyRequest("/shops.json"); const selectedShops = Array.isArray(shops) ? shops : [];
    const timestamp = new Date().toISOString(); const records: any[] = []; let productCount = 0; let orderCount = 0; let exceptionCount = 0;
    for (const shop of selectedShops) {
      const [productsResult, ordersResult] = await Promise.all([printifyRequest(`/shops/${shop.id}/products.json?limit=50`), printifyRequest(`/shops/${shop.id}/orders.json?limit=10`)]);
      for (const product of productsResult.data || []) {
        const enabledVariants = (product.variants || []).filter((variant: any) => variant.is_enabled !== false); const costs = enabledVariants.map((variant: any) => Number(variant.cost || 0) / 100).filter((cost: number) => cost > 0);
        const id = `printify-product-${product.id}`; records.push({ workspace_id: req.workspaceId, collection_name: "printify_records", record_id: id, data: { id, workspaceId: req.workspaceId, kind: "product", name: product.title || id, status: product.visible === false ? "hidden" : "active", externalId: String(product.id), shopId: String(shop.id), productionCost: costs.length ? Math.min(...costs) : undefined, metadata: { blueprintId: product.blueprint_id, printProviderId: product.print_provider_id, variantCount: enabledVariants.length, images: product.images?.slice(0, 5) || [] }, createdAt: product.created_at || timestamp, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp }); productCount++;
      }
      for (const order of ordersResult.data || []) {
        const productionCost = (order.line_items || []).reduce((sum: number, item: any) => sum + Number(item.cost || 0) * Number(item.quantity || 1) / 100, 0); const shippingCost = (order.line_items || []).reduce((sum: number, item: any) => sum + Number(item.shipping_cost || 0) / 100, 0);
        const shipment = order.shipments?.[0]; const id = `printify-order-${order.id}`; const isException = ["canceled", "on-hold", "failed", "payment-not-received"].includes(String(order.status).toLowerCase());
        records.push({ workspace_id: req.workspaceId, collection_name: "printify_records", record_id: id, data: { id, workspaceId: req.workspaceId, kind: "order", name: order.metadata?.shop_order_label || `Printify order ${order.id}`, status: order.status || "unknown", externalId: String(order.id), shopId: String(shop.id), productionCost, shippingCost, trackingUrl: shipment?.url, metadata: { carrier: shipment?.carrier, trackingNumber: shipment?.number, lineItems: (order.line_items || []).map((item: any) => ({ productId: item.product_id, quantity: item.quantity, status: item.status, sku: item.metadata?.sku })) }, createdAt: order.created_at || timestamp, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp }); orderCount++;
        if (isException) {
          exceptionCount++; const noticeId = `printify-exception-${order.id}`; records.push({ workspace_id: req.workspaceId, collection_name: "notifications", record_id: noticeId, data: { id: noticeId, workspaceId: req.workspaceId, category: "critical", source: "ETSY", title: `Printify order requires attention`, message: `${order.metadata?.shop_order_label || order.id} is ${order.status}. Review it in Printify before taking further action.`, status: "unread", relatedEntityType: "printify_order", relatedEntityId: String(order.id), createdAt: timestamp, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp });
        }
      }
    }
    for (let offset = 0; offset < records.length; offset += 500) { const { error } = await supabaseServer.from("bos_records").upsert(records.slice(offset, offset + 500), { onConflict: "workspace_id,collection_name,record_id" }); if (error) throw error; }
    await logAuditEvent({ workspaceId: req.workspaceId!, userId: req.user!.uid, userEmail: req.user!.email, action: "printify_synced", resourceType: "integration", resourceId: "printify", after: { shops: selectedShops.length, products: productCount, orders: orderCount, exceptions: exceptionCount }, requestId: req.requestId });
    return res.json({ success: true, shops: selectedShops.length, products: productCount, orders: orderCount, exceptions: exceptionCount, lastSyncAt: timestamp });
  } catch (error: any) { console.error("Printify sync failed", error); return res.status(503).json({ error: error?.message || "Printify sync failed" }); }
});

const amwayRecord = z.record(z.string(), z.unknown());
const amwayImportSchema = z.object({
  prospects: z.array(amwayRecord).max(10000).default([]), customers: z.array(amwayRecord).max(10000).default([]),
  purchases: z.array(amwayRecord).max(25000).default([]), opportunities: z.array(amwayRecord).max(10000).default([]),
  activities: z.array(amwayRecord).max(25000).default([]), reorderTasks: z.array(amwayRecord).max(25000).default([]),
  products: z.array(amwayRecord).max(10000).default([]), scripts: z.array(amwayRecord).max(5000).default([]),
  teamMembers: z.array(amwayRecord).max(10000).default([]),
});

app.post("/api/integrations/amway/import", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin"]), async (req: AuthenticatedRequest, res) => {
  try {
    const payload = amwayImportSchema.parse(req.body); const timestamp = new Date().toISOString();
    const mappings: Array<[keyof typeof payload, string]> = [["prospects", "diamond_prospects"], ["customers", "diamond_customers"], ["purchases", "diamond_purchases"], ["opportunities", "diamond_opportunities"], ["activities", "diamond_activities"], ["reorderTasks", "diamond_reorder_tasks"], ["products", "diamond_products"], ["scripts", "diamond_scripts"], ["teamMembers", "diamond_team_members"]];
    const writes: any[] = [];
    for (const [key, collectionName] of mappings) for (const raw of payload[key]) {
      const id = String(raw.id || `${collectionName}-${crypto.randomUUID()}`); const normalized: any = { ...raw, id, workspaceId: req.workspaceId, importedAt: timestamp };
      if (key === "prospects") { normalized.createdAt = raw.createdAt || raw.addedDate || timestamp; normalized.updatedAt = raw.updatedAt || timestamp; }
      if (key === "customers") { normalized.createdAt = raw.createdAt || timestamp; normalized.updatedAt = raw.updatedAt || timestamp; }
      writes.push({ workspace_id: req.workspaceId, collection_name: collectionName, record_id: id, data: normalized, is_soft_deleted: false, updated_at: timestamp });
    }
    for (const purchase of payload.purchases) {
      const status = String(purchase.status || "Active"); if (status === "Cancelled") continue;
      const total = Number(purchase.totalPrice || (Number(purchase.unitPrice || 0) * Number(purchase.quantity || 1)) || 0); if (total <= 0) continue;
      const purchaseId = String(purchase.id); const revenueId = `amway-${purchaseId}`; const collected = ["Completed", "Reordered"].includes(status);
      writes.push({ workspace_id: req.workspaceId, collection_name: "revenue_events", record_id: revenueId, data: { id: revenueId, workspaceId: req.workspaceId, businessUnit: "AMWAY", sourceType: "sale", externalId: purchaseId, customerName: purchase.customerName, currency: "MYR", grossRevenue: total, costs: 0, fees: 0, status: collected ? "collected" : "booked", occurredAt: purchase.purchaseDate ? new Date(`${purchase.purchaseDate}T00:00:00`).toISOString() : timestamp, collectedAt: collected ? timestamp : undefined, metadata: { costsKnown: false, pv: purchase.pv, bv: purchase.bv, source: "diamond_path_import" }, createdAt: purchase.createdAt || timestamp }, is_soft_deleted: false, updated_at: timestamp });
    }
    for (let offset = 0; offset < writes.length; offset += 500) { const { error } = await supabaseServer.from("bos_records").upsert(writes.slice(offset, offset + 500), { onConflict: "workspace_id,collection_name,record_id" }); if (error) throw error; }
    const counts = Object.fromEntries(mappings.map(([key]) => [key, payload[key].length]));
    await logAuditEvent({ workspaceId: req.workspaceId!, userId: req.user!.uid, userEmail: req.user!.email, action: "amway_backup_imported", resourceType: "migration", resourceId: "diamond_path", after: counts, requestId: req.requestId });
    return res.json({ success: true, counts, revenueEventsMapped: payload.purchases.filter(item => String(item.status) !== "Cancelled" && Number(item.totalPrice || 0) > 0).length });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: "Invalid Diamond Path backup", details: error.issues });
    console.error("Amway import failed", error); return res.status(503).json({ error: "Diamond Path data could not be imported" });
  }
});

app.post("/api/ai/daily-brief", authenticateUser, requireWorkspace(), requireRole(["workspace_admin", "super_admin", "operations", "sales"]), async (req: AuthenticatedRequest, res) => {
  try {
    const workspaceId = req.workspaceId!; const dateKey = new Date().toISOString().slice(0, 10); const force = req.body?.force === true;
    if (!force) { const { data: cached } = await supabaseServer.from("bos_records").select("data").match({ workspace_id: workspaceId, collection_name: "daily_briefs", record_id: dateKey, is_soft_deleted: false }).maybeSingle(); if (cached?.data) return res.json({ ...cached.data, cached: true }); }
    const collections = ["revenue_events", "leads", "opportunities", "money_tasks", "notifications"];
    const { data: rows, error } = await supabaseServer.from("bos_records").select("collection_name,record_id,data").eq("workspace_id", workspaceId).in("collection_name", collections).eq("is_soft_deleted", false); if (error) throw error;
    const records = (collection: string) => (rows || []).filter(row => row.collection_name === collection).map(row => ({ id: row.record_id, ...(row.data as any) }));
    const revenue = records("revenue_events") as any[]; const leads = records("leads") as any[]; const opportunities = records("opportunities") as any[]; const tasks = records("money_tasks") as any[]; const notices = records("notifications") as any[];
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10); const month = dateKey.slice(0, 7);
    const yesterdayTotals = summarizeRevenue(revenue.filter(event => String(event.occurredAt || "").slice(0, 10) === yesterday)); const monthTotals = summarizeRevenue(revenue.filter(event => String(event.occurredAt || "").slice(0, 7) === month));
    const rankedTasks = tasks.filter(task => !["completed", "dismissed"].includes(task.status)).map(task => ({ ...task, expectedImpact: task.estimatedRevenueImpact !== undefined && task.probability !== undefined ? Number(task.estimatedRevenueImpact) * Number(task.probability) / 100 : null })).sort((a, b) => (b.expectedImpact ?? -1) - (a.expectedImpact ?? -1));
    const openOpportunities = opportunities.filter(opportunity => !["won", "lost"].includes(String(opportunity.stage || "").toLowerCase())); const risks = notices.filter(notice => notice.status === "unread" && ["critical", "warning"].includes(notice.category));
    const evidence = { date: dateKey, yesterday: yesterdayTotals, monthToDate: monthTotals, businessPerformance: revenueByBusiness(revenue), leads: { newThisMonth: leads.filter(lead => String(lead.createdAt || "").slice(0, 7) === month).length, reviewRequired: leads.filter(lead => ["imported_review_required", "researching"].includes(lead.status)).length }, openOpportunities: openOpportunities.map(opportunity => ({ name: opportunity.name || opportunity.title, stage: opportunity.stage, value: opportunity.estimatedValue || opportunity.expectedValue, currency: opportunity.currency, probability: opportunity.probability })).slice(0, 20), topTasks: rankedTasks.slice(0, 5).map(task => ({ title: task.title, business: task.businessUnit, reason: task.reason, recommendedAction: task.recommendedAction, expectedImpact: task.expectedImpact })), risks: risks.slice(0, 10).map(risk => ({ source: risk.source, title: risk.title, message: risk.message })) };
    let source = "deterministic"; let content = `# Daily Revenue Brief — ${dateKey}\n\n## Yesterday\nCollected: MYR ${yesterdayTotals.collected.toLocaleString()}\nEstimated profit with known costs: MYR ${yesterdayTotals.profit.toLocaleString()}\n\n## Month to Date\nCollected: MYR ${monthTotals.collected.toLocaleString()}\nBooked: MYR ${monthTotals.booked.toLocaleString()}\nExpected: MYR ${monthTotals.expected.toLocaleString()}\n\n## Biggest Opportunity\n${rankedTasks[0] ? `${rankedTasks[0].title}${rankedTasks[0].expectedImpact === null ? "" : ` — expected MYR ${rankedTasks[0].expectedImpact.toLocaleString()}`}` : "No evidence-backed Money Task is recorded."}\n\n## Biggest Risk\n${risks[0] ? `${risks[0].title}: ${risks[0].message}` : "No unresolved critical or warning notification."}\n\n## Top Actions Today\n${rankedTasks.length ? rankedTasks.slice(0, 5).map((task, index) => `${index + 1}. [${task.businessUnit}] ${task.recommendedAction}`).join("\n") : "No Money Tasks are recorded."}`;
    let usage: any = undefined; const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    if (process.env.GEMINI_API_KEY) {
      const prompt = `You are the evidence-bound CEO briefing layer for Bennie Revenue OS. Produce concise Markdown with sections Yesterday, Month to Date, WAAS, Etsy, Affiliate, Amway, Biggest Opportunity, Biggest Risk, and Top 5 Actions Today. Use only the JSON evidence below. Never invent or infer missing numbers. Label missing data plainly. Preserve MYR distinctions between collected, booked, expected and profit.\n\n${JSON.stringify(evidence)}`;
      const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method: "POST", headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ model, input: prompt }) }); const aiResult = await aiResponse.json() as any;
      if (!aiResponse.ok || !aiResult.output_text) throw new Error(aiResult?.error?.message || "Gemini did not return a brief");
      content = aiResult.output_text; source = "gemini"; usage = aiResult.usage || undefined;
    }
    const timestamp = new Date().toISOString(); const brief = { id: dateKey, workspaceId, date: dateKey, content, source, model: source === "gemini" ? model : undefined, usage, evidence, createdAt: timestamp };
    const { error: writeError } = await supabaseServer.from("bos_records").upsert([{ workspace_id: workspaceId, collection_name: "daily_briefs", record_id: dateKey, data: brief, is_soft_deleted: false, updated_at: timestamp }, { workspace_id: workspaceId, collection_name: "ai_jobs", record_id: `daily-brief-${dateKey}`, data: { id: `daily-brief-${dateKey}`, provider: source, model: source === "gemini" ? model : undefined, jobType: "daily_revenue_brief", usage, timestamp, relatedEntity: dateKey }, is_soft_deleted: false, updated_at: timestamp }], { onConflict: "workspace_id,collection_name,record_id" }); if (writeError) throw writeError;
    return res.json({ ...brief, cached: false });
  } catch (error: any) { console.error("Daily brief failed", error); return res.status(503).json({ error: error?.message || "Daily brief could not be generated" }); }
});

app.get("/api/settings/:workspaceId/public", async (req, res) => {
  if (req.params.workspaceId !== supabaseWorkspaceId) return res.status(404).json({ error: "Workspace not found" });
  try {
    const settings = await readSettings(req.params.workspaceId);
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
    settings.integrations = integrationStatus();
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
    updates.integrations = integrationStatus();
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
    const { data: rows, error } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "proposals").eq("is_soft_deleted", false);
    if (error) throw error;
    const row = (rows || []).find(item => item.data?.token === req.params.token);
    if (!row) return res.status(404).json({ error: "Proposal not found or no longer available" });
    const proposal = row.data as any;
    if (!["sent", "accepted", "payment pending", "paid"].includes(String(proposal.status).toLowerCase())) return res.status(404).json({ error: "Proposal not found or no longer available" });
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

app.post("/api/proposals/public/:token/checkout", acceptanceLimiter, async (req, res) => {
  if (!stripe || !process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: "Online payment is not configured" });
  try {
    const { data: rows, error } = await supabaseServer.from("bos_records").select("record_id,data").eq("workspace_id", supabaseWorkspaceId).eq("collection_name", "proposals").eq("is_soft_deleted", false);
    if (error) throw error;
    const row = (rows || []).find(item => item.data?.token === req.params.token); if (!row) return res.status(404).json({ error: "Proposal not found" });
    const proposal = { id: row.record_id, ...(row.data as any) };
    if (!["accepted", "payment pending"].includes(String(proposal.status).toLowerCase())) return res.status(409).json({ error: "Accept the proposal before payment" });
    if (proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now()) return res.status(410).json({ error: "This proposal has expired" });
    const currency = String(proposal.currency || "MYR").toLowerCase(); const totalOtc = Number(proposal.totalOTC || 0); const totalMrc = Number(proposal.totalMRC || 0);
    if (totalOtc <= 0 && totalMrc <= 0) return res.status(400).json({ error: "This proposal has no payable amount" });
    const metadata = { workspaceId: supabaseWorkspaceId, proposalId: proposal.id };
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (totalOtc > 0) lineItems.push({ quantity: 1, price_data: { currency, unit_amount: Math.round(totalOtc * 100), product_data: { name: `${proposal.title || "Bennie Studio project"} — one-off` } } });
    if (totalMrc > 0) lineItems.push({ quantity: 1, price_data: { currency, unit_amount: Math.round(totalMrc * 100), recurring: { interval: "month" }, product_data: { name: `${proposal.title || "Bennie Studio care plan"} — monthly` } } });
    const session = await stripe.checkout.sessions.create({ mode: totalMrc > 0 ? "subscription" : "payment", line_items: lineItems, customer_email: proposal.customerEmail || undefined, metadata, subscription_data: totalMrc > 0 ? { metadata } : undefined, success_url: `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/p/${encodeURIComponent(req.params.token)}?payment=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${process.env.PUBLIC_APP_URL || "https://admin.bennietay.com"}/p/${encodeURIComponent(req.params.token)}?payment=cancelled` });
    const timestamp = new Date().toISOString(); await supabaseServer.from("bos_records").upsert({ workspace_id: supabaseWorkspaceId, collection_name: "proposals", record_id: proposal.id, data: { ...proposal, paymentStatus: "checkout_created", stripeCheckoutSessionId: session.id, updatedAt: timestamp }, is_soft_deleted: false, updated_at: timestamp }, { onConflict: "workspace_id,collection_name,record_id" });
    return res.json({ checkoutUrl: session.url });
  } catch (error: any) { console.error("Stripe Checkout creation failed", error); return res.status(503).json({ error: error?.message || "Checkout could not be created" }); }
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
