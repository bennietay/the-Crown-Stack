import { CheckCircle2, Copy, MessageCircle, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { DupliosUserProfile, LeadRecord } from "../../types/tenant";

const goals = ["Product sales", "Recruitment", "Team duplication", "Event promotion"];

export function SetupWizard({ profile, onComplete }: { profile: DupliosUserProfile; onComplete: () => void }) {
  const [role, setRole] = useState(profile.role === "leader" ? "Team Leader / Sponsor" : profile.role === "admin" ? "Admin / Organization Owner" : "Member / Distributor");
  const [goal, setGoal] = useState(goals[0]);
  const [whatsapp, setWhatsapp] = useState("");
  const [leadText, setLeadText] = useState("");
  const [campaign, setCampaign] = useState("Warm Market Restart");
  const [notice, setNotice] = useState("");
  const firstMessage = "Hi {{name}}, I’m organizing my follow-up properly this week. Would it be useful if I sent you a short overview and you can tell me if it is relevant?";

  const complete = () => {
    if (!whatsapp.trim()) {
      setNotice("Add your WhatsApp number before continuing.");
      return;
    }
    const names = leadText
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
    const leads: LeadRecord[] = names.map((name, index) => ({
      id: `setup-lead-${Date.now()}-${index}`,
      name,
      phone: "",
      source: "manual",
      stage: "new",
      temperature: "warm",
      ownerId: profile.uid,
      nextAction: "Send first warm message",
      nextFollowUpAt: new Date(Date.now() + (index + 1) * 60 * 60 * 1000).toISOString(),
      lastTouchAt: new Date().toISOString(),
      notes: `Setup wizard lead for ${campaign}.`,
      interestType: goal === "Recruitment" || goal === "Team duplication" ? "business" : "product",
      relationshipScore: 55
    }));

    if (leads.length) {
      window.localStorage.setItem("duplios-console-leads", JSON.stringify(leads));
    }

    window.localStorage.setItem(
      "duplios-setup",
      JSON.stringify({
        completed: true,
        role,
        goal,
        whatsapp,
        campaign,
        completedAt: new Date().toISOString()
      })
    );
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-4 py-8">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-[#dedfe4] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2f62ed]">Duplios setup wizard</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-black text-[#18191f] sm:text-5xl">Set up your daily action system before you start.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#626873]">
          Choose your role, goal, WhatsApp number, first campaign, first leads, and first message. This prevents an empty dashboard and gives every new member a clear first action.
        </p>
        {notice ? <div className="mt-5 rounded-2xl border border-[#f8c8c8] bg-[#fff1f1] px-4 py-3 text-sm font-black text-[#b42318]">{notice}</div> : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Panel title="1. Choose role">
            <select value={role} onChange={(event) => setRole(event.target.value)} className="h-12 w-full rounded-xl border border-[#dfe2e8] px-4 text-sm outline-none">
              <option>Member / Distributor</option>
              <option>Team Leader / Sponsor</option>
              <option>Admin / Organization Owner</option>
            </select>
          </Panel>
          <Panel title="2. Choose goal">
            <div className="grid gap-2 sm:grid-cols-2">
              {goals.map((item) => (
                <button key={item} onClick={() => setGoal(item)} className={`rounded-xl border px-3 py-3 text-sm font-black ${goal === item ? "border-[#2f62ed] bg-[#edf2ff] text-[#2f62ed]" : "border-[#dfe2e8] text-[#394150]"}`}>
                  {item}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title="3. Add profile and WhatsApp number">
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+60123456789" className="h-12 w-full rounded-xl border border-[#dfe2e8] px-4 text-sm outline-none" />
          </Panel>
          <Panel title="4. Choose first campaign">
            <select value={campaign} onChange={(event) => setCampaign(event.target.value)} className="h-12 w-full rounded-xl border border-[#dfe2e8] px-4 text-sm outline-none">
              <option>Warm Market Restart</option>
              <option>Product Discovery Invite</option>
              <option>Business Preview Invite</option>
              <option>No-Show Recovery Sprint</option>
              <option>Customer Reorder Reminder</option>
            </select>
          </Panel>
          <Panel title="5. Add first 10 leads">
            <textarea value={leadText} onChange={(event) => setLeadText(event.target.value)} placeholder="One name per line or comma-separated" className="min-h-36 w-full rounded-xl border border-[#dfe2e8] p-4 text-sm outline-none" />
          </Panel>
          <Panel title="6. Copy first message">
            <p className="rounded-xl bg-[#f8fafc] p-4 text-sm leading-6 text-[#394150]">{firstMessage}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button onClick={() => void navigator.clipboard.writeText(firstMessage)} className="h-11 rounded-xl border border-[#dfe2e8] text-xs font-black uppercase text-[#394150]"><Copy className="mr-1 inline" size={15} /> Copy</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(firstMessage)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#22c55e] text-xs font-black uppercase text-white"><MessageCircle className="mr-1 inline" size={15} /> Open WhatsApp</a>
            </div>
          </Panel>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-[#626873]"><CheckCircle2 className="mr-2 inline text-[#16a34a]" size={18} /> Your first follow-up reminders will be queued after setup.</p>
          <button onClick={complete} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-6 text-sm font-black text-white"><Plus size={17} /> Complete Setup</button>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dfe2e8] bg-white p-5">
      <p className="mb-4 text-sm font-black text-[#18191f]">{title}</p>
      {children}
    </div>
  );
}
