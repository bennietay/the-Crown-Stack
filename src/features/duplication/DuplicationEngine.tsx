import {
  CalendarCheck,
  CheckCircle2,
  Copy,
  GitBranch,
  Linkedin,
  MessageSquareText,
  Plus,
  RadioTower,
  RefreshCw,
  Target,
  Trash2,
  Users,
  Zap
} from "lucide-react";
import { useState } from "react";
import { BentoTile } from "../../components/BentoTile";
import type {
  AutomationSequence,
  FastStartPlan,
  FollowUpStep,
  LeadRecord,
  OutreachTask,
  ScriptAsset,
  TeamMemberNode
} from "../../types/tenant";

const MAX_TEAM_LEVELS = 10;

interface DuplicationEngineProps {
  scripts: ScriptAsset[];
  teamNodes: TeamMemberNode[];
  leads: LeadRecord[];
  followUpSteps: FollowUpStep[];
  automationSequences: AutomationSequence[];
  outreachTasks: OutreachTask[];
  fastStartPlan: FastStartPlan[];
}

export function DuplicationEngine({
  scripts,
  teamNodes,
  leads,
  followUpSteps,
  automationSequences,
  outreachTasks,
  fastStartPlan
}: DuplicationEngineProps) {
  const storageKey = "duplios-network-pv-nodes";
  const readStoredNodes = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return teamNodes;
      const parsed = JSON.parse(stored) as TeamMemberNode[];
      return Array.isArray(parsed) ? parsed : teamNodes;
    } catch {
      return teamNodes;
    }
  };
  const [networkNodes, setNetworkNodes] = useState<TeamMemberNode[]>(readStoredNodes);
  const [networkQuery, setNetworkQuery] = useState("");
  const [legFilter, setLegFilter] = useState<"all" | TeamMemberNode["leg"]>("all");
  const [networkTab, setNetworkTab] = useState<"online" | "offline" | "tree" | "history">("online");
  const [downlineDraft, setDownlineDraft] = useState({
    name: "",
    email: "",
    rank: "New Builder",
    sponsorId: teamNodes.find((node) => node.level === 1)?.id ?? teamNodes[0]?.id ?? "",
    leg: "overflow" as TeamMemberNode["leg"],
    personalVolume: 0,
    customers: 0
  });
  const frontline = networkNodes.filter((node) => node.level === 1);
  const hotLeads = leads.filter((lead) => lead.temperature === "hot").length;
  const queuedOutreach = outreachTasks.filter((task) => task.status === "queued").length;
  const activeAutomations = automationSequences.filter((sequence) => sequence.status === "active").length;
  const [pushMessage, setPushMessage] = useState(scripts[0]?.body ?? "");
  const [pushScope, setPushScope] = useState("New joiners");
  const [pushCount, setPushCount] = useState(0);
  const totalPv = networkNodes.reduce((sum, node) => sum + node.personalVolume, 0);
  const totalGv = networkNodes.reduce((sum, node) => sum + node.groupVolume, 0);
  const activeMembers = networkNodes.filter((node) => node.status === "active").length;
  const maxLevel = networkNodes.length > 0 ? Math.max(...networkNodes.map((node) => node.level)) : 0;
  const levelSummary = Array.from({ length: maxLevel + 1 }, (_, level) => {
    const members = networkNodes.filter((node) => node.level === level);
    return {
      level,
      members,
      pv: members.reduce((sum, node) => sum + node.personalVolume, 0),
      gv: members.reduce((sum, node) => sum + node.groupVolume, 0)
    };
  });
  const legSummary = ["left", "right", "center", "overflow", "personal"].map((leg) => {
    const members = networkNodes.filter((node) => node.leg === leg);
    return {
      leg,
      members,
      gv: members.reduce((sum, node) => sum + node.groupVolume, 0)
    };
  });
  const filteredNetworkNodes = networkNodes.filter((node) => {
    const matchesLeg = legFilter === "all" || node.leg === legFilter;
    const matchesQuery =
      !networkQuery.trim() ||
      `${node.name} ${node.email} ${node.rank} ${node.leg}`.toLowerCase().includes(networkQuery.trim().toLowerCase());
    return matchesLeg && matchesQuery;
  });
  const persistNetwork = (next: TeamMemberNode[]) => {
    setNetworkNodes(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep the network usable in-memory when local storage is restricted.
    }
  };
  const addOfflineDownline = () => {
    const sponsor = networkNodes.find((node) => node.id === downlineDraft.sponsorId) ?? networkNodes.find((node) => node.level === 1) ?? networkNodes[0];

    if (!sponsor || sponsor.level + 1 > MAX_TEAM_LEVELS || !downlineDraft.name.trim() || !downlineDraft.email.trim()) {
      return;
    }

    persistNetwork([
      ...networkNodes,
      {
        id: `offline-${Date.now()}`,
        name: downlineDraft.name.trim(),
        email: downlineDraft.email.trim(),
        role: "new_joiner",
        rank: downlineDraft.rank.trim() || "New Builder",
        sponsorId: sponsor.id,
        placementId: sponsor.id,
        leg: downlineDraft.leg,
        sponsorPath: [...sponsor.sponsorPath, sponsor.id],
        level: sponsor.level + 1,
        status: "new",
        joinedAt: new Date().toISOString(),
        activeBuilders: 0,
        customers: Math.max(0, Number(downlineDraft.customers) || 0),
        personalVolume: Math.max(0, Number(downlineDraft.personalVolume) || 0),
        teamVolume: 0,
        groupVolume: Math.max(0, Number(downlineDraft.personalVolume) || 0),
        duplicationScore: 25
      }
    ]);
    setDownlineDraft((current) => ({ ...current, name: "", email: "", personalVolume: 0, customers: 0 }));
  };
  const updateNodeMetric = (id: string, key: "personalVolume" | "teamVolume" | "groupVolume" | "activeBuilders" | "customers" | "duplicationScore", value: number) => {
    persistNetwork(networkNodes.map((node) => node.id === id ? { ...node, [key]: Math.max(0, value) } : node));
  };
  const updateNodeStatus = (id: string, status: TeamMemberNode["status"]) => {
    persistNetwork(networkNodes.map((node) => node.id === id ? { ...node, status } : node));
  };
  const deleteNode = (id: string) => {
    persistNetwork(networkNodes.filter((node) => node.id !== id && node.sponsorId !== id && node.placementId !== id));
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[28px] bg-[#2f62ed] p-7 text-white shadow-sm">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Users size={22} /></div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">Network Reach</p>
          <p className="mt-3 text-5xl font-black">{activeMembers}</p>
          <p className="mt-2 text-xs font-bold text-blue-100">Active Members</p>
        </div>
        <div className="rounded-[28px] border border-[#dedfe4] bg-white p-7 shadow-sm">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eafbf3] text-[#22a56b]"><Zap size={22} /></div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#626873]">Group Volume</p>
            <p className="text-right text-[11px] font-black uppercase text-[#18191f]">Current Month<br />{new Date().toISOString().slice(0, 7)}</p>
          </div>
          <p className="mt-4 text-4xl font-black text-[#18191f]">{totalGv} <span className="text-xl">PV</span></p>
        </div>
        <div className="rounded-[28px] border border-[#dedfe4] bg-white p-7 shadow-sm">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ea] text-[#f59e0b]"><GitBranch size={22} /></div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#626873]">Network Depth</p>
            <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[10px] font-black uppercase text-[#626873]">Active Depth</span>
          </div>
          <p className="mt-4 text-4xl font-black text-[#18191f]">{maxLevel} <span className="text-xl">Layers</span></p>
          <div className="mt-4 h-2 rounded-full bg-[#edf0f4]"><div className="h-2 rounded-full bg-[#f59e0b]" style={{ width: `${Math.min((maxLevel / MAX_TEAM_LEVELS) * 100, 100)}%` }} /></div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap rounded-[22px] border border-[#dfe2e8] bg-white p-1 shadow-sm">
          {[
            ["online", "Online Team"],
            ["offline", "Offline Network"],
            ["tree", "Network Tree"],
            ["history", "PV History"]
          ].map(([id, label]) => (
            <button key={id} onClick={() => setNetworkTab(id as typeof networkTab)} className={`h-10 rounded-2xl px-5 text-[11px] font-black uppercase tracking-[0.12em] ${networkTab === id ? "bg-[#2f62ed] text-white shadow-md" : "text-[#394150]"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setNetworkTab("offline")} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dfe2e8] bg-white px-5 text-[11px] font-black uppercase tracking-[0.12em] text-[#18191f] shadow-sm">
          <Plus size={15} /> Add Offline Downline
        </button>
      </div>

      {networkTab === "offline" ? (
        <div className="mt-6 rounded-[28px] border border-[#dedfe4] bg-white p-6 shadow-sm">
          <p className="text-xl font-black text-[#18191f]">Add Offline Downline</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr_1fr_0.8fr_0.7fr_auto]">
            <input value={downlineDraft.name} onChange={(event) => setDownlineDraft((current) => ({ ...current, name: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Builder name" />
            <input value={downlineDraft.email} onChange={(event) => setDownlineDraft((current) => ({ ...current, email: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Email" />
            <input value={downlineDraft.rank} onChange={(event) => setDownlineDraft((current) => ({ ...current, rank: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Rank" />
            <select value={downlineDraft.sponsorId} onChange={(event) => setDownlineDraft((current) => ({ ...current, sponsorId: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none">
              {networkNodes.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
            </select>
            <select value={downlineDraft.leg} onChange={(event) => setDownlineDraft((current) => ({ ...current, leg: event.target.value as TeamMemberNode["leg"] }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none">
              <option value="left">left</option><option value="right">right</option><option value="center">center</option><option value="personal">personal</option><option value="overflow">overflow</option>
            </select>
            <input type="number" value={downlineDraft.personalVolume} onChange={(event) => setDownlineDraft((current) => ({ ...current, personalVolume: Number(event.target.value) }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="PV" />
            <button onClick={addOfflineDownline} disabled={!downlineDraft.name.trim() || !downlineDraft.email.trim()} className="h-11 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white disabled:bg-[#9ca3af]">Add</button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-[32px] border border-[#dedfe4] bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <input value={networkQuery} onChange={(event) => setNetworkQuery(event.target.value)} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Search network by name, email, rank, or leg" />
          <div className="flex flex-wrap gap-2">
            {(["all", "left", "right", "center", "personal", "overflow"] as const).map((leg) => (
              <button key={leg} onClick={() => setLegFilter(leg)} className={`h-10 rounded-xl px-3 text-[10px] font-black uppercase ${legFilter === leg ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>{leg}</button>
            ))}
          </div>
        </div>

        {networkTab === "history" ? (
          <div className="grid gap-3 md:grid-cols-5">
            {legSummary.map((leg) => <div key={leg.leg} className="rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-4"><p className="text-[10px] font-black uppercase text-[#626873]">{leg.leg} leg</p><p className="mt-2 text-2xl font-black text-[#18191f]">{leg.gv}</p><p className="text-xs text-[#626873]">GV</p></div>)}
          </div>
        ) : networkTab === "tree" ? (
          <div className="space-y-3 overflow-x-auto">
            {filteredNetworkNodes.map((node) => <GenealogyNode key={node.id} node={node} sponsor={networkNodes.find((item) => item.id === node.sponsorId)} onMetricChange={updateNodeMetric} onStatusChange={updateNodeStatus} onDelete={deleteNode} />)}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredNetworkNodes.length > 0 ? filteredNetworkNodes.map((node) => (
              <div key={node.id} className="grid gap-3 rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-4 lg:grid-cols-[1.2fr_repeat(5,0.5fr)_auto] lg:items-center">
                <div><p className="font-black text-[#18191f]">{node.name}</p><p className="text-xs font-bold text-[#626873]">{node.rank} · {node.email}</p></div>
                <Stat label="PV" value={node.personalVolume} />
                <Stat label="TV" value={node.teamVolume} />
                <Stat label="GV" value={node.groupVolume} />
                <Stat label="Builders" value={node.activeBuilders} />
                <Stat label="Score" value={node.duplicationScore} />
                <select value={node.status} onChange={(event) => updateNodeStatus(node.id, event.target.value as TeamMemberNode["status"])} className="h-9 rounded-lg border border-[#dfe2e8] px-2 text-xs font-black uppercase outline-none">
                  <option value="active">active</option><option value="new">new</option><option value="at_risk">at risk</option><option value="inactive">inactive</option>
                </select>
              </div>
            )) : <div className="rounded-[28px] border border-dashed border-[#dfe2e8] p-16 text-center"><Users className="mx-auto text-[#c8cbd2]" size={44} /><p className="mt-4 text-xl font-black text-[#18191f]">No Online Downlines</p><p className="mt-2 text-sm text-[#626873]">Invite your team members or add offline downlines to track activity.</p></div>}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
        {icon}
      </div>
      <p className="text-sm text-crown-mist">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.045] p-2">
      <p>{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function GenealogyNode({
  node,
  sponsor,
  onMetricChange,
  onStatusChange,
  onDelete
}: {
  node: TeamMemberNode;
  sponsor?: TeamMemberNode;
  onMetricChange: (id: string, key: "personalVolume" | "teamVolume" | "groupVolume" | "activeBuilders" | "customers" | "duplicationScore", value: number) => void;
  onStatusChange: (id: string, status: TeamMemberNode["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const statusClass =
    node.status === "active"
      ? "border-crown-emerald/30 bg-crown-emerald/10 text-crown-emerald"
      : node.status === "at_risk"
        ? "border-crown-rose/30 bg-crown-rose/10 text-crown-rose"
        : node.status === "inactive"
          ? "border-white/10 bg-white/[0.045] text-crown-mist"
          : "border-crown-gold/30 bg-crown-gold/10 text-crown-gold";

  return (
    <div
      className="min-w-[720px] rounded-lg border border-white/10 bg-crown-ink p-4"
      style={{ marginLeft: `${Math.min(node.level * 28, 112)}px` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{node.name}</p>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass}`}>
              {node.status.replace("_", " ")}
            </span>
            <span className="rounded-full border border-crown-gold/30 bg-crown-gold/10 px-2 py-1 text-[10px] font-semibold uppercase text-crown-gold">
              {node.leg} leg
            </span>
          </div>
          <p className="mt-1 text-sm text-crown-mist">
            {node.rank} · Level {node.level} · Sponsor: {sponsor?.name ?? "Root"}
          </p>
          <p className="mt-1 text-xs text-crown-mist">
            Joined {new Date(node.joinedAt).toLocaleDateString()} · Path {node.sponsorPath.length ? node.sponsorPath.join(" / ") : "root"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={node.status}
            onChange={(event) => onStatusChange(node.id, event.target.value as TeamMemberNode["status"])}
            className="h-8 rounded-lg border border-white/10 bg-crown-navy px-2 text-xs text-crown-champagne outline-none"
          >
            <option value="active">active</option>
            <option value="new">new</option>
            <option value="at_risk">at risk</option>
            <option value="inactive">inactive</option>
          </select>
          <span className="rounded-full border border-crown-gold/30 bg-crown-gold/10 px-3 py-1 text-xs text-crown-gold">
            {node.duplicationScore}% duplication
          </span>
          {node.id.startsWith("offline-") ? (
            <button onClick={() => onDelete(node.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-crown-mist" aria-label={`Delete ${node.name}`}>
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-crown-mist md:grid-cols-6">
        {([
          ["activeBuilders", "Builders"],
          ["customers", "Customers"],
          ["personalVolume", "PV"],
          ["teamVolume", "TV"],
          ["groupVolume", "GV"],
          ["duplicationScore", "Score"]
        ] as const).map(([key, label]) => (
          <label key={key} className="rounded-lg bg-white/[0.045] p-2">
            <span>{label}</span>
            <input
              type="number"
              value={node[key]}
              onChange={(event) => onMetricChange(node.id, key, Number(event.target.value))}
              className="mt-1 h-8 w-full rounded-md border border-white/10 bg-crown-navy px-2 font-semibold text-white outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function SocialIcon({ platform }: { platform: OutreachTask["platform"] }) {
  if (platform === "linkedin") return <Linkedin className="text-crown-gold" size={20} />;
  if (platform === "sms" || platform === "whatsapp") return <MessageSquareText className="text-crown-gold" size={20} />;
  if (platform === "instagram" || platform === "facebook") return <Users className="text-crown-gold" size={20} />;
  return <Zap className="text-crown-gold" size={20} />;
}
