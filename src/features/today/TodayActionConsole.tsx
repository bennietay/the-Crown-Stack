import {
  CalendarClock,
  CheckCircle2,
  Copy,
  HelpCircle,
  MessageCircle,
  Plus,
  RefreshCcw,
  Send,
  UserPlus
} from "lucide-react";
import { useMemo, useState } from "react";
import { trackDupliosEvent } from "../../lib/tracking";
import type { DupliosUserProfile, FastStartPlan, LeadRecord, ScriptAsset } from "../../types/tenant";

type ReplyType =
  | "Interested"
  | "Curious"
  | "Busy"
  | "Not now"
  | "No reply"
  | "Asked price"
  | "Asked what is this"
  | "Negative response"
  | "Wants a call"
  | "Wants product info"
  | "Wants business info"
  | "Attended event"
  | "No-showed event";

type ConsoleAction = {
  id: string;
  leadId: string;
  title: string;
  category: "message" | "follow_up" | "event" | "recovery" | "reorder" | "sponsor";
  script: string;
  dueAt: string;
  status: "open" | "done" | "sponsor_help";
};

type TimelineEvent = {
  id: string;
  leadId: string;
  label: string;
  detail: string;
  createdAt: string;
};

const replyRecommendations: Record<ReplyType, { nextAction: string; days: number; script: string }> = {
  Interested: {
    nextAction: "Invite to overview or book a short call",
    days: 1,
    script: "That makes sense. Want me to send the short overview so you can see whether product or business is the better fit?"
  },
  Curious: {
    nextAction: "Send simple curiosity bridge",
    days: 1,
    script: "Totally fair. The short version is this: I help people look at a simple system, then they decide if it is relevant. Want the 2-minute overview?"
  },
  Busy: {
    nextAction: "Follow up in 2 days with the busy reply script",
    days: 2,
    script: "No problem. I know timing matters. I will check back in a couple of days, and if it is still not a fit, no pressure."
  },
  "Not now": {
    nextAction: "Schedule a respectful check-in",
    days: 7,
    script: "Completely understand. Would it be okay if I checked back next week and sent one helpful note in the meantime?"
  },
  "No reply": {
    nextAction: "Use no-reply follow-up",
    days: 3,
    script: "Just bringing this back to the top. No pressure either way. Should I send the quick overview or close the loop for now?"
  },
  "Asked price": {
    nextAction: "Answer price with fit-first context",
    days: 1,
    script: "Good question. The price depends on what path fits you. I can send the simple overview first so the pricing has context."
  },
  "Asked what is this": {
    nextAction: "Clarify without hype",
    days: 1,
    script: "It is a short educational overview. No pressure, no big pitch. You can see what it is and decide if it is relevant."
  },
  "Negative response": {
    nextAction: "Mark not now and protect relationship",
    days: 30,
    script: "Thanks for being direct. I will not push this. Appreciate you replying."
  },
  "Wants a call": {
    nextAction: "Book sponsor-assisted call",
    days: 1,
    script: "Great. I can book a short call and keep it simple: your questions, whether it fits, and the next step if it does."
  },
  "Wants product info": {
    nextAction: "Send product-specific resource",
    days: 1,
    script: "I will send the product overview. Look at whether the use case fits you, then tell me what question comes up."
  },
  "Wants business info": {
    nextAction: "Invite to business preview",
    days: 1,
    script: "I will send the business preview. It explains the model, support, and fit. No income is guaranteed."
  },
  "Attended event": {
    nextAction: "Send after-event follow-up",
    days: 1,
    script: "Thanks for joining. What stood out most, and do you feel the product, customer, or business path is more relevant?"
  },
  "No-showed event": {
    nextAction: "Send no-show recovery",
    days: 1,
    script: "No worries about missing it. I can send the replay or the 3 main points. Which is easier for you?"
  }
};

export function TodayActionConsole({
  profile,
  leads,
  scripts,
  fastStartPlan,
  onNavigate
}: {
  profile: DupliosUserProfile;
  leads: LeadRecord[];
  scripts: ScriptAsset[];
  fastStartPlan: FastStartPlan[];
  onNavigate?: (view: string) => void;
}) {
  const [mode, setMode] = useState<"beginner" | "advanced">(() => (window.localStorage.getItem("duplios-member-mode") === "advanced" ? "advanced" : "beginner"));
  const [localLeads, setLocalLeads] = useState<LeadRecord[]>(() => readLocal("duplios-console-leads", leads));
  const [actions, setActions] = useState<ConsoleAction[]>(() => readLocal("duplios-console-actions", seedActions(leads, scripts)));
  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => readLocal("duplios-lead-timeline", []));
  const [selectedLeadId, setSelectedLeadId] = useState(localLeads[0]?.id ?? "");
  const [reply, setReply] = useState<ReplyType>("Busy");
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [notice, setNotice] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const selectedLead = localLeads.find((lead) => lead.id === selectedLeadId) ?? localLeads[0];
  const openActions = actions.filter((action) => action.status === "open");
  const dueToday = openActions.filter((action) => action.dueAt.slice(0, 10) <= today);
  const hotLeads = localLeads.filter((lead) => lead.temperature === "hot");
  const fastStartProgress = fastStartPlan.length ? Math.min(100, Math.round(((timeline.length + actions.filter((action) => action.status === "done").length) / Math.max(fastStartPlan.length, 1)) * 10)) : 15;
  const duplicationScore = Math.min(100, 35 + actions.filter((action) => action.status === "done").length * 8 + timeline.length * 3);

  const selectedTimeline = useMemo(() => timeline.filter((item) => item.leadId === selectedLead?.id).slice(0, 6), [selectedLead?.id, timeline]);

  const persist = (nextLeads = localLeads, nextActions = actions, nextTimeline = timeline) => {
    setLocalLeads(nextLeads);
    setActions(nextActions);
    setTimeline(nextTimeline);
    writeLocal("duplios-console-leads", nextLeads);
    writeLocal("duplios-console-actions", nextActions);
    writeLocal("duplios-lead-timeline", nextTimeline);
  };

  const addLead = () => {
    const name = newLeadName.trim();
    const duplicate = localLeads.find((lead) => lead.name.toLowerCase() === name.toLowerCase() || (newLeadPhone && lead.phone === newLeadPhone));
    if (!name) {
      show("Enter a lead name first.");
      return;
    }
    if (duplicate) {
      show(`${duplicate.name} already exists. Open the existing profile instead of creating a duplicate.`);
      setSelectedLeadId(duplicate.id);
      return;
    }
    const lead: LeadRecord = {
      id: `lead-${Date.now()}`,
      name,
      phone: newLeadPhone.trim(),
      source: "manual",
      stage: "new",
      temperature: "warm",
      ownerId: profile.uid,
      nextAction: "Send warm first message",
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastTouchAt: new Date().toISOString(),
      notes: "Added from Today Action Console.",
      interestType: "product",
      relationshipScore: 50
    };
    const action = makeAction(lead, "Send warm first message", "message", warmScript(lead.name));
    persist([lead, ...localLeads], [action, ...actions], [makeTimeline(lead.id, "Lead created", "Added from Today Action Console."), ...timeline]);
    setSelectedLeadId(lead.id);
    setNewLeadName("");
    setNewLeadPhone("");
    show("Lead created and first message queued.");
    trackDupliosEvent("lead_created", { surface: "today_action_console" });
  };

  const markDone = (actionId: string) => {
    const action = actions.find((item) => item.id === actionId);
    const nextActions = actions.map((item) => (item.id === actionId ? { ...item, status: "done" as const } : item));
    const nextTimeline = action ? [makeTimeline(action.leadId, "Action completed", action.title), ...timeline] : timeline;
    persist(localLeads, nextActions, nextTimeline);
    show("Action marked done.");
  };

  const copyMessage = async (action: ConsoleAction) => {
    await navigator.clipboard.writeText(action.script);
    persist(localLeads, actions, [makeTimeline(action.leadId, "Message copied", action.script), ...timeline]);
    show("WhatsApp / DM message copied.");
    trackDupliosEvent("whatsapp_script_copied", { surface: "today_action_console" });
  };

  const openWhatsApp = (action: ConsoleAction) => {
    const lead = localLeads.find((item) => item.id === action.leadId);
    const phone = (lead?.phone ?? "").replace(/[^\d]/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(action.script)}` : `https://wa.me/?text=${encodeURIComponent(action.script)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    persist(localLeads, actions, [makeTimeline(action.leadId, "WhatsApp opened", action.title), ...timeline]);
    show("WhatsApp opened with a prefilled message.");
  };

  const logReply = () => {
    if (!selectedLead) return;
    const recommendation = replyRecommendations[reply];
    const nextDate = new Date(Date.now() + recommendation.days * 24 * 60 * 60 * 1000).toISOString();
    const nextLead: LeadRecord = {
      ...selectedLead,
      stage: stageFromReply(reply),
      temperature: reply === "Interested" || reply === "Wants a call" ? "hot" : reply === "Negative response" ? "cold" : selectedLead.temperature,
      nextAction: recommendation.nextAction,
      nextFollowUpAt: nextDate,
      lastTouchAt: new Date().toISOString(),
      notes: `${selectedLead.notes}\nReply logged: ${reply}.`
    };
    const nextLeads = localLeads.map((lead) => (lead.id === selectedLead.id ? nextLead : lead));
    const nextAction = makeAction(nextLead, recommendation.nextAction, "follow_up", recommendation.script, nextDate);
    persist(nextLeads, [nextAction, ...actions], [makeTimeline(selectedLead.id, `Reply logged: ${reply}`, recommendation.nextAction), ...timeline]);
    show(`Next best action queued: ${recommendation.nextAction}.`);
  };

  const scheduleFollowUp = (days = 2) => {
    if (!selectedLead) return;
    const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const nextLead = { ...selectedLead, nextFollowUpAt: dueAt, nextAction: `Follow up in ${days} days` };
    persist(
      localLeads.map((lead) => (lead.id === selectedLead.id ? nextLead : lead)),
      [makeAction(nextLead, `Follow up in ${days} days`, "follow_up", warmScript(selectedLead.name), dueAt), ...actions],
      [makeTimeline(selectedLead.id, "Follow-up scheduled", new Date(dueAt).toLocaleString()), ...timeline]
    );
    show("Follow-up scheduled.");
  };

  const askSponsor = (lead = selectedLead) => {
    if (!lead) return;
    const nextAction = makeAction(lead, "Sponsor help requested", "sponsor", `Please help me with ${lead.name}. Situation: ${lead.nextAction}`);
    persist(localLeads, [{ ...nextAction, status: "sponsor_help" }, ...actions], [makeTimeline(lead.id, "Sponsor help requested", lead.nextAction), ...timeline]);
    show("Sponsor assist request queued for your leader.");
  };

  const show = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-8 xl:px-10">
      <section className="rounded-[28px] bg-[#0b1220] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e0bd61]">Today Action Console</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">Know exactly what to do today.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#cbd5e1]">
              Duplios is a daily action and duplication system for network marketing teams. Work one relationship at a time: copy, open WhatsApp, log the reply, and schedule the next follow-up.
            </p>
          </div>
          <div className="inline-flex rounded-2xl border border-white/15 bg-white/10 p-1">
            {(["beginner", "advanced"] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setMode(item);
                  window.localStorage.setItem("duplios-member-mode", item);
                }}
                className={`h-10 rounded-xl px-4 text-xs font-black uppercase ${mode === item ? "bg-[#e0bd61] text-[#0b1220]" : "text-white"}`}
              >
                {item} Mode
              </button>
            ))}
          </div>
        </div>
      </section>

      {notice ? <div className="mt-4 rounded-2xl border border-[#bdd0ff] bg-[#f2f5ff] px-4 py-3 text-sm font-black text-[#2f62ed]">{notice}</div> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric title="Due today" value={String(dueToday.length)} />
        <Metric title="Hot leads" value={String(hotLeads.length)} />
        <Metric title="Fast Start" value={`${fastStartProgress}%`} />
        <Metric title="Duplication score" value={`${duplicationScore}%`} />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="flex-1">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#626873]">Add new lead</span>
                <input value={newLeadName} onChange={(event) => setNewLeadName(event.target.value)} className="h-12 w-full rounded-xl border border-[#dfe2e8] px-4 text-sm outline-none" placeholder="Prospect name" />
              </label>
              <label className="flex-1">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#626873]">WhatsApp</span>
                <input value={newLeadPhone} onChange={(event) => setNewLeadPhone(event.target.value)} className="h-12 w-full rounded-xl border border-[#dfe2e8] px-4 text-sm outline-none" placeholder="+60123456789" />
              </label>
              <button onClick={addLead} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white">
                <Plus size={17} /> Add Lead
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-[#18191f]">WhatsApp Follow-Up Queue</h2>
                <p className="mt-1 text-sm text-[#626873]">Manual, consent-based actions. No bulk blasting.</p>
              </div>
              <button onClick={() => onNavigate?.("growth-crm")} className="rounded-xl border border-[#dfe2e8] px-3 py-2 text-xs font-black uppercase text-[#394150]">Open CRM</button>
            </div>
            <div className="grid gap-3">
              {openActions.length ? openActions.slice(0, mode === "beginner" ? 5 : 12).map((action) => {
                const lead = localLeads.find((item) => item.id === action.leadId);
                return (
                  <div key={action.id} className="rounded-2xl border border-[#dfe2e8] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-black text-[#18191f]">{action.title}</p>
                        <p className="mt-1 text-sm text-[#626873]">{lead?.name ?? "Lead"} · {action.category.replace("_", " ")} · due {new Date(action.dueAt).toLocaleDateString()}</p>
                        <p className="mt-3 max-w-3xl rounded-xl bg-[#f8fafc] p-3 text-sm leading-6 text-[#394150]">{action.script}</p>
                      </div>
                      <div className="grid min-w-[180px] gap-2">
                        <button onClick={() => copyMessage(action)} className="h-10 rounded-xl border border-[#dfe2e8] px-3 text-xs font-black uppercase text-[#394150]"><Copy className="mr-1 inline" size={14} /> Copy</button>
                        <button onClick={() => openWhatsApp(action)} className="h-10 rounded-xl bg-[#22c55e] px-3 text-xs font-black uppercase text-white"><MessageCircle className="mr-1 inline" size={14} /> WhatsApp</button>
                        <button onClick={() => { setSelectedLeadId(action.leadId); }} className="h-10 rounded-xl border border-[#dfe2e8] px-3 text-xs font-black uppercase text-[#394150]">Log Reply</button>
                        <button onClick={() => askSponsor(lead)} className="h-10 rounded-xl border border-[#dfe2e8] px-3 text-xs font-black uppercase text-[#394150]"><HelpCircle className="mr-1 inline" size={14} /> Sponsor</button>
                        <button onClick={() => markDone(action.id)} className="h-10 rounded-xl bg-[#2f62ed] px-3 text-xs font-black uppercase text-white"><CheckCircle2 className="mr-1 inline" size={14} /> Done</button>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <EmptyAction title="No follow-ups yet" body="Add your first lead and Duplios will queue the next WhatsApp action." action="Add Lead" onClick={() => document.querySelector<HTMLInputElement>("input[placeholder='Prospect name']")?.focus()} />
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#18191f]">Log Reply</h2>
            <p className="mt-1 text-sm text-[#626873]">The next action and script are recommended automatically.</p>
            <select value={selectedLead?.id ?? ""} onChange={(event) => setSelectedLeadId(event.target.value)} className="mt-4 h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
              {localLeads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
            </select>
            <select value={reply} onChange={(event) => setReply(event.target.value as ReplyType)} className="mt-3 h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
              {Object.keys(replyRecommendations).map((item) => <option key={item}>{item}</option>)}
            </select>
            <div className="mt-4 rounded-xl bg-[#f8fafc] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f62ed]">Recommended next action</p>
              <p className="mt-2 text-sm font-bold leading-6 text-[#18191f]">{replyRecommendations[reply].nextAction}</p>
              <p className="mt-2 text-sm leading-6 text-[#626873]">{replyRecommendations[reply].script}</p>
            </div>
            <div className="mt-4 grid gap-2">
              <button onClick={logReply} disabled={!selectedLead} className="h-11 rounded-xl bg-[#2f62ed] text-xs font-black uppercase text-white disabled:bg-[#9ca3af]"><Send className="mr-1 inline" size={15} /> Log Reply & Queue Script</button>
              <button onClick={() => scheduleFollowUp(2)} disabled={!selectedLead} className="h-11 rounded-xl border border-[#dfe2e8] text-xs font-black uppercase text-[#394150] disabled:opacity-50"><CalendarClock className="mr-1 inline" size={15} /> Schedule Follow-Up</button>
              <button onClick={() => askSponsor()} disabled={!selectedLead} className="h-11 rounded-xl border border-[#dfe2e8] text-xs font-black uppercase text-[#394150] disabled:opacity-50"><HelpCircle className="mr-1 inline" size={15} /> Ask Sponsor For Help</button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-[#18191f]">Lead Timeline</h2>
            <div className="mt-4 space-y-3">
              {selectedTimeline.length ? selectedTimeline.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#dfe2e8] p-3">
                  <p className="text-sm font-black text-[#18191f]">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#626873]">{item.detail}</p>
                </div>
              )) : (
                <p className="rounded-xl bg-[#f8fafc] p-4 text-sm text-[#626873]">No timeline yet. Copy a message, log a reply, or schedule a follow-up.</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dedfe4] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#626873]">{title}</p>
      <p className="mt-2 text-3xl font-black text-[#18191f]">{value}</p>
    </div>
  );
}

function EmptyAction({ title, body, action, onClick }: { title: string; body: string; action: string; onClick: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-6 text-center">
      <UserPlus className="mx-auto text-[#2f62ed]" />
      <p className="mt-3 font-black text-[#18191f]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#626873]">{body}</p>
      <button onClick={onClick} className="mt-4 h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white">{action}</button>
    </div>
  );
}

function seedActions(leads: LeadRecord[], scripts: ScriptAsset[]): ConsoleAction[] {
  const script = scripts[0]?.body;
  return leads.slice(0, 6).map((lead, index) =>
    makeAction(
      lead,
      index % 3 === 0 ? "Send follow-up" : index % 3 === 1 ? "Invite to event" : "Recover no reply",
      index % 3 === 1 ? "event" : "follow_up",
      script ?? warmScript(lead.name),
      lead.nextFollowUpAt
    )
  );
}

function makeAction(lead: LeadRecord, title: string, category: ConsoleAction["category"], script: string, dueAt = new Date().toISOString()): ConsoleAction {
  return {
    id: `action-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    leadId: lead.id,
    title,
    category,
    script: personalize(script, lead.name),
    dueAt,
    status: "open"
  };
}

function makeTimeline(leadId: string, label: string, detail: string): TimelineEvent {
  return { id: `timeline-${Date.now()}-${Math.random().toString(16).slice(2)}`, leadId, label, detail, createdAt: new Date().toISOString() };
}

function warmScript(name: string) {
  return `Hi ${name}, I was thinking about our last conversation. Would it be useful if I sent you the short overview and you can tell me if it is relevant?`;
}

function personalize(script: string, name: string) {
  return script.replaceAll("{{name}}", name).replaceAll("[name]", name);
}

function stageFromReply(reply: ReplyType): LeadRecord["stage"] {
  if (reply === "Interested" || reply === "Curious" || reply === "Wants product info" || reply === "Wants business info") return "interested";
  if (reply === "Wants a call") return "appointment";
  if (reply === "Attended event") return "attended";
  if (reply === "No-showed event") return "event_registered";
  if (reply === "Not now" || reply === "Negative response") return "not_now";
  return "follow_up";
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep console usable if storage is blocked.
  }
}
