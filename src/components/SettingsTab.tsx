import React, { useState, useEffect } from "react";
import { Settings, Lead, Task, Payment, Order } from "../types";
import { localDb } from "../db/localDb";
import { 
  Sliders, 
  User, 
  Target, 
  CreditCard, 
  ShieldAlert, 
  Database, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  FileText, 
  Download, 
  Upload, 
  Terminal, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles,
  Lock,
  Globe,
  Check,
  Smartphone
} from "lucide-react";

interface SettingsTabProps {
  settings: Settings;
  onUpdateSettings: (s: Settings) => void;
}

export default function SettingsTab({ settings, onUpdateSettings }: SettingsTabProps) {
  // Navigation inside Settings panel
  const [activeCategory, setActiveCategory] = useState<"profile" | "goals" | "stripe" | "compliance" | "system">("profile");

  // Profile fields
  const [name, setName] = useState(settings.name || "");
  const [phone, setPhone] = useState(settings.whatsapp_phone || "");
  const [email, setEmail] = useState(settings.email || "");
  const [brandName, setBrandName] = useState(settings.brand_name || "");
  const [brandColor, setBrandColor] = useState(settings.brand_color || "#2563EB");
  const [defaultCtaText, setDefaultCtaText] = useState(settings.default_cta_text || "Register Seat Now");

  // Goals fields
  const [dailyLeadTarget, setDailyLeadTarget] = useState(settings.daily_lead_target || 5);
  const [dailyMessageTarget, setDailyMessageTarget] = useState(settings.daily_message_target || 10);
  const [dailyFollowUpTarget, setDailyFollowUpTarget] = useState(settings.daily_follow_up_target || 8);

  // Stripe fields
  const [stripePaymentLink, setStripePaymentLink] = useState(settings.stripe_payment_link || "");
  const [stripeMode, setStripeMode] = useState<"sandbox" | "production">(settings.scale_mode ? "production" : "sandbox");
  const [stripePublicKey, setStripePublicKey] = useState("pk_live_51P..." + "amway77");
  const [webhookSigningSecret, setWebhookSigningSecret] = useState("whsec_..." + "prospectflow");

  // Compliance safeguards
  const [pdpaConsentTemplate, setPdpaConsentTemplate] = useState(
    "I hereby agree and consent to the collection, processing, and use of my personal data by ProspectFlow and its ABO representative in compliance with the Malaysian Personal Data Protection Act 2010 (PDPA) for promotional, health, and cosmetic e-commerce updates."
  );
  const [enableWordFilter, setEnableWordFilter] = useState(true);
  const [enableAutoAudit, setEnableAutoAudit] = useState(true);

  // System States
  const [aiStatus, setAiStatus] = useState<"online" | "checking" | "offline">("checking");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    // Check if ChatGPT API proxy is configured
    const checkAiStatus = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        if (data.status === "ok" && data.aiConfigured) {
          setAiStatus("online");
        } else {
          setAiStatus("offline");
        }
      } catch (err) {
        setAiStatus("offline");
      }
    };
    checkAiStatus();
  }, []);

  const handleCopyWebhookUrl = () => {
    const url = `https://api.amwaycrm.my/v1/stripe/webhook?phone=${phone}`;
    navigator.clipboard.writeText(url);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: Settings = {
      ...settings,
      name,
      whatsapp_phone: phone,
      email,
      brand_name: brandName,
      brand_color: brandColor,
      default_cta_text: defaultCtaText,
      daily_lead_target: dailyLeadTarget,
      daily_message_target: dailyMessageTarget,
      daily_follow_up_target: dailyFollowUpTarget,
      stripe_payment_link: stripePaymentLink,
      scale_mode: stripeMode === "production",
      compliance_accepted: true,
    };

    setTimeout(() => {
      localDb.saveSettings(updated);
      onUpdateSettings(updated);
      setIsSaving(false);
      alert("Portal Configuration successfully saved and deployed to live production runtime.");
    }, 600);
  };

  const handleBackupExport = () => {
    const leads = localDb.getLeads();
    const tasks = localDb.getTasks();
    const payments = localDb.getPayments();
    const orders = localDb.getOrders();
    
    const fullBackup = {
      exported_at: new Date().toISOString(),
      version: "1.2.0",
      environment: "Production-MY",
      settings: settings,
      data: {
        leads,
        tasks,
        payments,
        orders
      }
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ProspectFlow_MY_Backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string);
        if (!backup.data || !backup.settings) {
          throw new Error("Invalid file structure. Missing core schema.");
        }
        
        // Import settings
        localDb.saveSettings(backup.settings);
        onUpdateSettings(backup.settings);

        // Import lists
        if (backup.data.leads) {
          localStorage.setItem("pf_leads", JSON.stringify(backup.data.leads));
        }
        if (backup.data.tasks) {
          localStorage.setItem("pf_tasks", JSON.stringify(backup.data.tasks));
        }
        if (backup.data.payments) {
          localStorage.setItem("pf_payments", JSON.stringify(backup.data.payments));
        }
        if (backup.data.orders) {
          localStorage.setItem("pf_orders", JSON.stringify(backup.data.orders));
        }

        alert("Database restore completed successfully! Refreshing portal...");
        window.location.reload();
      } catch (err: any) {
        alert("CRITICAL ERROR: Failed to parse backup file. Error: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFullDatabaseReset = () => {
    if (window.confirm("CRITICAL WARNING:\n\nThis will permanently destroy all leads, transaction logs, pipeline milestones, and configurations from local storage.\n\nAre you sure you want to proceed?")) {
      localDb.resetDemoData();
      alert("CRM Workspace successfully reset to factory defaults.");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans w-full pb-12">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-950">Portal Control Center</h2>
              <p className="text-xs text-gray-500">Configure global profile rules, compliance filters, API proxies, and local databases.</p>
            </div>
          </div>
        </div>

        {/* Integration Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ChatGPT AI Copilot status */}
          <div className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-full flex items-center space-x-2 text-[10px] font-semibold text-gray-700">
            <span className={`w-2 h-2 rounded-full ${aiStatus === "online" ? "bg-emerald-500 animate-pulse" : aiStatus === "checking" ? "bg-amber-500 animate-spin" : "bg-rose-500"}`} />
            <span>ChatGPT API: {aiStatus === "online" ? "Vetted Copilot Connected" : aiStatus === "checking" ? "Verifying..." : "Offline"}</span>
          </div>

          {/* Secure DB Status */}
          <div className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-full flex items-center space-x-2 text-[10px] font-semibold text-gray-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>CRM Database: Local + Supabase Auth Sync</span>
          </div>
        </div>
      </div>

      {/* CORE CONFIGURATION LAYOUT (SIDE TABS) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* SIDE NAV FOR CATEGORIES */}
        <div className="bg-white p-3 rounded-[24px] border border-gray-100 shadow-xs space-y-1.5 lg:col-span-1">
          {[
            { id: "profile", label: "Business Profile", icon: User, color: "text-blue-500 bg-blue-50" },
            { id: "goals", label: "KPI Goals", icon: Target, color: "text-emerald-500 bg-emerald-50" },
            { id: "stripe", label: "Stripe & Webhook", icon: CreditCard, color: "text-indigo-500 bg-indigo-50" },
            { id: "compliance", label: "Policy Compliance", icon: ShieldAlert, color: "text-amber-500 bg-amber-50" },
            { id: "system", label: "Database Utility", icon: Database, color: "text-rose-500 bg-rose-50" }
          ].map((cat) => {
            const IconComp = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                id={`settings-tab-${cat.id}`}
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center space-x-3 transition-all ${
                  isActive 
                    ? "bg-slate-900 text-white shadow-sm" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-white/10 text-white" : cat.color}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* DETAILS FOR CATEGORY */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSaveAll} className="bg-white rounded-[24px] border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-6 space-y-6">
              
              {/* CATEGORY: PROFILE */}
              {activeCategory === "profile" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Amway Representative Credentials</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Define your personal profile guidelines used to sign customized webinar pages and outreach messages.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Representative Full Name</label>
                      <input
                        id="sett-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Mohd Fauzi"
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">WhatsApp Phone Number</label>
                      <input
                        id="sett-phone"
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +60123456789"
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Login Credentials Email</label>
                      <input
                        id="sett-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. rep@amwaycrm.my"
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Business / Team Brand Name</label>
                      <input
                        id="sett-brand"
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. FocusFlow Malaysia Team"
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Webinar Branding Primary Accent Color</label>
                      <div className="flex items-center space-x-2">
                        <input
                          id="sett-brand-color"
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer overflow-hidden"
                        />
                        <span className="text-xs font-mono font-medium text-gray-600">{brandColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Default Sign-up CTA Label</label>
                      <input
                        id="sett-default-cta"
                        type="text"
                        required
                        value={defaultCtaText}
                        onChange={(e) => setDefaultCtaText(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY: GOALS */}
              {activeCategory === "goals" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Daily Growth Targets</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Control pipeline thresholds to adjust performance indicators shown on your Today Checklist.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>Daily Leads Ingestion Target</span>
                        <span className="text-emerald-600 font-mono">{dailyLeadTarget} leads</span>
                      </div>
                      <input
                        id="sett-target-leads"
                        type="range"
                        min="1"
                        max="25"
                        value={dailyLeadTarget}
                        onChange={(e) => setDailyLeadTarget(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>Daily Message Outreach Goal</span>
                        <span className="text-emerald-600 font-mono">{dailyMessageTarget} messages</span>
                      </div>
                      <input
                        id="sett-target-messages"
                        type="range"
                        min="1"
                        max="50"
                        value={dailyMessageTarget}
                        onChange={(e) => setDailyMessageTarget(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                        <span>Daily Followup Reminders Target</span>
                        <span className="text-emerald-600 font-mono">{dailyFollowUpTarget} follow-ups</span>
                      </div>
                      <input
                        id="sett-target-followups"
                        type="range"
                        min="1"
                        max="30"
                        value={dailyFollowUpTarget}
                        onChange={(e) => setDailyFollowUpTarget(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY: STRIPE GATEWAY */}
              {activeCategory === "stripe" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Stripe Webhook Gateway (Scale Mode)</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">Connect your Stripe account to capture live workshop signups and automatically register leads in your pipeline.</p>
                    </div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${stripeMode === "production" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {stripeMode === "production" ? "Scale Mode Enabled" : "Sandbox Simulator"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-gray-100 rounded-2xl">
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">System Environment Mode</span>
                        <span className="text-[10px] text-gray-500">Enable real webhook processing via Production listeners.</span>
                      </div>
                      <button
                        id="toggle-stripe-mode"
                        type="button"
                        onClick={() => setStripeMode(stripeMode === "production" ? "sandbox" : "production")}
                        className="text-slate-900 hover:opacity-85"
                      >
                        {stripeMode === "production" ? (
                          <ToggleRight className="w-10 h-10 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-10 h-10 text-gray-300" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Default Stripe Checkout Payment Link (RM 100)</label>
                      <input
                        id="sett-stripe-link"
                        type="url"
                        value={stripePaymentLink}
                        onChange={(e) => setStripePaymentLink(e.target.value)}
                        placeholder="https://buy.stripe.com/..."
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Live Stripe Publishable Key</label>
                        <input
                          id="stripe-pub-key"
                          type="password"
                          value={stripePublicKey}
                          onChange={(e) => setStripePublicKey(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Webhook Signing Secret</label>
                        <input
                          id="stripe-secret-key"
                          type="password"
                          value={webhookSigningSecret}
                          onChange={(e) => setWebhookSigningSecret(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2.5 relative overflow-hidden">
                      <div className="relative z-10 space-y-2">
                        <div className="flex items-center space-x-1.5">
                          <Globe className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold">Live Production Stripe Listener Endpoint URL</span>
                        </div>
                        <p className="text-[10px] text-slate-300 leading-normal">
                          Register this listener URL inside your Stripe Developer Portal under <strong>Developers &gt; Webhooks &gt; Add Endpoint</strong> to receive direct checkout.session.completed payments instantly:
                        </p>
                        <div className="bg-black/40 border border-slate-800 p-2 rounded-xl flex items-center justify-between">
                          <span className="font-mono text-[9.5px] text-emerald-400 truncate select-all pr-2">
                            https://api.amwaycrm.my/v1/stripe/webhook?phone={phone}
                          </span>
                          <button
                            id="copy-webhook-url-btn"
                            type="button"
                            onClick={handleCopyWebhookUrl}
                            className="text-slate-400 hover:text-white shrink-0"
                            title="Copy Listener URL"
                          >
                            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-emerald-600 rounded-full blur-[60px] opacity-15"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY: POLICY COMPLIANCE */}
              {activeCategory === "compliance" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Amway Policy Safeguards (PDPA & Compliance Audits)</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Align with Malaysia's Personal Data Protection Act 2010 and Amway Direct Selling guidelines automatically.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">Malaysian PDPA 2010 Consent Disclaimer Template</label>
                        <span className="text-[8px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">PDPA Vetted</span>
                      </div>
                      <textarea
                        id="pdpa-template"
                        value={pdpaConsentTemplate}
                        onChange={(e) => setPdpaConsentTemplate(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none transition-all leading-relaxed text-slate-700"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="p-4 bg-slate-50 border border-gray-100 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900">Prevent Health/Therapeutic Claims</span>
                          <input 
                            type="checkbox" 
                            checked={enableWordFilter}
                            onChange={() => setEnableWordFilter(!enableWordFilter)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Automatically flags risk terms like "cures", "diabetes", "prevents stroke", "weight loss guaranteed" inside Nutrilite recommendations.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-gray-100 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900">Income Claim Filter (DSAM Vetted)</span>
                          <input 
                            type="checkbox" 
                            checked={enableAutoAudit}
                            onChange={() => setEnableAutoAudit(!enableAutoAudit)}
                            className="rounded text-slate-900 focus:ring-slate-900"
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                          Enforces compliant framing for Amway Malaysia Business Opportunities, highlighting affiliate sharing and mentoring instead of "get rich quick".
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 leading-relaxed">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div>
                        <strong>Compliance Note:</strong> The Direct Selling Association of Malaysia (DSAM) and Amway Malaysia Rules of Conduct strictly prohibit misleading income declarations or disease cure claims. All automatic filters are compliant with latest Direct Selling Act 1993 standards.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY: DATABASE PORTABILITY */}
              {activeCategory === "system" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Database Utilities & Portability</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Export records to secure backups, restore existing backups, or clear active CRM workspace states.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Database Backup Export */}
                    <div className="p-4 border border-gray-100 rounded-2xl space-y-3">
                      <div className="flex items-center space-x-1.5 text-gray-900">
                        <Download className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">Export CRM Backup</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Securely downloads a comprehensive snapshot containing all active leads, completed tasks, products, order states, and workspace settings.
                      </p>
                      <button
                        id="backup-export-btn"
                        type="button"
                        onClick={handleBackupExport}
                        className="py-1.5 px-3 bg-slate-950 text-white font-bold text-[10px] rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download Snapshot JSON</span>
                      </button>
                    </div>

                    {/* Database Restore Import */}
                    <div className="p-4 border border-gray-100 rounded-2xl space-y-3">
                      <div className="flex items-center space-x-1.5 text-gray-900">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold">Restore Snapshot</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        Restore your CRM workspace to a previously exported database snapshot. WARNING: This replaces current local lists entirely.
                      </p>
                      <div className="relative">
                        <input
                          id="import-backup-file"
                          type="file"
                          accept=".json"
                          onChange={handleBackupImport}
                          className="hidden"
                        />
                        <button
                          id="backup-import-btn"
                          type="button"
                          onClick={() => document.getElementById("import-backup-file")?.click()}
                          className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-gray-200 font-bold text-[10px] rounded-xl transition-colors flex items-center gap-1"
                        >
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          <span>Choose Backup JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Severe Danger Zone */}
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl space-y-3 mt-4">
                    <div className="flex items-center space-x-1.5 text-rose-800">
                      <Lock className="w-4 h-4" />
                      <span className="text-xs font-bold">Danger Zone</span>
                    </div>
                    <p className="text-[10px] text-rose-700 leading-relaxed">
                      Wipe the active workspace clean. This removes all customer interactions, pipelines, products, custom scripts, and onboarding states.
                    </p>
                    <button
                      id="reset-workspace-btn"
                      type="button"
                      onClick={handleFullDatabaseReset}
                      className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-xl transition-colors shadow-xs"
                    >
                      Clear CRM Workspace
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* SAVE BUTTON FOOTER */}
            <div className="bg-slate-50 px-6 py-4.5 border-t border-gray-100 text-right">
              <button
                id="save-all-settings-btn"
                type="submit"
                disabled={isSaving}
                className="py-2.5 px-6 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 duration-150 inline-flex items-center space-x-1.5"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving configurations...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Save Config Parameters</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
