import { useEffect, useState } from "react";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { useSettingsStore } from "@/src/store/settingsStore";
import { Link } from "@/src/lib/router";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { 
  ArrowRight, Clock, Target, CheckCircle2, AlertCircle, Sparkles, 
  Flame, DollarSign, Users, LifeBuoy, Wrench, HeartHandshake, PhoneCall, Filter
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { revenueByBusiness, summarizeRevenue } from "@/src/lib/revenue";
import { activeRevenueEvents, conversionRate, goalPacing, isWaasLead, outreachCompleted, weightedOpportunityValue } from "@/src/lib/revenueExecution";
import { businessTopology } from "@/src/store/businessStore";

export function Dashboard() {
  const workspace = useAuthStore(state => state.workspace);
  const { leads, opportunities, proposals, tasks, customers, tickets, revenueEvents, revenueGoals, moneyTasks, notifications, diamondProspects, diamondCustomers, diamondFollowUps, diamondPurchases, addTask } = useDataStore();
  const settings = useSettingsStore(state => state.settings);

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "overdue" | "high_value">("today");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const wLeads = leads.filter(l => l.workspaceId === workspace?.id && isWaasLead(l));
  const wOpps = opportunities.filter(o => o.workspaceId === workspace?.id);
  const wProposals = proposals.filter(p => p.workspaceId === workspace?.id);
  const wTasks = tasks.filter(t => t.workspaceId === workspace?.id);
  const wCustomers = customers.filter(c => c.workspaceId === workspace?.id);
  const wTickets = tickets.filter(t => t.workspaceId === workspace?.id);

  const currency = settings?.business?.currency || 'USD';
  const target = settings?.business?.monthlyTarget || 100000;
  const now = new Date();
  const workspaceRevenue = activeRevenueEvents(revenueEvents.filter(event => event.workspaceId === workspace?.id));
  const todayKey = now.toISOString().slice(0, 10); const monthKey = todayKey.slice(0, 7);
  const todayRevenue = summarizeRevenue(workspaceRevenue.filter(event => event.occurredAt.slice(0, 10) === todayKey));
  const monthRevenue = summarizeRevenue(workspaceRevenue.filter(event => event.occurredAt.slice(0, 7) === monthKey));
  const totalRevenue = summarizeRevenue(workspaceRevenue);
  const businessPerformance = revenueByBusiness(workspaceRevenue);
  const activeGoal = revenueGoals.find(goal => goal.workspaceId === workspace?.id && goal.status === "active");
  const openMoneyTasks = moneyTasks.filter(task => task.workspaceId === workspace?.id && !["completed", "dismissed"].includes(task.status)).sort((a, b) => {
    const aImpact = a.estimatedRevenueImpact !== undefined && a.probability !== undefined ? a.estimatedRevenueImpact * a.probability / 100 : -1;
    const bImpact = b.estimatedRevenueImpact !== undefined && b.probability !== undefined ? b.estimatedRevenueImpact * b.probability / 100 : -1;
    return bImpact - aImpact;
  });
  const unreadNotifications = notifications.filter(notification => notification.workspaceId === workspace?.id && notification.status === "unread");

  // Metric calculations
  const actionableLeadStatuses = new Set(["new", "qualified", "ready_for_outreach", "contacted", "replied", "discovery", "proposal", "negotiation"]);
  const uncontactedLeads = wLeads.filter(l => l.status === "new");
  const reviewRequiredLeads = wLeads.filter(l => l.status === "imported_review_required" || l.status === "researching");
  const inSlaLeads = uncontactedLeads.filter(l => {
    const hours = (now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
    return hours <= (settings?.business?.leadSlaHours || 24);
  });
  const hotLeads = wLeads.filter(l => actionableLeadStatuses.has(l.status) && (l.temperature === "hot" || (l.score || 0) >= 80));
  const activeOpps = wOpps.filter(o => !["won", "lost"].includes(o.stage.toLowerCase()));
  const weightedPipeline = activeOpps.reduce((sum, opp) => sum + weightedOpportunityValue(opp), 0);
  const expectedOTC = wProposals.filter(p => p.status === "sent").reduce((sum, p) => sum + p.totalOTC, 0);
  const expectedMRC = wProposals.filter(p => p.status === "sent").reduce((sum, p) => sum + p.totalMRC, 0);
  const wonThisMonthOTC = wProposals.filter(p => p.status === "accepted" && new Date(p.createdAt).getMonth() === now.getMonth()).reduce((sum, p) => sum + p.totalOTC, 0);
  const wonThisMonthMRC = wProposals.filter(p => p.status === "accepted" && new Date(p.createdAt).getMonth() === now.getMonth()).reduce((sum, p) => sum + p.totalMRC, 0);
  
  const pendingTasks = wTasks.filter(t => t.status === "pending");
  const overdueTasks = pendingTasks.filter(t => isBefore(new Date(t.dueDate), now) && !isToday(new Date(t.dueDate)));
  
  const activeBuilds = wCustomers.filter(c => c.project && c.project.completionPercentage < 100);
  const stagingReviewCustomers = wCustomers.filter(c => c.project && c.project.stage === "staging_review");
  const openTickets = wTickets.filter(t => t.status === "open" || t.status === "in_progress");
  const atRiskCustomers = wCustomers.filter(c => c.health && (c.health.status === "at_risk" || c.health.status === "attention_needed" || c.health.score < 70));
  const carePlanProspects = wCustomers.filter(c => c.waas && c.waas.status === "recommended");
  const waasRevenue = workspaceRevenue.filter(event => event.businessUnit === "WAAS");
  const amwayRevenue = workspaceRevenue.filter(event => event.businessUnit === "AMWAY");
  const amwayProductProspects = diamondProspects.filter(p => p.prospectType === "Product Customer / PC" && !["Closed", "Not Interested", "Archived"].includes(p.status));
  const amwayBusinessProspects = diamondProspects.filter(p => p.prospectType === "Business Builder / ABO" && !["Closed", "Not Interested", "Archived"].includes(p.status));
  const dueAmwayFollowUps = diamondFollowUps.filter(f => !f.completed && new Date(f.dueDate).getTime() <= now.getTime());
  const pipelineValue = Math.round(weightedPipeline + expectedOTC + expectedMRC + amwayProductProspects.length * 500 + amwayBusinessProspects.length * 3000);
  const targetGap = Math.max(0, target - monthRevenue.collected);
  const activeGoalPacing = activeGoal ? goalPacing(activeGoal.targetAmount, monthRevenue.collected, activeGoal.startDate, activeGoal.endDate, now) : goalPacing(target, monthRevenue.collected, `${monthKey}-01`, `${monthKey}-31`, now);
  const outreachTarget = settings?.business?.dailyOutreachTarget ?? 30;
  const outreachDone = outreachCompleted(wLeads, todayKey);
  const waasReplied = wLeads.filter(l => ["replied", "discovery", "proposal", "negotiation", "won"].includes(l.status)).length;
  const waasWon = wLeads.filter(l => l.status === "won").length;
  const amwayContacted = diamondProspects.filter(p => !["Lead", "Not Interested", "Archived"].includes(p.status)).length;
  const amwayJoined = diamondProspects.filter(p => ["Joined ABO", "Joined PC"].includes(p.status)).length;

  // Idempotent revenue automation: materialize only missing actions in the shared queue.
  useEffect(() => {
    if (!workspace?.id) return;
    const cutoff = now.getTime() - 48 * 60 * 60 * 1000;
    const pending = wTasks.filter(task => task.status === "pending");
    const candidates = [
      ...wLeads.filter(lead => ["contacted", "replied", "discovery", "proposal", "negotiation"].includes(lead.status) && new Date(lead.lastContactedAt || lead.createdAt).getTime() < cutoff).map(lead => ({ leadId: lead.id, title: `Re-engage stale WAAS lead: ${lead.contactName}`, channel: "email" as const, reason: "No recorded contact in 48 hours", recommendedAction: "Send a personalized value follow-up and log the reply." })),
      ...wProposals.filter(proposal => proposal.status === "sent" && new Date(proposal.updatedAt || proposal.createdAt).getTime() < now.getTime() - 3 * 86400000).map(proposal => ({ opportunityId: proposal.opportunityId, title: `Proposal decision follow-up: ${proposal.title || proposal.id}`, channel: "call" as const, reason: "Proposal has been sent for more than 3 days", recommendedAction: "Ask for the decision date or resolve the main objection." })),
      ...diamondCustomers.filter(customer => customer.isActive && customer.nextReorderDate && customer.nextReorderDate <= new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)).map(customer => ({ customerId: customer.id, title: `Amway reorder follow-up: ${customer.name}`, channel: "whatsapp" as const, reason: "Customer reorder is due within 7 days", recommendedAction: "Check usage, recommend the next order, and record the outcome." })),
    ];
    const missing = candidates.filter(candidate => !pending.some(task => task.title === candidate.title));
    if (!missing.length) return;
    void Promise.all(missing.slice(0, 30).map(candidate => addTask({ workspaceId: workspace.id, ...candidate, category: "revenue", dueDate: todayKey, status: "pending", owner: settings.sales.defaultOwner || "usr-bennie" }))).catch(error => console.error("Revenue action automation failed", error));
  }, [workspace?.id, wLeads, wProposals, diamondCustomers, wTasks, addTask, settings.sales.defaultOwner, todayKey]);
  const actionItems = [
    ...hotLeads.slice(0, 20).map(l => `Contact hot WAAS lead: ${l.contactName}`),
    ...overdueTasks.slice(0, 10).map(t => `Complete overdue follow-up: ${t.contactName || t.title}`),
    ...amwayBusinessProspects.slice(0, 20).map(p => `Invite Amway presentation: ${p.name}`),
    ...dueAmwayFollowUps.slice(0, 10).map(f => `Follow up with Amway contact: ${f.contactName}`),
    ...wProposals.filter(p => p.status === "sent").slice(0, 10).map(p => `Close proposal: ${p.title || p.id}`),
  ];

  // Generate Ranked "Today's Priorities" List
  let priorities: Array<{
    id: string;
    rank: number;
    title: string;
    subtitle: string;
    type: "lead" | "proposal" | "task" | "customer" | "ticket";
    urgencyText: string;
    urgencyColor: string;
    valueText?: string;
    link: string;
  }> = [];

  // 1. Hot uncontacted lead breached SLA (>24h)
  uncontactedLeads.filter(l => l.temperature === "hot" && (now.getTime() - new Date(l.createdAt).getTime()) / 3600000 > 24).forEach(l => {
    priorities.push({
      id: `p1-${l.id}`,
      rank: 1,
      title: `🔥 CRITICAL SLA BREACH: ${l.contactName}`,
      subtitle: `${l.companyName || l.email} • Budget: ${l.details?.budget || 'High'}`,
      type: "lead",
      urgencyText: "SLA Breached (>24h)",
      urgencyColor: "bg-red-100 text-red-800 border-red-300",
      valueText: `$${(l.estimatedOtc || 10000).toLocaleString()}`,
      link: "/leads"
    });
  });

  // 2. Hot uncontacted lead within SLA (<24h)
  uncontactedLeads.filter(l => l.temperature === "hot" && (now.getTime() - new Date(l.createdAt).getTime()) / 3600000 <= 24).forEach(l => {
    priorities.push({
      id: `p2-${l.id}`,
      rank: 2,
      title: `🔥 Hot Inbound Lead: ${l.contactName}`,
      subtitle: `Needs outreach • ${l.companyName || l.email}`,
      type: "lead",
      urgencyText: "Urgent SLA (<24h)",
      urgencyColor: "bg-amber-100 text-amber-800 border-amber-300",
      valueText: `$${(l.estimatedOtc || 8000).toLocaleString()}`,
      link: "/leads"
    });
  });

  // 3. Proposal decision follow-up / objection check
  wOpps.filter(o => o.stage === "proposal_sent").forEach(o => {
    priorities.push({
      id: `p3-${o.id}`,
      rank: 3,
      title: `Proposal Decision Due: ${o.name}`,
      subtitle: o.mainObjection ? `Main objection: ${o.mainObjection}` : "Awaiting signoff",
      type: "proposal",
      urgencyText: "Closing Action",
      urgencyColor: "bg-purple-100 text-purple-800 border-purple-300",
      valueText: `${currency} ${o.estimatedValue.toLocaleString()}`,
      link: "/proposals"
    });
  });

  // Imported prospect lists must be audited before outreach. Surface the work
  // without treating unaudited rows as qualified or revenue-ready leads.
  if (reviewRequiredLeads.length) {
    priorities.push({
      id: "p-review-imported-leads",
      rank: 5,
      title: `Audit ${reviewRequiredLeads.length} imported prospect${reviewRequiredLeads.length === 1 ? "" : "s"}`,
      subtitle: "Verify the business, website condition, contact route and message before outreach.",
      type: "lead",
      urgencyText: "Research required",
      urgencyColor: "bg-blue-50 text-blue-800 border-blue-200",
      link: "/leads"
    });
  }

  // 4. Overdue tasks
  overdueTasks.forEach(t => {
    priorities.push({
      id: `p4-${t.id}`,
      rank: 6,
      title: `Overdue Follow-up: ${t.title}`,
      subtitle: `${t.contactName || 'Contact'} • ${t.channel}`,
      type: "task",
      urgencyText: "Overdue",
      urgencyColor: "bg-red-50 text-red-700 border-red-200",
      link: "/queue"
    });
  });

  // 5. At-risk account warning
  atRiskCustomers.forEach(c => {
    priorities.push({
      id: `p5-${c.id}`,
      rank: 7,
      title: `At-Risk Customer: ${c.name}`,
      subtitle: `Health score: ${c.health?.score || 60}/100 • Delay: ${c.health?.projectDelayDays || 0}d`,
      type: "customer",
      urgencyText: "Health Warning",
      urgencyColor: "bg-amber-50 text-amber-800 border-amber-200",
      link: "/customers"
    });
  });

  // 6. Unanswered tickets
  openTickets.filter(t => t.priority === "critical" || t.priority === "high").forEach(t => {
    priorities.push({
      id: `p6-${t.id}`,
      rank: 8,
      title: `High Priority Ticket: ${t.subject}`,
      subtitle: t.isBillable ? "Billable change proposal eligible" : "Included support request",
      type: "ticket",
      urgencyText: `${t.priority.toUpperCase()} Ticket`,
      urgencyColor: "bg-orange-100 text-orange-800 border-orange-200",
      link: "/tickets"
    });
  });

  // Sort by priority rank
  priorities = priorities.sort((a, b) => a.rank - b.rank);

  // Apply UI time filters
  if (timeFilter === "overdue") {
    priorities = priorities.filter(p => p.urgencyText.toLowerCase().includes("overdue") || p.urgencyText.toLowerCase().includes("breach"));
  } else if (timeFilter === "high_value") {
    priorities = priorities.filter(p => !!p.valueText);
  }

  const handleGenerateActionPlan = () => {
    setShowSummaryModal(true);
    const leadAction = uncontactedLeads.length
      ? `Contact ${uncontactedLeads.length} new lead(s), starting with the hottest and oldest enquiry.`
      : "Lead inbox is clear; share the public enquiry form in one high-intent channel today.";
    const proposalAction = expectedOTC || expectedMRC
      ? `Follow up on ${currency} ${expectedOTC.toLocaleString()} one-off and ${currency} ${expectedMRC.toLocaleString()}/month in shared proposals.`
      : "Prepare one clear proposal for the strongest qualified opportunity.";
    const taskAction = overdueTasks.length
      ? `Complete ${overdueTasks.length} overdue follow-up(s) before starting lower-value work.`
      : "No overdue follow-ups; schedule the next closing action for every active opportunity.";
    setAiSummary(`Today's revenue action plan:\n• ${leadAction}\n• ${proposalAction}\n• ${taskAction}`);
  };

  return (
    <div className="p-8 space-y-8 flex-1 overflow-y-auto">
      {/* HEADER & BRIEFING TRIGGER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Revenue Command Center</h2>
          <p className="text-sm text-slate-500">WAAS + Amway only. Start with the money, then execute the next best action.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerateActionPlan} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" /> Build today's action plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <ExecutiveMetric label="Revenue today" value={`MYR ${todayRevenue.collected.toLocaleString()}`} />
        <ExecutiveMetric label="Revenue this month" value={`MYR ${monthRevenue.collected.toLocaleString()}`} />
        <ExecutiveMetric label="Profit today" value={`MYR ${todayRevenue.profit.toLocaleString()}`} />
        <ExecutiveMetric label="Profit this month" value={`MYR ${monthRevenue.profit.toLocaleString()}`} />
        <ExecutiveMetric label="Monthly target" value={`MYR ${target.toLocaleString()}`} />
        <ExecutiveMetric label="Gap to target" value={`MYR ${targetGap.toLocaleString()}`} />
        <ExecutiveMetric label="Pipeline value" value={`MYR ${pipelineValue.toLocaleString()}`} />
        <ExecutiveMetric label="Forecast next 30d" value={`MYR ${Math.round(monthRevenue.expected + pipelineValue * 0.4).toLocaleString()}`} />
        <ExecutiveMetric label="WAAS MRR" value={`MYR ${wonThisMonthMRC.toLocaleString()}`} />
        <ExecutiveMetric label="Amway sales" value={`MYR ${amwayRevenue.filter(e => e.status === "collected").reduce((s,e) => s + (e.grossRevenue || 0), 0).toLocaleString()}`} />
        <ExecutiveMetric label="Follow-ups due" value={(overdueTasks.length + dueAmwayFollowUps.length).toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Target pacing</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><span className="text-2xl font-extrabold text-slate-900">{Math.round(activeGoalPacing.pace * 100)}%</span><span className={`text-xs font-bold ${activeGoalPacing.onTrack ? "text-emerald-600" : "text-amber-600"}`}>{activeGoalPacing.onTrack ? "On track" : "Recovery needed"}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${activeGoalPacing.onTrack ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, activeGoalPacing.pace * 100)}%` }} /></div><p className="mt-2 text-xs text-slate-500">MYR {Math.round(activeGoalPacing.collected).toLocaleString()} collected · MYR {Math.round(activeGoalPacing.gap).toLocaleString()} gap</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Today's outreach</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><span className="text-2xl font-extrabold text-slate-900">{outreachDone}/{outreachTarget}</span><span className="text-xs font-bold text-indigo-600">{Math.round((outreachDone / Math.max(1, outreachTarget)) * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, outreachDone / Math.max(1, outreachTarget) * 100)}%` }} /></div><p className="mt-2 text-xs text-slate-500">Messages recorded today across WAAS leads</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Next 7 days</CardTitle></CardHeader><CardContent><p className="text-2xl font-extrabold text-slate-900">MYR {Math.round(monthRevenue.expected + pipelineValue * 0.25).toLocaleString()}</p><p className="mt-1 text-xs text-slate-500">Expected from booked revenue and 25% of active pipeline</p><Link to="/pipeline" className="mt-3 inline-flex text-xs font-bold text-indigo-600">Work pipeline <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-indigo-200 bg-indigo-50/50"><CardHeader><CardTitle className="text-lg">What should Bennie do TODAY to make money?</CardTitle></CardHeader><CardContent><p className="text-sm font-semibold text-slate-800">Close the highest-probability conversations before creating new work.</p><ol className="mt-3 space-y-2">{(actionItems.length ? actionItems : ["Add or import prospects, then contact the highest-scored person today."]).slice(0, 7).map((item, i) => <li key={`${item}-${i}`} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span><span>{item}</span></li>)}</ol></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Business performance</CardTitle></CardHeader><CardContent className="space-y-3"><PerformanceRow label="WAAS" value={`MYR ${summarizeRevenue(waasRevenue).collected.toLocaleString()}`} detail={`${wLeads.length} leads · ${wOpps.length} opportunities · ${wonThisMonthMRC.toLocaleString()} MRR`} href="/leads" /><PerformanceRow label="Amway" value={`MYR ${summarizeRevenue(amwayRevenue).collected.toLocaleString()}`} detail={`${diamondProspects.length} prospects · ${diamondCustomers.length} customers · ${diamondPurchases.length} purchases`} href="/diamond" /></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Conversion scoreboard</CardTitle><p className="text-xs text-slate-500">Activity is only useful when it moves people toward revenue.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4"><div className="flex items-center justify-between"><p className="font-bold text-slate-900">WAAS</p><span className="text-xs font-bold text-indigo-700">{conversionRate(waasReplied, wLeads.length)}% lead → reply</span></div><p className="mt-2 text-sm text-slate-600">{wLeads.length} leads · {waasReplied} replied/active · {waasWon} won</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${conversionRate(waasReplied, wLeads.length)}%` }} /></div><p className="mt-2 text-xs text-slate-500">Reply → win: {conversionRate(waasWon, waasReplied)}%</p></div><div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4"><div className="flex items-center justify-between"><p className="font-bold text-slate-900">Amway</p><span className="text-xs font-bold text-emerald-700">{conversionRate(amwayJoined, diamondProspects.length)}% joined</span></div><p className="mt-2 text-sm text-slate-600">{diamondProspects.length} prospects · {amwayContacted} contacted · {amwayJoined} joined PC/ABO</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${conversionRate(amwayJoined, diamondProspects.length)}%` }} /></div><p className="mt-2 text-xs text-slate-500">Contacted → joined: {conversionRate(amwayJoined, amwayContacted)}%</p></div></CardContent></Card>

      <div className="grid gap-3 md:grid-cols-2">
        <BusinessSnapshot title="WAAS" href="/leads" primary={`${wLeads.length.toLocaleString()} leads`} secondary={`${wOpps.length.toLocaleString()} opportunities · ${wCustomers.length.toLocaleString()} customers`} />
        <BusinessSnapshot title="Amway" href="/diamond" primary={`${diamondProspects.filter(item => item.workspaceId === workspace?.id).length.toLocaleString()} prospects`} secondary={`${diamondCustomers.filter(item => item.workspaceId === workspace?.id).length.toLocaleString()} customers · ${diamondFollowUps.filter(item => item.workspaceId === workspace?.id && !item.completed).length.toLocaleString()} follow-ups`} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="font-bold text-slate-900">Revenue Command Center</h3><p className="text-xs text-slate-500">Only WAAS and Amway are active revenue engines. Select one in the left rail to work its loop.</p></div><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2 focused engines</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{businessTopology.map(business => <Link key={business.id} to={business.href} className="rounded-lg border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/30"><div className="flex items-center justify-between"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-600">{business.shortName}</p><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></div><p className="mt-2 text-xs font-semibold text-slate-800">{business.monetization}</p><div className="mt-3 space-y-1">{business.nav.slice(0, 4).map((item, index) => <div key={item.name} className="flex items-center gap-2 text-[11px] text-slate-500"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">{index + 1}</span>{item.name}</div>)}</div></Link>)}</div></div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold text-slate-900">Revenue by business</h3><p className="text-xs text-slate-500">MYR only, or foreign currency with a recorded MYR rate.</p></div>
          <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-4 py-2">Business</th><th className="px-4 py-2">Collected</th><th className="px-4 py-2">Booked</th><th className="px-4 py-2">Expected</th><th className="px-4 py-2">Profit</th></tr></thead><tbody>{businessPerformance.map(row => <tr key={row.businessUnit} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{row.businessUnit}</td><td className="px-4 py-3">MYR {row.collected.toLocaleString()}</td><td className="px-4 py-3">MYR {row.booked.toLocaleString()}</td><td className="px-4 py-3">MYR {row.expected.toLocaleString()}</td><td className="px-4 py-3 text-emerald-700">MYR {row.profit.toLocaleString()}</td></tr>)}</tbody></table>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Highest-impact work</h3><p className="text-xs text-slate-500">Based only on saved impact and probability.</p></div><Link to="/money-tasks" className="text-xs font-bold text-indigo-600">View all</Link></div><div className="mt-3 space-y-2">{openMoneyTasks.length ? openMoneyTasks.slice(0, 5).map(task => <div key={task.id} className="rounded-lg bg-slate-50 p-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-slate-900">{task.title}</p><span className="text-[10px] font-bold text-indigo-700">{task.businessUnit}</span></div><p className="mt-1 text-xs text-slate-500">{task.estimatedRevenueImpact !== undefined && task.probability !== undefined ? `Expected MYR ${(task.estimatedRevenueImpact * task.probability / 100).toLocaleString()}` : "Financial impact not estimated"}</p></div>) : <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-500">No open Money Tasks.</p>}</div></div>
      </div>

      {/* 16 SUMMARY CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Uncontacted Leads</p>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{uncontactedLeads.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">In SLA (&lt;24h)</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{inSlaLeads.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Overdue Follow-ups</p>
          <p className="text-xl font-extrabold text-red-600 mt-1">{overdueTasks.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">🔥 Hot Leads</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{hotLeads.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Active Opps</p>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{activeOpps.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Weighted Pipeline</p>
          <p className="text-sm font-extrabold text-slate-800 mt-1">{currency} {Math.round(weightedPipeline).toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Sent Proposals OTC</p>
          <p className="text-sm font-extrabold text-purple-600 mt-1">{currency} {expectedOTC.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Sent Proposals MRC</p>
          <p className="text-sm font-extrabold text-indigo-600 mt-1">{currency} {expectedMRC.toLocaleString()}/mo</p>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Won OTC Month</p>
          <p className="text-sm font-extrabold text-emerald-600 mt-1">{currency} {wonThisMonthOTC.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Won MRC Month</p>
          <p className="text-sm font-extrabold text-emerald-600 mt-1">{currency} {wonThisMonthMRC.toLocaleString()}/mo</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Active Builds</p>
          <p className="text-xl font-extrabold text-slate-800 mt-1">{activeBuilds.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Staging Review</p>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{stagingReviewCustomers.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Open Tickets</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{openTickets.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">At-Risk Accounts</p>
          <p className="text-xl font-extrabold text-red-600 mt-1">{atRiskCustomers.length}</p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] font-bold uppercase text-slate-400">Care Plan Prospects</p>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{carePlanProspects.length}</p>
        </div>
      </div>

      {/* TODAY'S RANKED PRIORITIES BOARD */}
      <Card>
        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <CardTitle className="text-lg font-bold text-slate-900">Today's Priorities (Ranked by Commercial Urgency)</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={timeFilter === "today" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("today")}>Today</Button>
            <Button variant={timeFilter === "overdue" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("overdue")}>Overdue Only</Button>
            <Button variant={timeFilter === "high_value" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("high_value")}>High Value</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100">
          {priorities.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">All urgent priority items complete!</p>
              <p className="text-xs text-slate-400 mt-1">Check the Daily Work Queue for routine tasks.</p>
            </div>
          ) : (
            priorities.map((item, i) => (
              <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-all flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs items-center justify-center shrink-0">
                    #{i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${item.urgencyColor}`}>
                        {item.urgencyText}
                      </Badge>
                      {item.valueText && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                          {item.valueText}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>
                <Link to={item.link}>
                  <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
                    Execute <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* DAILY ACTION PLAN MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Today's revenue action plan
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSummaryModal(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {aiSummary}
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => setShowSummaryModal(false)}>Close action plan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BusinessSnapshot({ title, href, primary, secondary }: { title: string; href: string; primary: string; secondary: string }) {
  return <Link to={href} className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{title}</p><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" /></div><p className="mt-3 text-lg font-extrabold text-slate-900">{primary}</p><p className="mt-1 text-xs text-slate-500">{secondary}</p></Link>;
}

function PerformanceRow({ label, value, detail, href }: { label: string; value: string; detail: string; href: string }) {
  return <Link to={href} className="block rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/40"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">{label}</span><span className="text-sm font-extrabold text-emerald-700">{value}</span></div><p className="mt-1 text-xs text-slate-500">{detail}</p></Link>;
}

function ExecutiveMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div>; }
