import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Flame,
  HeartHandshake,
  MessageSquareText,
  UserRoundPlus,
  Users
} from "lucide-react";
import { useState } from "react";
import type {
  AppointmentRecord,
  ComplianceGuardrail,
  ContactMemoryPrompt,
  DuplicationPlaybookPackage,
  FastStartPlan,
  MomentumScore,
  PowerHourAction,
  ScriptPersonalizationOption,
  SponsorCheckIn
} from "../../types/tenant";

interface FastStartOSProps {
  fastStartPlan: FastStartPlan[];
  contactPrompts: ContactMemoryPrompt[];
  powerHourActions: PowerHourAction[];
  sponsorCheckIns: SponsorCheckIn[];
  playbookPackages: DuplicationPlaybookPackage[];
  scriptPersonalizations: ScriptPersonalizationOption[];
  appointments: AppointmentRecord[];
  momentumScores: MomentumScore[];
  complianceGuardrails: ComplianceGuardrail[];
}

export function FastStartOS({
  fastStartPlan,
  contactPrompts,
  powerHourActions,
  sponsorCheckIns,
  playbookPackages,
  scriptPersonalizations,
  appointments,
  momentumScores,
  complianceGuardrails
}: FastStartOSProps) {
  const [activeDay, setActiveDay] = useState(fastStartPlan[0]?.day ?? 1);
  const [copied, setCopied] = useState<string | null>(null);
  const currentPlan = fastStartPlan.find((plan) => plan.day === activeDay) ?? fastStartPlan[0];
  const completedActions = powerHourActions.reduce((sum, action) => sum + action.completed, 0);
  const targetActions = powerHourActions.reduce((sum, action) => sum + action.target, 0);
  const powerHourProgress = Math.round((completedActions / Math.max(targetActions, 1)) * 100);
  const nextAppointment = appointments[0];
  const highRiskItems = complianceGuardrails.filter((item) => item.severity === "high").length;
  const starterScript =
    scriptPersonalizations[0]?.generatedScript ??
    "Hey, I thought of you because I am sharing a simple wellness reset with a few people this week. Want the short overview?";

  const copyText = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-8 xl:px-10">
      <section className="rounded-[26px] bg-[#2f62ed] p-5 text-white shadow-[0_18px_50px_rgba(47,98,237,0.22)] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffcf5f]">
              Fast Start OS
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Do these few things today.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              A simple daily path for new joiners: remember who matters, send a warm message,
              follow up with care, and book the next conversation. No pressure script maze.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <TopStat label="Today progress" value={`${powerHourProgress}%`} helper={`${completedActions}/${targetActions} actions`} />
            <TopStat label="Next call" value={nextAppointment ? "Booked" : "None"} helper={nextAppointment?.leadName ?? "Add one from CRM"} />
            <TopStat label="Sponsor help" value={String(sponsorCheckIns.length)} helper="check-ins queued" />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Today’s Plan" eyebrow="Follow the path" icon={<ClipboardList />}>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {fastStartPlan.slice(0, 6).map((day) => (
              <button
                key={day.day}
                onClick={() => setActiveDay(day.day)}
                className={`h-10 shrink-0 rounded-xl px-4 text-sm font-black ${
                  activeDay === day.day ? "bg-[#2f62ed] text-white" : "border border-[#dfe2e8] bg-white text-[#394150]"
                }`}
              >
                Day {day.day}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[#dfe2e8] bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f62ed]">
              Day {currentPlan?.day ?? 1}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#18191f]">{currentPlan?.title ?? "Start conversations"}</h2>
            <p className="mt-2 text-sm leading-6 text-[#626873]">
              {currentPlan?.objective ?? "Use the approved message and log every response."}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(currentPlan?.actions ?? ["Send 5 invites", "Log every response", "Follow up with hot leads"]).map((action) => (
                <label key={action} className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#dfe2e8] bg-[#f8fafc] p-4 text-sm font-bold text-[#394150]">
                  <input type="checkbox" className="h-4 w-4 accent-[#2f62ed]" />
                  {action}
                </label>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Power Hour" eyebrow="60-minute focus" icon={<Flame />}>
          <div className="rounded-2xl bg-[#111827] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffcf5f]">Progress</p>
            <p className="mt-1 text-5xl font-black">{powerHourProgress}%</p>
            <div className="mt-4 h-2 rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[#ffcf5f]" style={{ width: `${powerHourProgress}%` }} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {powerHourActions.slice(0, 4).map((action) => (
              <div key={action.id} className="rounded-2xl border border-[#dfe2e8] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-[#18191f]">{action.title}</p>
                  <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-black text-[#2f62ed]">
                    {action.completed}/{action.target}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-[#626873]">{action.scriptHint}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1.2fr]">
        <Panel title="Human Touch Rule" eyebrow="Relationship first" icon={<HeartHandshake />}>
          <div className="space-y-3">
            {[
              ["Listen first", "Before sending a script, write down what this person cares about and why now may matter."],
              ["Value before ask", "Send one helpful note, resource, or encouragement before asking for a decision."],
              ["Sponsor wisely", "Bring your sponsor in when the person asks a deep question or shows real interest."]
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-[#dfe2e8] bg-white p-4">
                <p className="font-black text-[#18191f]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#626873]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Who To Contact" eyebrow="Memory jogger" icon={<UserRoundPlus />}>
          <div className="grid gap-3">
            {contactPrompts.slice(0, 3).map((prompt) => (
              <div key={prompt.id} className="rounded-2xl border border-[#dfe2e8] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f62ed]">{prompt.category}</p>
                  <span className="text-xs font-black text-[#f59e0b]">{prompt.suggestedCount} names</span>
                </div>
                <p className="mt-2 text-sm font-bold leading-5 text-[#18191f]">{prompt.prompt}</p>
                <p className="mt-2 text-xs leading-5 text-[#626873]">{prompt.examples.join(" · ")}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Copy And Send" eyebrow="Approved message" icon={<MessageSquareText />}>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["Warm invite", starterScript],
              ["Simple follow-up", "Just checking in. Did you get a chance to look at the short overview? Happy to send the simplest next step."],
              ["Appointment reminder", "Looking forward to our quick overview. I will keep it simple: what it is, who it is for, and whether it fits you."],
              ["Sponsor help", "I have a prospect asking a good question. Can you help me with the best way to answer it?"]
            ].map(([title, script]) => (
              <div key={title} className="rounded-2xl border border-[#dfe2e8] bg-white p-4">
                <p className="font-black text-[#18191f]">{title}</p>
                <p className="mt-2 min-h-24 text-sm leading-6 text-[#626873]">{script}</p>
                <button
                  onClick={() => copyText(title, script)}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2f62ed] px-4 text-sm font-black text-white"
                >
                  <Copy size={16} />
                  {copied === title ? "Copied" : "Copy Script"}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <MiniPanel
          icon={<CalendarClock />}
          title="Appointments"
          value={String(appointments.length)}
          body={nextAppointment ? `${nextAppointment.leadName} · ${nextAppointment.nextStep}` : "Book one overview from a warm conversation."}
        />
        <MiniPanel
          icon={<Users />}
          title="Sponsor Queue"
          value={String(sponsorCheckIns.length)}
          body="Leader sees who needs help without showing new joiners the full admin view."
        />
        <MiniPanel
          icon={<CheckCircle2 />}
          title="Leader Support"
          value={`${playbookPackages.length + momentumScores.length}`}
          body={`${highRiskItems} high-risk compliance items are monitored quietly in the background.`}
        />
      </section>
    </div>
  );
}

function TopStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/20 bg-white/10 p-4">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">{label}</p>
      <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-blue-100">{helper}</p>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  icon,
  children
}: {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-[#dedfe4] bg-[#fbfcff] p-4 shadow-[0_4px_14px_rgba(19,25,38,0.08)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f62ed]">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-[#18191f]">{title}</h2>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#2f62ed]">
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniPanel({
  icon,
  title,
  value,
  body
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#dedfe4] bg-white p-5 shadow-[0_4px_14px_rgba(19,25,38,0.08)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#2f62ed]">
          {icon}
        </div>
        <p className="text-3xl font-black text-[#18191f]">{value}</p>
      </div>
      <p className="font-black text-[#18191f]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#626873]">{body}</p>
    </div>
  );
}
