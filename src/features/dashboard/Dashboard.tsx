import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Copy,
  Lightbulb,
  MessageSquarePlus,
  PlayCircle,
  Plus,
  Rocket,
  Share2,
  Users,
  Zap
} from "lucide-react";
import { useRef, useState } from "react";
import type { DupliosUserProfile, LeadRecord, ScriptAsset } from "../../types/tenant";

interface DashboardProps {
  profile: DupliosUserProfile;
  scripts: ScriptAsset[];
  leads?: LeadRecord[];
  onNavigate?: (view: string) => void;
}

const roadmap = [
  {
    title: "New Connections",
    body: "Reach out to 5 new people today to expand your network.",
    needed: "5 needed",
    icon: Users
  },
  {
    title: "Follow Up",
    body: "Check your pending tasks and reconnect with warm leads.",
    needed: "3 needed",
    icon: Clock3
  },
  {
    title: "Show the Plan",
    body: "Present the value to one prospect.",
    needed: "1 needed",
    icon: PlayCircle
  },
  {
    title: "Growth Training",
    body: "Listen to one training resource or read the playbook.",
    needed: "1 session",
    icon: BookOpen
  }
];

export function Dashboard({ profile, scripts, leads = [], onNavigate }: DashboardProps) {
  const firstName = profile.displayName.split(" ")[0] || "Builder";
  const roadmapRef = useRef<HTMLElement | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);
  const [copied, setCopied] = useState(false);
  const [showMomentum, setShowMomentum] = useState(true);
  const activeTrials = localLeads.filter((lead) => lead.stage === "appointment").length;
  const totalLeads = localLeads.length;
  const primaryScript = scripts[0];
  const addLead = () => {
    const nextLead: LeadRecord = {
      id: `lead-${Date.now()}`,
      name: `New Lead ${localLeads.length + 1}`,
      source: "manual",
      stage: "new",
      temperature: "warm",
      ownerId: profile.uid,
      nextAction: "Send approved warm opener",
      nextFollowUpAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      notes: "Added from dashboard quick action."
    };

    setLocalLeads((current) => [nextLead, ...current]);
  };

  const shareLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/?view=sales`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-8 xl:px-10">
      <section className="rounded-[24px] bg-[#2f62ed] px-4 py-8 text-center text-white shadow-[0_20px_60px_rgba(47,98,237,0.24)] sm:rounded-[36px] sm:px-10 sm:py-10">
        <div className="mx-auto mb-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.16em]">
          <span>🔥 0 day streak</span>
          <span className="h-4 w-px bg-white/25" />
          <span className="text-[#ffb323]">0% month goal</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-6xl">
          Ready to <span className="text-[#ffb323]">Grow</span>, {firstName}?
        </h1>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={addLead} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-black text-[#2f62ed]">
            <Plus size={18} />
            Add New Lead
          </button>
          <button onClick={shareLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 text-sm font-black text-white">
            <Share2 size={18} />
            {copied ? "Link Copied" : "Copy Share Link"}
          </button>
        </div>
      </section>

      <section ref={roadmapRef} className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1fr_372px]">
        <div className="rounded-[22px] border border-[#dedfe4] bg-white p-4 shadow-[0_4px_14px_rgba(19,25,38,0.08)] sm:rounded-[28px] sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2f62ed] text-white shadow-[0_10px_24px_rgba(47,98,237,0.28)]">
                <Rocket size={22} />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-[0.08em] text-[#18191f] sm:text-xl sm:tracking-[0.12em]">
                  Today&apos;s Success Roadmap
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7d828c]">
                  Master your basics for 21% success
                </p>
              </div>
            </div>
            <div className="min-w-32">
              <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-[0.18em]">
                <span className="text-[#626873]">Progress</span>
                <span className="text-[#2f62ed]">0%</span>
              </div>
              <div className="h-2 rounded-full bg-[#eceef2]" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roadmap.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-[#dedfe4] p-5">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-black text-[#18191f]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[#626873]">{item.body}</p>
                      <span className="mt-3 inline-flex rounded-lg border border-[#ffc46b] bg-[#fff7ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#f59e0b]">
                        ⚡ {item.needed}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#dedfe4] bg-white p-4 shadow-[0_4px_14px_rgba(19,25,38,0.08)] sm:rounded-[28px] sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eafbf3] text-[#25b981]">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="font-black text-[#18191f]">Task Velocity</p>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#626873]">
                  Productivity pulse
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-[#18191f]">0%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#626873]">
                Completed
              </p>
            </div>
          </div>
          <div className="mt-6 h-3 rounded-full bg-[#eceef2]" />
          <div className="mt-4 flex justify-between text-xs font-black">
            <span className="text-[#1bbf83]">◎ 0 Done</span>
            <span className="text-[#626873]">2 Remaining</span>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Leads" value={String(totalLeads)} note="↗ Growth engine" tone="green" />
        <MetricCard label="Active Trials" value={String(activeTrials)} note="↯ Ready to demo" tone="blue" />
        <MetricCard label="Personal PV" value="0" note="☆ Active month" tone="orange" />
        <MetricCard label="Group PV" value="0" note="↯ Team volume" tone="blue" />
      </section>

      <section className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[1fr_372px]">
        <div className="rounded-[22px] border border-[#dedfe4] bg-white p-4 shadow-[0_4px_14px_rgba(19,25,38,0.08)] sm:rounded-[28px] sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-[#18191f]">Quick Share Script</h2>
            <MessageSquarePlus className="text-[#2f62ed]" />
          </div>
          <p className="text-sm leading-6 text-[#626873]">{primaryScript?.body}</p>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(primaryScript?.body ?? "");
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2f62ed] px-4 text-sm font-black text-white"
          >
            <Copy size={16} />
            {copied ? "Copied" : "Copy Script"}
          </button>
        </div>

        {showMomentum ? (
        <div className="rounded-[22px] border-[3px] border-[#2f62ed] bg-white p-4 shadow-[0_14px_40px_rgba(47,98,237,0.2)] sm:rounded-[28px] sm:p-5">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f62ed]">
                  Morning Momentum
                </p>
              </div>
            </div>
            <button onClick={() => setShowMomentum(false)} aria-label="Dismiss momentum card" className="text-[#626873]">×</button>
          </div>
          <p className="text-sm font-bold leading-6 text-[#18191f]">
            The first 30 minutes of your business day are crucial. Have you reached out to your top
            5 leads today?
          </p>
          <button
            onClick={() => roadmapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2f62ed] text-xs font-black uppercase tracking-[0.12em] text-white"
          >
            View roadmap
            <CheckCircle2 size={16} />
          </button>
        </div>
        ) : (
          <button
            onClick={() => onNavigate?.("fast-start-os")}
            className="rounded-[22px] border border-[#dedfe4] bg-white p-5 text-left shadow-[0_4px_14px_rgba(19,25,38,0.08)]"
          >
            <p className="font-black text-[#18191f]">Open Fast Start OS</p>
            <p className="mt-2 text-sm text-[#626873]">Continue with power hour, scripts, appointments, and sponsor check-ins.</p>
          </button>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone
}: {
  label: string;
  value: string;
  note: string;
  tone: "green" | "blue" | "orange";
}) {
  const toneClass =
    tone === "green" ? "text-[#10b981]" : tone === "orange" ? "text-[#f59e0b]" : "text-[#2f62ed]";
  return (
    <div className="rounded-[22px] border border-[#dedfe4] bg-white p-5 shadow-[0_4px_14px_rgba(19,25,38,0.08)]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#626873]">{label}</p>
      <p className="mt-1 text-3xl font-black text-[#18191f]">{value}</p>
      <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.12em] ${toneClass}`}>{note}</p>
    </div>
  );
}
