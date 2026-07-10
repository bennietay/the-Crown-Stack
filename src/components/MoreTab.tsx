/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { 
  Settings, 
  Resource, 
  Payment, 
  PaymentStatus, 
  PaymentType, 
  ContentPost, 
  Referral, 
  Event as EventType, 
  UtmLink, 
  QrCode,
  InterestType,
  Lead,
  LeadStage,
  PermissionStatus
} from "../types";
import { localDb } from "../db/localDb";
import ScriptsLibrary from "./ScriptsLibrary";
import { 
  Settings as SettingsIcon, 
  BookOpen, 
  DollarSign, 
  BarChart3, 
  Calendar, 
  Megaphone, 
  Users, 
  QrCode as QrIcon, 
  Link as LinkIcon, 
  Globe, 
  AlertTriangle, 
  Plus, 
  Trash, 
  Download, 
  Upload,
  RefreshCw, 
  ShieldCheck, 
  CheckCircle,
  Copy,
  ExternalLink,
  FileText
} from "lucide-react";

interface MoreTabProps {
  settings: Settings;
  onUpdateSettings: (settings: Settings) => void;
}

export default function MoreTab({ settings, onUpdateSettings }: MoreTabProps) {
  // Active sub-section within More
  // 'resources' | 'payments' | 'analytics' | 'content' | 'referrals' | 'events' | 'utm' | 'qr' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<string>("settings");

  // Database lists
  const [resources, setResources] = useState<Resource[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [events, setEvents] = useState<EventType[]>([]);
  const [utms, setUtms] = useState<UtmLink[]>([]);
  const [qrs, setQrs] = useState<QrCode[]>([]);

  // Settings states
  const [settName, setSettName] = useState(settings.name);
  const [settPhone, setSettPhone] = useState(settings.whatsapp_phone);
  const [settEmail, setSettEmail] = useState(settings.email);
  const [settBrandName, setSettBrandName] = useState(settings.brand_name);
  const [settDailyLeads, setSettDailyLeads] = useState(settings.daily_lead_target);
  const [settDailyFollowups, setSettDailyFollowups] = useState(settings.daily_follow_up_target);
  const [settStripe, setSettStripe] = useState(settings.stripe_payment_link);

  // Growth / Scale creation fields
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState(100);
  const [payType, setPayType] = useState<PaymentType>(PaymentType.Workshop);
  const [payLeadId, setPayLeadId] = useState("");

  const [showAddPost, setShowAddPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postPlatform, setPostPlatform] = useState("TikTok");
  const [postHook, setPostHook] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postCategory, setPostCategory] = useState("Wellness habit");

  const [showAddReferral, setShowAddReferral] = useState(false);
  const [refName, setRefName] = useState("");
  const [refReferredName, setRefReferredName] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refNotes, setRefNotes] = useState("");

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evName, setEvName] = useState("");
  const [evType, setEvType] = useState("Networking Expo");
  const [evLocation, setEvLocation] = useState("");
  const [evDate, setEvDate] = useState("");

  const [showAddUtm, setShowAddUtm] = useState(false);
  const [utmName, setUtmName] = useState("");
  const [utmSrc, setUtmSrc] = useState("instagram");
  const [utmMed, setUtmMed] = useState("bio");
  const [utmCamp, setUtmCamp] = useState("summer");

  const [showAddQr, setShowAddQr] = useState(false);
  const [qrName, setQrName] = useState("");
  const [qrContent, setQrContent] = useState("");

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [settings]);

  const loadData = () => {
    setResources(localDb.getResources());
    setPayments(localDb.getPayments());
    setPosts(localDb.getContentPosts());
    setReferrals(localDb.getReferrals());
    setEvents(localDb.getEvents());
    setUtms(localDb.getUtmLinks());
    setQrs(localDb.getQrCodes());
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Settings = {
      ...settings,
      name: settName,
      whatsapp_phone: settPhone,
      email: settEmail,
      brand_name: settBrandName,
      daily_lead_target: settDailyLeads,
      daily_follow_up_target: settDailyFollowups,
      stripe_payment_link: settStripe
    };
    localDb.saveSettings(updated);
    onUpdateSettings(updated);
    alert("Settings saved successfully.");
  };

  const handleToggleMode = (mode: "grow" | "scale") => {
    const updated = {
      ...settings,
      grow_mode: true,
      scale_mode: mode === "scale" ? !settings.scale_mode : settings.scale_mode
    };
    localDb.saveSettings(updated);
    onUpdateSettings(updated);
  };

  const handleResetData = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently wipe out all local lead histories, pipeline stages, settings, and custom webhooks. Restoring workspace to default clean state. Proceed?")) {
      localDb.resetDemoData();
      alert("CRM Workspace successfully reset.");
      window.location.reload();
    }
  };

  const handleExportCsv = () => {
    const csv = localDb.exportToCsv("LEADS");
    if (!csv) {
      alert("No lead database records found to export.");
      return;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ProspectFlow_Leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvRow = (row: string) => {
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;

    for (let idx = 0; idx < row.length; idx += 1) {
      const char = row[idx];
      const next = row[idx + 1];

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        idx += 1;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map(value => value.trim());
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = String(event.target?.result || "");
        const rows = csvText.split(/\r?\n/).filter(Boolean);
        if (rows.length < 2) {
          throw new Error("CSV must include a header row and at least one lead row.");
        }

        const headers = parseCsvRow(rows[0]).map(header => header.trim());
        const importedLeads: Lead[] = rows.slice(1).map((row, index) => {
          const cells = parseCsvRow(row);
          const record = headers.reduce<Record<string, string>>((acc, header, cellIndex) => {
            acc[header] = cells[cellIndex] || "";
            return acc;
          }, {});

          const now = new Date().toISOString();
          const phone = (record.phone || record.whatsapp_phone || "").replace(/\D/g, "");
          if (!record.name || !phone) {
            throw new Error(`Row ${index + 2} is missing name or phone.`);
          }

          return {
            id: record.id || `l_import_${Date.now()}_${index}`,
            name: record.name,
            phone: phone.startsWith("0") ? `60${phone.substring(1)}` : phone,
            email: record.email || "",
            platform: record.platform || "CSV Import",
            source: record.source || "CSV Import",
            interest_type: Object.values(InterestType).includes(record.interest_type as InterestType)
              ? (record.interest_type as InterestType)
              : InterestType.Unknown,
            lead_temperature: ["Cold", "Warm", "Hot"].includes(record.lead_temperature)
              ? (record.lead_temperature as "Cold" | "Warm" | "Hot")
              : "Warm",
            stage: Object.values(LeadStage).includes(record.stage as LeadStage)
              ? (record.stage as LeadStage)
              : LeadStage.New,
            permission_status: Object.values(PermissionStatus).includes(record.permission_status as PermissionStatus)
              ? (record.permission_status as PermissionStatus)
              : PermissionStatus.NoReplyYet,
            best_angle: record.best_angle || "",
            notes: record.notes || "",
            last_contacted_at: record.last_contacted_at || null,
            next_follow_up_at: record.next_follow_up_at || new Date().toISOString().split("T")[0],
            created_at: record.created_at || now,
            updated_at: now
          };
        });

        importedLeads.forEach(lead => localDb.saveLead(lead));
        loadData();
        alert(`Imported ${importedLeads.length} leads from CSV.`);
      } catch (err: any) {
        alert(`CSV import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddPaymentItem = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.savePayment({
      id: `p_${Date.now()}`,
      lead_id: payLeadId || null,
      webinar_id: "w1",
      stripe_payment_link: settings.stripe_payment_link,
      amount: payAmount,
      currency: "MYR",
      status: PaymentStatus.Paid,
      payment_type: payType,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    setShowAddPayment(false);
    loadData();
  };

  // Standard Stripe Developer Webhook test utility
  const handleTestStripeWebhook = () => {
    const mockLead = localDb.getLeads()[0];
    const incomingPayment: Payment = {
      id: `p_stripe_${Date.now()}`,
      lead_id: mockLead ? mockLead.id : null,
      webinar_id: "w1",
      stripe_payment_link: settings.stripe_payment_link || "https://buy.stripe.com/stripe_production_checkout",
      amount: 150.00,
      currency: "MYR",
      status: PaymentStatus.Paid,
      payment_type: PaymentType.Consultation,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    localDb.savePayment(incomingPayment);
    loadData();
    alert(`Stripe Event [checkout.session.completed] processed successfully. \n\nRecorded amount: RM 150.00.\nTarget Customer ID: ${mockLead ? mockLead.name : "Unassigned (Anonymous Lead)"}.\n\nThis payment transaction is securely stored in your CRM database.`);
  };

  const handleAddPostItem = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.saveContentPost({
      id: `cp_${Date.now()}`,
      title: postTitle,
      platform: postPlatform,
      post_date: new Date().toISOString().split("T")[0],
      hook: postHook,
      caption: postCaption,
      cta: "Link in bio",
      views: 0,
      comments: 0,
      dms: 0,
      leads_created: 0,
      category: postCategory,
      created_at: new Date().toISOString()
    });
    setShowAddPost(false);
    setPostTitle("");
    setPostHook("");
    setPostCaption("");
    loadData();
  };

  const handleAddReferralItem = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.saveReferral({
      id: `ref_${Date.now()}`,
      referrer_name: refName,
      referred_name: refReferredName,
      referred_phone: refPhone,
      interest_type: InterestType.Wellness,
      status: "New",
      follow_up_date: new Date().toISOString().split("T")[0],
      notes: refNotes,
      created_at: new Date().toISOString()
    });
    setShowAddReferral(false);
    setRefName("");
    setRefReferredName("");
    setRefPhone("");
    setRefNotes("");
    loadData();
  };

  const handleAddEventItem = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.saveEvent({
      id: `e_${Date.now()}`,
      event_name: evName,
      event_type: evType,
      location: evLocation,
      event_date: evDate,
      target_contacts: 10,
      actual_contacts: 0,
      leads_created: 0,
      follow_ups_created: 0,
      notes: "",
      created_at: new Date().toISOString()
    });
    setShowAddEvent(false);
    loadData();
  };

  const handleAddUtmItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBase = "https://brightfuture.my/register";
    const finalUrl = `${cleanBase}?utm_source=${utmSrc}&utm_medium=${utmMed}&utm_campaign=${utmCamp}`;
    localDb.saveUtmLink({
      id: `utm_${Date.now()}`,
      name: utmName,
      base_url: cleanBase,
      utm_source: utmSrc,
      utm_medium: utmMed,
      utm_campaign: utmCamp,
      utm_content: "signup",
      final_url: finalUrl,
      created_at: new Date().toISOString()
    });
    setShowAddUtm(false);
    setUtmName("");
    loadData();
  };

  const handleAddQrItem = (e: React.FormEvent) => {
    e.preventDefault();
    localDb.saveQrCode({
      id: `qr_${Date.now()}`,
      name: qrName,
      type: "Webinar",
      content: qrContent,
      created_at: new Date().toISOString()
    });
    setShowAddQr(false);
    setQrName("");
    setQrContent("");
    loadData();
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = weekStart.toISOString();
  const weeklyLeads = localDb.getLeads().filter(lead => lead.created_at >= weekStartIso);
  const weeklyTasksDone = localDb.getTasks().filter(task => task.completed_at && task.completed_at >= weekStartIso);
  const weeklyRegistrations = localDb.getWebinarRegistrations().filter(reg => reg.created_at >= weekStartIso);
  const weeklyPaidTotal = payments
    .filter(payment => payment.status === PaymentStatus.Paid && payment.created_at >= weekStartIso)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const weeklyCustomers = localDb.getLeads().filter(lead => lead.stage === LeadStage.Customer && lead.updated_at >= weekStartIso);
  const nextBestAction =
    weeklyLeads.length < settings.daily_lead_target
      ? "Add fresh prospects before creating more content."
      : weeklyTasksDone.length < settings.daily_follow_up_target
        ? "Clear overdue follow-ups before sending new invitations."
        : weeklyRegistrations.length === 0
          ? "Invite warm prospects into the webinar or call flow."
          : "Review which source created replies and repeat that action.";

  const sevenDayContentPlan = [
    {
      day: "Mon",
      focus: "Problem",
      hook: "The one daily wellness habit I wish I started earlier",
      cta: "Ask who wants the checklist."
    },
    {
      day: "Tue",
      focus: "Product routine",
      hook: "How I explain supplements without medical claims",
      cta: "Invite a product conversation."
    },
    {
      day: "Wed",
      focus: "Trust",
      hook: "Why I disclose Amway clearly from the first message",
      cta: "Ask who wants the transparent overview."
    },
    {
      day: "Thu",
      focus: "Beauty or home",
      hook: "A simple routine for humid Malaysian weather or busy homes",
      cta: "Offer a routine recommendation."
    },
    {
      day: "Fri",
      focus: "Business education",
      hook: "What a side business is not: no shortcuts, no guarantees",
      cta: "Invite to a 10-minute briefing."
    },
    {
      day: "Sat",
      focus: "Story",
      hook: "One conversation I learned from this week",
      cta: "Ask for comments or DMs."
    },
    {
      day: "Sun",
      focus: "Review",
      hook: "My weekly customer-building scoreboard",
      cta: "Invite warm prospects to next week."
    }
  ];

  return (
    <div className="space-y-4 pb-20 w-full font-sans text-gray-900">
      {/* Sub Modules Menu grid (Responsive bento styling) */}
      <div className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Growth Command Center</h3>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-center text-xs">
          {[
            { id: "resources", label: "Resources", icon: BookOpen, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "scripts", label: "Scripts", icon: FileText, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "payments", label: "Payments", icon: DollarSign, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "analytics", label: "Analytics", icon: BarChart3, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "content", label: "Posts Plan", icon: Calendar, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "referrals", label: "Referrals", icon: Users, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "events", label: "Events", icon: Megaphone, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "utm", label: "UTM Links", icon: LinkIcon, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "qr", label: "QR Codes", icon: QrIcon, activeColor: "text-blue-600 bg-blue-50/70 border-blue-100" },
            { id: "settings", label: "Settings", icon: SettingsIcon, activeColor: "text-gray-900 bg-gray-100 border-gray-200" }
          ].map(module => {
            const Icon = module.icon;
            return (
              <button
                id={`more-menu-${module.id}`}
                key={module.id}
                onClick={() => setActiveSubTab(module.id)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                  activeSubTab === module.id
                    ? `${module.activeColor} font-bold scale-95 shadow-xs`
                    : "bg-gray-50/50 border-gray-200 text-gray-500 hover:bg-gray-100/50"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[11px] truncate w-full font-medium">{module.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE MODULE WORKSPACE */}

      {/* RESOURCES MODULE */}
      {activeSubTab === "resources" && (
        <div className="space-y-4 animate-fade-in">
          {/* Eligibility Onboarding Reminder */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-[20px] space-y-1">
            <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sponsor Eligibility Reminder</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Check current Amway Malaysia eligibility and Rules of Conduct before active business activity. If you are not eligible to register independently, use this app only for learning and planning.
            </p>
          </div>

          <div className="space-y-2">
            {resources.map(res => (
              <div key={res.id} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded font-mono">
                    {res.category}
                  </span>
                  <span className="text-[9px] text-slate-400">Reviewed: {res.last_reviewed_at}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">{res.title}</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">{res.description}</p>
                {res.notes && (
                  <p className="p-2.5 bg-gray-50 rounded-xl border border-gray-200/60 text-[9px] text-slate-600 italic">
                    ABO Notes: "{res.notes}"
                  </p>
                )}
                <a
                  id={`res-link-${res.id}`}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-center rounded-xl text-[10px] font-bold text-slate-700 flex items-center justify-center space-x-1"
                >
                  <span>Open Official Resource Link</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCRIPTS MODULE */}
      {activeSubTab === "scripts" && (
        <div className="space-y-4 animate-fade-in">
          <ScriptsLibrary settings={settings} />
        </div>
      )}

      {/* PAYMENTS MODULE */}
      {activeSubTab === "payments" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Workshop & Guides Payment Transactions</h3>
              <p className="text-[10px] text-slate-400">Track consultation fees and webinar tickets</p>
            </div>
            <button
              id="payments-add-btn"
              onClick={() => setShowAddPayment(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Payment</span>
            </button>
          </div>

          {/* SCALE MODE ONLY Webhook confirmation production integration hub */}
          {settings.scale_mode && (
            <div className="bg-[#1a1a1a] text-white p-5 rounded-[24px] shadow-md space-y-3 relative overflow-hidden font-sans">
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-xs">Stripe Webhook Gateway Hub</span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">
                    Secured
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Automatically register payment events from your live Stripe account. Use this production listener endpoint inside your Stripe Developer Dashboard:
                </p>
                <div className="bg-black/40 border border-slate-850 p-2 rounded-xl flex items-center justify-between">
                  <span className="font-mono text-[9px] text-slate-350 truncate select-all pr-2">
                    https://api.amwaycrm.my/v1/stripe/webhook?phone={settings.whatsapp_phone}
                  </span>
                  <button
                    id="copy-webhook-url"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://api.amwaycrm.my/v1/stripe/webhook?phone=${settings.whatsapp_phone}`);
                      alert("Production Stripe Webhook Listener URL copied! Paste this in your Stripe Dashboard under Developers > Webhooks.");
                    }}
                    className="text-slate-400 hover:text-white shrink-0"
                    title="Copy URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="pt-1 flex gap-2">
                  <button
                    id="test-webhook-btn"
                    onClick={handleTestStripeWebhook}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-xl active:scale-95 transition-transform"
                  >
                    Test Connection Event
                  </button>
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    className="py-2 px-3 bg-white/10 hover:bg-white/25 border border-white/10 text-white font-bold text-[10px] rounded-xl flex items-center justify-center space-x-1"
                  >
                    <span>Stripe Keys</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-emerald-600 rounded-full blur-[60px] opacity-20"></div>
            </div>
          )}

          {/* Add Payment Form */}
          {showAddPayment && (
            <form onSubmit={handleAddPaymentItem} className="bg-white p-5 rounded-[24px] border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-1.5 border-gray-100">
                <span className="text-xs font-bold text-slate-800">Log Manual Payment</span>
                <button type="button" onClick={() => setShowAddPayment(false)} className="text-slate-400 text-xs hover:text-slate-600 font-semibold">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Amount (RM)</label>
                  <input
                    id="add-pay-amount"
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Item Classification</label>
                  <select
                    id="add-pay-type"
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as any)}
                    className="w-full p-2 border rounded-xl bg-white"
                  >
                    {Object.values(PaymentType).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                id="add-pay-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Record Payment
              </button>
            </form>
          )}

          {/* Payments list */}
          <div className="space-y-2">
            {payments.map(pay => (
              <div key={pay.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-800">{pay.payment_type}</span>
                    <span className="text-[8px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                      {pay.status}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">Transaction Date: {pay.created_at.split("T")[0]}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono text-slate-800">RM {pay.amount.toFixed(2)}</span>
                  <span className="block text-[8px] text-slate-400">{pay.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ANALYTICS MODULE */}
      {activeSubTab === "analytics" && (() => {
        const getLast7Days = () => {
          const dates = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split("T")[0]);
          }
          return dates;
        };

        const realOrders = localDb.getOrders() || [];
        const last7Days = getLast7Days();
        const isDemoData = realOrders.length === 0;

        const chartData = last7Days.map((date, idx) => {
          const dayOrders = realOrders.filter(o => o.order_date === date);
          let totalSales = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
          let volume = dayOrders.length;

          if (isDemoData) {
            const mockSales = [120, 240, 180, 320, 410, 290, 540];
            const mockVolumes = [1, 2, 1, 3, 4, 2, 5];
            totalSales = mockSales[idx];
            volume = mockVolumes[idx];
          }

          const dateObj = new Date(date);
          const label = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return { date, label, totalSales, volume };
        });

        return (
          <div className="space-y-4 animate-fade-in">
            {/* Start mode analytics */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b pb-1.5">CRM Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Leads Logged</span>
                  <span className="text-lg font-black text-slate-800 mt-1 block">{localDb.getLeads().length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Webinar registrations</span>
                  <span className="text-lg font-black text-slate-800 mt-1 block">{localDb.getWebinarRegistrations().length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Commissions</span>
                  <span className="text-lg font-black text-emerald-600 mt-1 block">RM {payments.filter(p => p.status === PaymentStatus.Paid).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Customer conversions</span>
                  <span className="text-lg font-black text-slate-800 mt-1 block">{localDb.getLeads().filter(l => l.stage === LeadStage.Customer).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-1.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Weekly Review</h3>
                <span className="text-[9px] text-slate-400 font-mono">Last 7 days</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <span className="text-[9px] font-bold text-blue-700 block uppercase">New Leads</span>
                  <span className="text-lg font-black text-blue-900 mt-1 block">{weeklyLeads.length}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <span className="text-[9px] font-bold text-emerald-700 block uppercase">Tasks Done</span>
                  <span className="text-lg font-black text-emerald-900 mt-1 block">{weeklyTasksDone.length}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <span className="text-[9px] font-bold text-indigo-700 block uppercase">Registrations</span>
                  <span className="text-lg font-black text-indigo-900 mt-1 block">{weeklyRegistrations.length}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <span className="text-[9px] font-bold text-amber-700 block uppercase">Customers</span>
                  <span className="text-lg font-black text-amber-900 mt-1 block">{weeklyCustomers.length}</span>
                </div>
                <div className="p-3 bg-slate-900 text-white rounded-xl">
                  <span className="text-[9px] font-bold text-slate-300 block uppercase">Paid</span>
                  <span className="text-lg font-black text-emerald-300 mt-1 block">RM {weeklyPaidTotal.toFixed(0)}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Next best action: </span>
                {nextBestAction}
              </div>
            </div>

            {/* DAILY SALES PERFORMANCE CHART - STACKS VERTICALLY ON MOBILE & TABLET */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales Value Line Chart */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Daily Sales (RM)</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">RM {chartData.reduce((acc, d) => acc + d.totalSales, 0).toFixed(2)}</span>
                  </div>
                  {isDemoData && (
                    <span className="text-[8px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      Demo Mode
                    </span>
                  )}
                </div>

                {/* Responsive Recharts Container */}
                <div className="h-44 w-full relative pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rechartsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#64748b" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dx={-2}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          borderColor: "#334155", 
                          borderRadius: "12px", 
                          fontSize: "10px",
                          fontFamily: "monospace" 
                        }}
                        labelClassName="text-slate-400 font-bold mb-1 block"
                        itemStyle={{ color: "#10b981", fontWeight: "bold" }}
                        formatter={(value: any) => [`RM ${parseFloat(value as string).toFixed(2)}`, "Sales"]}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#rechartsSalesGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order Volume Bar Chart */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Order Volume</span>
                    <span className="text-lg font-black text-indigo-400 font-mono">{chartData.reduce((acc, d) => acc + d.volume, 0)} Orders</span>
                  </div>
                  {isDemoData && (
                    <span className="text-[8px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      Demo Mode
                    </span>
                  )}
                </div>

                {/* Responsive Recharts Bar Container */}
                <div className="h-44 w-full relative pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#64748b" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        dy={6}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={9} 
                        tickLine={false} 
                        axisLine={false}
                        allowDecimals={false}
                        dx={-2}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: "#0f172a", 
                          borderColor: "#334155", 
                          borderRadius: "12px", 
                          fontSize: "10px",
                          fontFamily: "monospace" 
                        }}
                        labelClassName="text-slate-400 font-bold mb-1 block"
                        itemStyle={{ color: "#818cf8", fontWeight: "bold" }}
                        formatter={(value: any) => [value, "Orders"]}
                      />
                      <Bar 
                        dataKey="volume" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {isDemoData && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[10px] text-slate-500 flex items-start space-x-2 font-sans">
                <div className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase font-mono mt-0.5 shrink-0">Note</div>
                <p className="leading-relaxed">
                  Showing simulated sales trend data. Once you log customer order records inside the <strong>Products & Orders</strong> tab, this analytics console will automatically synchronize and render your real-time revenue trend.
                </p>
              </div>
            )}

            {/* GROW mode analytics */}
            {settings.grow_mode && (
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Social outreach and referrers</h3>
                  <span className="text-[8px] bg-emerald-100 text-emerald-800 font-bold px-1.5 rounded uppercase font-mono">Grow</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-600">Best Organic Lead Source:</span>
                    <span className="font-bold text-slate-800">Instagram Reel (30%)</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-600">Referrals registered:</span>
                    <span className="font-bold text-slate-800">{referrals.length} contacts</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                    <span className="text-slate-600">Social content ideas logged:</span>
                    <span className="font-bold text-slate-800">{posts.length} posts</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCALE mode analytics */}
            {settings.scale_mode && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wide">Funnel conversions math</h3>
                  <span className="text-[8px] bg-emerald-500 text-slate-900 font-bold px-1.5 rounded uppercase font-mono">Scale</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Webinar Attendance Rate:</span>
                    <span className="font-bold font-mono text-emerald-400">72%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Replay Watch Rate:</span>
                    <span className="font-bold font-mono text-emerald-400">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Direct Sponsor CTA click rate:</span>
                    <span className="font-bold font-mono text-emerald-400">12.5%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* GROW MODE CONTENT POSTS PLANNER */}
      {activeSubTab === "content" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Organic Content Idea Planner</h3>
              <p className="text-[10px] text-slate-400">Plan product recommendations & habits</p>
            </div>
            <button
              id="content-add-btn"
              onClick={() => setShowAddPost(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Post Idea</span>
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Simple 7-Day Content Plan</h3>
                <p className="text-[10px] text-slate-400">Use one post per day. Keep it educational and claim-safe.</p>
              </div>
              <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5">
                Launch Ready
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {sevenDayContentPlan.map(item => (
                <div key={item.day} className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[128px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-900">{item.day}</span>
                    <span className="text-[8px] bg-white border text-slate-500 px-1.5 py-0.5 rounded font-bold">{item.focus}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-2">{item.hook}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.cta}</p>
                </div>
              ))}
            </div>
          </div>

          {showAddPost && (
            <form onSubmit={handleAddPostItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase">Hook Idea Topic</label>
                <input
                  id="add-post-title"
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. My organic wellness routine"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Platform Channel</label>
                  <select
                    id="add-post-platform"
                    value={postPlatform}
                    onChange={(e) => setPostPlatform(e.target.value)}
                    className="w-full p-2 border rounded-xl bg-white"
                  >
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="LinkedIn">LinkedIn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Content Focus Category</label>
                  <select
                    id="add-post-category"
                    value={postCategory}
                    onChange={(e) => setPostCategory(e.target.value)}
                    className="w-full p-2 border rounded-xl bg-white"
                  >
                    <option value="Wellness habit">Wellness habit</option>
                    <option value="Product routine">Product routine</option>
                    <option value="Beauty/skincare">Beauty/skincare</option>
                    <option value="Home care">Home care</option>
                    <option value="Side-income journey">Side-income journey</option>
                  </select>
                </div>
              </div>
              <button
                id="add-post-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Save Post Idea
              </button>
            </form>
          )}

          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] bg-indigo-50 text-indigo-600 font-bold px-1.5 py-0.5 rounded font-mono uppercase">
                    {post.platform} • {post.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Date: {post.post_date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800">{post.title}</h4>
                <p className="text-[10px] text-slate-500 italic">Hook: "{post.hook}"</p>
                <p className="text-[10px] text-slate-500">Caption: "{post.caption}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROW MODE REFERRAL TRACKER */}
      {settings.grow_mode && activeSubTab === "referrals" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Customer Referral Tracker</h3>
              <p className="text-[10px] text-slate-400">Track warm sponsorship referrals</p>
            </div>
            <button
              id="referrals-add-btn"
              onClick={() => setShowAddReferral(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Referral</span>
            </button>
          </div>

          {showAddReferral && (
            <form onSubmit={handleAddReferralItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Referrer Name (Existing customer)</label>
                <input
                  id="add-ref-name"
                  type="text"
                  required
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                  placeholder="Rachel Tan"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Referred Friend Name</label>
                  <input
                    id="add-ref-friend"
                    type="text"
                    required
                    value={refReferredName}
                    onChange={(e) => setRefReferredName(e.target.value)}
                    placeholder="Sarah Lim"
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Friend's Phone</label>
                  <input
                    id="add-ref-phone"
                    type="text"
                    required
                    value={refPhone}
                    onChange={(e) => setRefPhone(e.target.value)}
                    placeholder="6016..."
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Context Notes</label>
                <input
                  id="add-ref-notes"
                  type="text"
                  value={refNotes}
                  onChange={(e) => setRefNotes(e.target.value)}
                  placeholder="Loves skin hydration routines"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <button
                id="add-ref-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Save Referral
              </button>
            </form>
          )}

          <div className="space-y-2">
            {referrals.map(ref => (
              <div key={ref.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">Friend: {ref.referred_name}</span>
                  <span className="text-[8px] bg-teal-50 text-teal-600 font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                    Status: {ref.status}
                  </span>
                </div>
                <p className="text-slate-500 font-mono text-[10px]">Phone: {ref.referred_phone} • Referrer: {ref.referrer_name}</p>
                <p className="text-slate-500 italic mt-1 text-[10px]">Notes: "{ref.notes}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROW MODE EVENTS TRACKER */}
      {settings.grow_mode && activeSubTab === "events" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Networking Events Tracker</h3>
              <p className="text-[10px] text-slate-400">Log in-person expos and workshops</p>
            </div>
            <button
              id="events-add-btn"
              onClick={() => setShowAddEvent(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          {showAddEvent && (
            <form onSubmit={handleAddEventItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Event Name</label>
                <input
                  id="add-ev-name"
                  type="text"
                  required
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  placeholder="Mid Valley Expo"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Location</label>
                  <input
                    id="add-ev-location"
                    type="text"
                    required
                    value={evLocation}
                    onChange={(e) => setEvLocation(e.target.value)}
                    placeholder="Kuala Lumpur"
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Date</label>
                  <input
                    id="add-ev-date"
                    type="date"
                    required
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>
              <button
                id="add-ev-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Log Event
              </button>
            </form>
          )}

          <div className="space-y-2">
            {events.map(ev => (
              <div key={ev.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs space-y-1">
                <h4 className="font-bold text-slate-800">{ev.event_name} ({ev.event_type})</h4>
                <p className="text-slate-400 font-mono text-[10px]">Location: {ev.location} • Date: {ev.event_date}</p>
                <p className="text-slate-500 text-[10px]">Target contacts: {ev.target_contacts} • Actual acquired: {ev.actual_contacts}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROW MODE UTM LINK BUILDER */}
      {settings.grow_mode && activeSubTab === "utm" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Webinar UTM Link Generator</h3>
              <p className="text-[10px] text-slate-400">Generate URL parameters to track content</p>
            </div>
            <button
              id="utm-add-btn"
              onClick={() => setShowAddUtm(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Link</span>
            </button>
          </div>

          {showAddUtm && (
            <form onSubmit={handleAddUtmItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase">Configuration Name</label>
                <input
                  id="add-utm-name"
                  type="text"
                  required
                  value={utmName}
                  onChange={(e) => setUtmName(e.target.value)}
                  placeholder="TikTok Bio Profile link"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Source</label>
                  <input
                    id="add-utm-source"
                    type="text"
                    required
                    value={utmSrc}
                    onChange={(e) => setUtmSrc(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Medium</label>
                  <input
                    id="add-utm-medium"
                    type="text"
                    required
                    value={utmMed}
                    onChange={(e) => setUtmMed(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Campaign</label>
                  <input
                    id="add-utm-campaign"
                    type="text"
                    required
                    value={utmCamp}
                    onChange={(e) => setUtmCamp(e.target.value)}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>
              <button
                id="add-utm-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Generate Final Link
              </button>
            </form>
          )}

          <div className="space-y-2">
            {utms.map(u => (
              <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-xs space-y-2">
                <h4 className="font-bold text-slate-800">{u.name}</h4>
                <div className="p-2 bg-slate-50 font-mono text-[9px] text-slate-600 rounded border break-all select-all">
                  {u.final_url}
                </div>
                <button
                  id={`copy-utm-${u.id}`}
                  onClick={() => handleCopyLink(u.final_url, u.id)}
                  className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[9px] flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedLink === u.id ? "Copied!" : "Copy URL"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROW MODE QR CODE GENERATOR */}
      {settings.grow_mode && activeSubTab === "qr" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800">QR Code Asset Manager</h3>
              <p className="text-[10px] text-slate-400">Generate scan codes for offline leaflet distribution</p>
            </div>
            <button
              id="qr-add-btn"
              onClick={() => setShowAddQr(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create QR</span>
            </button>
          </div>

          {showAddQr && (
            <form onSubmit={handleAddQrItem} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase">Asset Label</label>
                <input
                  id="add-qr-name"
                  type="text"
                  required
                  value={qrName}
                  onChange={(e) => setQrName(e.target.value)}
                  placeholder="Wellness Masterclass Leaflet"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-600 mb-0.5">Destination Content / Link</label>
                <input
                  id="add-qr-content"
                  type="text"
                  required
                  value={qrContent}
                  onChange={(e) => setQrContent(e.target.value)}
                  placeholder="https://brightfuture.my/register"
                  className="w-full p-2 border rounded-xl"
                />
              </div>
              <button
                id="add-qr-submit"
                type="submit"
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Generate Code Block
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-3">
            {qrs.map(qr => (
              <div key={qr.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center space-y-3">
                <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-dashed relative overflow-hidden">
                  <QrIcon className="w-16 h-16 text-slate-700" />
                  <div className="absolute bottom-1 right-1 bg-emerald-500 text-white text-[7px] py-0.5 px-1 rounded uppercase font-bold">
                    Scan Code
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{qr.name}</h4>
                  <p className="text-[8px] text-slate-400 truncate w-32 mt-0.5">{qr.content}</p>
                </div>
                <button
                  id={`download-qr-${qr.id}`}
                  onClick={() => alert(`Simulating high-resolution PNG asset download package for ${qr.name}.`)}
                  className="py-1 px-3 border rounded text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS MODULE */}
      {activeSubTab === "settings" && (
        <div className="space-y-4 animate-fade-in">
          {/* Active app mode display */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">System Authorization Modes</span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                <div>
                  <p className="font-bold text-slate-800">1. Launch Mode</p>
                  <p className="text-[10px] text-slate-400">Essential CRM, webinars, scripts, resource deck, and content planners</p>
                </div>
                <span className="text-[10px] bg-emerald-500 text-white font-bold py-0.5 px-2 rounded-full">ALWAYS ACTIVE</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg">
                <div>
                  <p className="font-bold text-slate-800">2. Scale Mode (Toggled)</p>
                  <p className="text-[10px] text-slate-400">Multiple webinars, advanced analytics, Stripe checkouts, and webhooks</p>
                </div>
                <button
                  id="toggle-scale-mode"
                  type="button"
                  onClick={() => handleToggleMode("scale")}
                  className={`text-[10px] font-bold py-1 px-3 rounded-full transition-colors ${
                    settings.scale_mode 
                      ? "bg-slate-950 text-white" 
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {settings.scale_mode ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Export & Data Admin */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data Administration</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <button
                id="export-csv-btn"
                onClick={handleExportCsv}
                className="p-2.5 border rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center space-x-1"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Export Leads (CSV)</span>
              </button>
              <label
                htmlFor="import-csv-input"
                className="p-2.5 border rounded-xl hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Import Leads (CSV)</span>
                <input
                  id="import-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportCsv}
                  className="hidden"
                />
              </label>
              <button
                id="reset-demo-data"
                onClick={handleResetData}
                className="p-2.5 border border-rose-150 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-4 h-4 text-rose-400" />
                <span>Clear CRM Workspace</span>
              </button>
            </div>
          </div>

          {/* Core Configuration settings form redirection banner */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-xs space-y-3.5 text-center font-sans">
            <SettingsIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Portal Settings Control Center</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                We've upgraded your settings hub! Global representative parameters, daily target configurations, live Stripe webhooks, and regulatory compliance filters are now managed from the dedicated <strong>Portal Settings</strong> control tab.
              </p>
            </div>
            <p className="text-[10px] text-blue-600 font-bold tracking-wide uppercase">
              Configure parameters on the "Portal Settings" Tab in your main sidebar →
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
