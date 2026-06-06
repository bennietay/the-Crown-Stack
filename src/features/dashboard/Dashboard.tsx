import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  DollarSign,
  Flame,
  HeartHandshake,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Users,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import { trackDupliosEvent } from "../../lib/tracking";
import type { DupliosUserProfile, LeadRecord, ScriptAsset } from "../../types/tenant";

interface DashboardProps {
  profile: DupliosUserProfile;
  scripts: ScriptAsset[];
  leads?: LeadRecord[];
  onNavigate?: (view: string) => void;
}

type ActionCard = {
  title: string;
  value: string;
  body: string;
  view: string;
  icon: typeof Users;
  tone: "blue" | "gold" | "green" | "dark";
};

export function Dashboard({ profile, scripts, leads = [], onNavigate }: DashboardProps) {
  const firstName = profile.displayName.split(" ")[0] || "Builder";
  const [localLeads, setLocalLeads] = useState(leads);
  const [copied, setCopied] = useState(false);
  const now = Date.now();
  const todayEnd = now + 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const primaryScript = scripts[0];

  const dueToday = localLeads.filter((lead) => new Date(lead.nextFollowUpAt).getTime() <= todayEnd);
  const hotLeads = localLeads.filter((lead) => lead.temperature === "hot");
  const forgottenLeads = localLeads.filter((lead) => {
    const lastTouch = lead.lastTouchAt ? new Date(lead.lastTouchAt).getTime() : new Date(lead.nextFollowUpAt).getTime();
    return lastTouch < now - sevenDays && !["customer", "builder", "team_member"].includes(lead.stage);
  });
  const eventLeads = localLeads.filter((lead) => lead.source === "event" || ["invited", "event_registered", "attended", "appointment"].includes(lead.stage));
  const noShowLeads = localLeads.filter((lead) => lead.eventStatus === "no_show" || lead.notes.toLowerCase().includes("no-show"));
  const customerReminders = localLeads.filter((lead) => lead.stage === "customer" && new Date(lead.purchaseReminderAt ?? lead.nextFollowUpAt).getTime() <= now + 7 * 24 * 60 * 60 * 1000);
  const teamActivity = localLeads.filter((lead) => ["builder", "team_member", "business_prospect"].includes(lead.stage));
  const opportunity = useMemo(() => {
    const weighted = localLeads.reduce((total, lead) => {
      if (lead.temperature === "hot") return total + 320;
      if (lead.temperature === "warm") return total + 160;
      return total + 60;
    }, 0);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(weighted);
  }, [localLeads]);

  const addLead = () => {
    const nextLead: LeadRecord = {
      id: `lead-${Date.now()}`,
      name: `New Relationship ${localLeads.length + 1}`,
      source: "manual",
      stage: "new",
      temperature: "warm",
      ownerId: profile.uid,
      nextAction: "Send a warm first-contact message",
      nextFollowUpAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      lastTouchAt: new Date().toISOString(),
      relationshipScore: 55,
      interestType: "product",
      notes: "Added from the daily action dashboard."
    };

    setLocalLeads((current) => [nextLead, ...current]);
    trackDupliosEvent("lead_created", { leadId: nextLead.id, source: nextLead.source, surface: "dashboard" });
    onNavigate?.("growth-crm");
  };

  const copyScript = async () => {
    const body =
      primaryScript?.body ??
      "Hi {{name}}, I was thinking about our last conversation and wanted to follow up in a simple way. Would it be useful if I sent you the short overview and you can tell me if it is relevant?";
    await navigator.clipboard.writeText(body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    trackDupliosEvent("whatsapp_script_copied", { surface: "dashboard" });
  };

  const actionCards: ActionCard[] = [
    {
      title: "Leads to Follow Up Today",
      value: String(dueToday.length),
      body: "People with a follow-up due now or within the next 24 hours.",
      view: "growth-crm",
      icon: ClipboardList,
      tone: "blue"
    },
    {
      title: "Hot Leads",
      value: String(hotLeads.length),
      body: "Warm relationships showing high intent and ready for the next step.",
      view: "growth-crm",
      icon: Flame,
      tone: "gold"
    },
    {
      title: "Forgotten Leads",
      value: String(forgottenLeads.length),
      body: "Relationships that need recovery before they go cold.",
      view: "growth-crm",
      icon: RotateCcw,
      tone: "dark"
    },
    {
      title: "Event / Webinar Registrants",
      value: String(eventLeads.length),
      body: "Invites, registrations, attendees, and event follow-up.",
      view: "events",
      icon: CalendarDays,
      tone: "blue"
    },
    {
      title: "No-Show Recovery",
      value: String(noShowLeads.length),
      body: "Missed event leads that deserve a short, human recovery message.",
      view: "events",
      icon: MessageSquarePlus,
      tone: "gold"
    },
    {
      title: "Customer Reorder Reminders",
      value: String(customerReminders.length),
      body: "Customers due for check-in, reorder, or product experience follow-up.",
      view: "growth-crm",
      icon: HeartHandshake,
      tone: "green"
    },
    {
      title: "Team Activity",
      value: String(teamActivity.length),
      body: "Business prospects, team members, and sponsor support actions.",
      view: "team-hub",
      icon: Users,
      tone: "blue"
    },
    {
      title: "Estimated Opportunity",
      value: opportunity,
      body: "A directional pipeline estimate based on lead temperature.",
      view: "team-metrics",
      icon: DollarSign,
      tone: "green"
    },
    {
      title: "Personal Power Hour Tasks",
      value: "4",
      body: "Add names, message warm leads, invite to event, and follow up.",
      view: "sales-sprint",
      icon: Zap,
      tone: "dark"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-8 xl:px-10">
      <section className="rounded-[28px] bg-[#0b1220] px-5 py-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#e0bd61]">
              Network Marketing Growth OS
            </p>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">
              Who should you message today, {firstName}?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1] sm:text-base">
              Duplios turns warm relationships into follow-up actions, event recovery, customer care, and team duplication without turning your outreach into spam.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <button onClick={addLead} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#e0bd61] px-6 text-sm font-black text-[#0b1220]">
              <Plus size={18} />
              Add Lead
            </button>
            <button onClick={() => onNavigate?.("events")} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/15 px-6 text-sm font-black text-white shadow-sm hover:bg-white/20">
              <CalendarDays size={18} />
              Open Events
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {actionCards.map((card) => (
          <DailyActionCard key={card.title} card={card} onClick={() => onNavigate?.(card.view)} />
        ))}
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-[0_4px_14px_rgba(19,25,38,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-[#18191f]">Lead Recovery Scanner</h2>
              <p className="mt-1 text-sm text-[#626873]">Find relationships that are slipping because the next action was missed.</p>
            </div>
            <RotateCcw className="text-[#2f62ed]" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["3+ days", localLeads.filter((lead) => isOlderThan(lead, 3)).length],
              ["7+ days", localLeads.filter((lead) => isOlderThan(lead, 7)).length],
              ["30+ days", localLeads.filter((lead) => isOlderThan(lead, 30)).length]
            ].map(([label, count]) => (
              <button key={label} onClick={() => onNavigate?.("growth-crm")} className="rounded-2xl border border-[#dfe2e8] p-4 text-left hover:border-[#2f62ed]">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">{label}</p>
                <p className="mt-2 text-3xl font-black text-[#18191f]">{count}</p>
                <p className="mt-2 text-xs font-bold text-[#2f62ed]">Open filtered CRM</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-[0_4px_14px_rgba(19,25,38,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-[#18191f]">Warm Script</h2>
              <p className="mt-1 text-sm text-[#626873]">Copy a compliant WhatsApp / DM starter.</p>
            </div>
            <MessageSquarePlus className="text-[#2f62ed]" />
          </div>
          <p className="rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-4 text-sm leading-6 text-[#394150]">
            {primaryScript?.body ?? "Hi {{name}}, I was thinking about our last conversation and wanted to follow up in a simple way. Would it be useful if I sent you the short overview and you can tell me if it is relevant?"}
          </p>
          <button onClick={copyScript} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2f62ed] text-sm font-black text-white">
            <Copy size={16} />
            {copied ? "Copied" : "Copy Script"}
          </button>
        </div>
      </section>
    </div>
  );
}

function isOlderThan(lead: LeadRecord, days: number) {
  const stamp = lead.lastTouchAt ?? lead.nextFollowUpAt;
  return new Date(stamp).getTime() < Date.now() - days * 24 * 60 * 60 * 1000;
}

function DailyActionCard({ card, onClick }: { card: ActionCard; onClick: () => void }) {
  const Icon = card.icon;
  const toneClass =
    card.tone === "gold"
      ? "bg-[#fff7e8] text-[#9a5a00]"
      : card.tone === "green"
        ? "bg-[#eafbf3] text-[#047857]"
        : card.tone === "dark"
          ? "bg-[#111827] text-white"
          : "bg-[#edf2ff] text-[#2f62ed]";

  return (
    <button onClick={onClick} className="rounded-[24px] border border-[#dedfe4] bg-white p-5 text-left shadow-[0_4px_14px_rgba(19,25,38,0.08)] transition hover:-translate-y-0.5 hover:border-[#2f62ed]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon size={21} />
        </div>
        <span className="text-3xl font-black text-[#18191f]">{card.value}</span>
      </div>
      <p className="font-black text-[#18191f]">{card.title}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-[#626873]">{card.body}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#2f62ed]">
        Open list
        <CheckCircle2 size={15} />
      </span>
    </button>
  );
}
