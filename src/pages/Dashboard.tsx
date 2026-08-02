import { useState } from "react";
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

export function Dashboard() {
  const workspace = useAuthStore(state => state.workspace);
  const { leads, opportunities, proposals, tasks, customers, tickets } = useDataStore();
  const settings = useSettingsStore(state => state.settings);

  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "overdue" | "high_value">("today");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const wLeads = leads.filter(l => l.workspaceId === workspace?.id);
  const wOpps = opportunities.filter(o => o.workspaceId === workspace?.id);
  const wProposals = proposals.filter(p => p.workspaceId === workspace?.id);
  const wTasks = tasks.filter(t => t.workspaceId === workspace?.id);
  const wCustomers = customers.filter(c => c.workspaceId === workspace?.id);
  const wTickets = tickets.filter(t => t.workspaceId === workspace?.id);

  const currency = settings?.business?.currency || 'USD';
  const target = settings?.business?.monthlyTarget || 100000;
  const now = new Date();

  // Metric calculations
  const uncontactedLeads = wLeads.filter(l => l.status === "new");
  const inSlaLeads = uncontactedLeads.filter(l => {
    const hours = (now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
    return hours <= (settings?.business?.leadSlaHours || 24);
  });
  const hotLeads = wLeads.filter(l => l.temperature === "hot" || (l.score || 0) >= 80);
  const activeOpps = wOpps.filter(o => !["won", "lost"].includes(o.stage.toLowerCase()));
  const weightedPipeline = activeOpps.reduce((sum, opp) => sum + ((opp.estimatedValue || opp.expectedValue || 0) * (opp.stage === "Proposal sent" ? 0.7 : 0.4)), 0);
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Solopreneur Command Centre</h2>
          <p className="text-sm text-slate-500">Real-time daily operational cockpit for single-operator mastery.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleGenerateActionPlan} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
            <Sparkles className="w-4 h-4 mr-2" /> Build today's action plan
          </Button>
        </div>
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
