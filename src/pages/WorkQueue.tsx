import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { format, isBefore, isToday, parseISO, addDays } from "date-fns";
import { CheckCircle2, Clock, DollarSign, HeartHandshake, Sparkles } from "lucide-react";
import { FollowUpTask } from "@/src/types";
import { useSettingsStore } from "@/src/store/settingsStore";

export function WorkQueue() {
  const { tasks, updateTask } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const settings = useSettingsStore(state => state.settings);

  const [activeTab, setActiveTab] = useState<"all" | "revenue" | "customer_engagement">("all");
  const [filterPeriod, setFilterPeriod] = useState<"today" | "overdue" | "upcoming">("today");
  const [selectedTask, setSelectedTask] = useState<FollowUpTask | null>(null);
  const [outcomeNote, setOutcomeNote] = useState("");

  const now = new Date();

  const workspaceTasks = tasks.filter(t => t.workspaceId === workspace?.id);

  // Keep the queue focused on actions that move revenue or retain customers.
  const revenueTasks = workspaceTasks.filter(t => (t.category === "revenue" || t.revenueOpportunity || t.leadId) && t.status === "pending");
  const engagementTasks = workspaceTasks.filter(t => (t.category === "customer_engagement" || (t.customerId && !t.category)) && t.status === "pending");
  const pendingTasks = [...revenueTasks, ...engagementTasks].filter((task, index, list) => list.findIndex(item => item.id === task.id) === index);
  const money = new Intl.NumberFormat(settings.business.locale, {
    style: "currency",
    currency: settings.business.currency,
    maximumFractionDigits: 0,
  });

  const filterByPeriod = (taskList: FollowUpTask[]) => {
    return taskList.filter(t => {
      const due = new Date(t.dueDate);
      if (filterPeriod === "today") return isToday(due);
      if (filterPeriod === "overdue") return isBefore(due, now) && !isToday(due);
      if (filterPeriod === "upcoming") return !isBefore(due, now) && !isToday(due);
      return true;
    });
  };

  const handleComplete = (task: FollowUpTask) => {
    updateTask(task.id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      outcome: outcomeNote || "Completed in daily work queue"
    });
    setSelectedTask(null);
    setOutcomeNote("");
  };

  const handleSnooze = (task: FollowUpTask, days: number) => {
    updateTask(task.id, {
      status: "snoozed",
      dueDate: addDays(new Date(), days).toISOString(),
      snoozedUntil: addDays(new Date(), days).toISOString()
    });
    setSelectedTask(null);
  };

  const renderTaskCard = (t: FollowUpTask) => {
    const isOverdue = isBefore(new Date(t.dueDate), now) && !isToday(new Date(t.dueDate));
    return (
      <div 
        key={t.id}
        className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
          isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-white'
        }`}
        onClick={() => setSelectedTask(t)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <button 
              onClick={(e) => { e.stopPropagation(); handleComplete(t); }}
              className="mt-0.5 h-5 w-5 rounded border border-slate-300 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 text-transparent hover:text-emerald-600 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{t.title}</span>
                {t.revenueOpportunity && (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                    {money.format(t.revenueOpportunity)} Opportunity
                  </Badge>
                )}
                {isOverdue && (
                  <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 text-[10px]">
                    Overdue
                  </Badge>
                )}
              </div>
              {t.reason && <p className="text-xs text-slate-500 font-medium">{t.reason}</p>}
              {t.recommendedAction && (
                <div className="text-xs text-blue-700 bg-blue-50/80 p-2 rounded-md mt-1 border border-blue-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{t.recommendedAction}</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-medium text-slate-500 capitalize flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isToday(new Date(t.dueDate)) ? 'Today' : format(parseISO(t.dueDate), 'MMM d')}
            </span>
            <Badge variant="secondary" className="mt-1 text-[10px] uppercase">
              {t.channel}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-8 flex-1 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Daily Work Queue</h2>
          <p className="text-sm text-slate-500">The next verified actions that can win revenue or retain a customer.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={filterPeriod === "today" ? "default" : "outline"} size="sm" onClick={() => setFilterPeriod("today")}>
            Today ({pendingTasks.filter(task => isToday(new Date(task.dueDate))).length})
          </Button>
          <Button variant={filterPeriod === "overdue" ? "default" : "outline"} size="sm" onClick={() => setFilterPeriod("overdue")}>
            Overdue ({pendingTasks.filter(task => isBefore(new Date(task.dueDate), now) && !isToday(new Date(task.dueDate))).length})
          </Button>
          <Button variant={filterPeriod === "upcoming" ? "default" : "outline"} size="sm" onClick={() => setFilterPeriod("upcoming")}>
            Upcoming
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${activeTab === 'revenue' ? 'ring-2 ring-blue-600 bg-blue-50/20' : 'bg-white border-slate-200'}`}
          onClick={() => setActiveTab(activeTab === 'revenue' ? 'all' : 'revenue')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Revenue Actions</h3>
            </div>
            <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">{revenueTasks.length}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Uncontacted leads, proposal follow-ups, closing deals.</p>
        </div>

        <div 
          className={`p-4 rounded-xl border transition-all cursor-pointer ${activeTab === 'customer_engagement' ? 'ring-2 ring-blue-600 bg-blue-50/20' : 'bg-white border-slate-200'}`}
          onClick={() => setActiveTab(activeTab === 'customer_engagement' ? 'all' : 'customer_engagement')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Customer Engagement</h3>
            </div>
            <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">{engagementTasks.length}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Proactive updates, account reviews and verified expansion opportunities.</p>
        </div>
      </div>

      {/* TASK QUEUE LISTING */}
      <Card>
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-800 capitalize">
            {activeTab === 'all' ? 'All Operating Priorities' : `${activeTab.replace('_', ' ')} Queue`}
          </CardTitle>
          <span className="text-xs text-slate-500">Click a task to review details or record outcome</span>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          {activeTab === 'all' || activeTab === 'revenue' ? (
            filterByPeriod(revenueTasks).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 pt-2">
                  <DollarSign className="w-4 h-4" /> Revenue Actions ({filterByPeriod(revenueTasks).length})
                </h4>
                {filterByPeriod(revenueTasks).map(renderTaskCard)}
              </div>
            )
          ) : null}

          {activeTab === 'all' || activeTab === 'customer_engagement' ? (
            filterByPeriod(engagementTasks).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 pt-4">
                  <HeartHandshake className="w-4 h-4" /> Customer Engagement ({filterByPeriod(engagementTasks).length})
                </h4>
                {filterByPeriod(engagementTasks).map(renderTaskCard)}
              </div>
            )
          ) : null}

          {filterByPeriod(activeTab === "revenue" ? revenueTasks : activeTab === "customer_engagement" ? engagementTasks : pendingTasks).length === 0 && (
            <div className="py-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800 text-sm">Work Queue Cleared!</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No pending tasks for this period. Revenue and customer follow-ups are up to date.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TASK OUTCOME & ACTIONS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in-95">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize text-xs">
                  {selectedTask.category || "Task"}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>✕</Button>
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 mt-2">{selectedTask.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {selectedTask.reason && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                  <span className="font-semibold text-slate-700">Trigger Reason: </span>
                  <span className="text-slate-600">{selectedTask.reason}</span>
                </div>
              )}

              {selectedTask.recommendedAction && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Recommended Action</p>
                  <p>{selectedTask.recommendedAction}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Record Outcome / Notes</label>
                <textarea 
                  className="w-full rounded-md border border-slate-200 p-2.5 text-xs focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                  placeholder="e.g. Call completed, customer agreed to review proposal on Friday..."
                  value={outcomeNote}
                  onChange={e => setOutcomeNote(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleSnooze(selectedTask, 1)}>Snooze 1d</Button>
                  <Button variant="outline" size="sm" onClick={() => handleSnooze(selectedTask, 3)}>Snooze 3d</Button>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" size="sm" onClick={() => handleComplete(selectedTask)}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark Completed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
