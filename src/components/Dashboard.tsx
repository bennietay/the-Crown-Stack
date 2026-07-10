/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Lead, Task, TaskStatus, TaskType, Settings, Script, Payment } from "../types";
import { localDb } from "../db/localDb";
import AmwayRoadmap from "./AmwayRoadmap";
import { 
  CheckCircle, 
  Circle, 
  MessageSquare, 
  Flame, 
  Users, 
  Clock, 
  Award, 
  Send, 
  Plus, 
  TrendingUp, 
  BookOpen, 
  Copy, 
  DollarSign, 
  AlertTriangle,
  Play,
  Settings as SettingsIcon,
  CheckSquare,
  Rocket
} from "lucide-react";

interface DashboardProps {
  settings: Settings;
  onNavigateToTab: (tab: string) => void;
  onSelectLeadForDetail: (lead: Lead) => void;
  onAddLeadTrigger: () => void;
}

export default function Dashboard({ 
  settings, 
  onNavigateToTab, 
  onSelectLeadForDetail,
  onAddLeadTrigger
}: DashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dailyLeadsAdded, setDailyLeadsAdded] = useState(0);
  const [dailyMessagesSent, setDailyMessagesSent] = useState(0);
  const [dailyFollowUpsCompleted, setDailyFollowUpsCompleted] = useState(0);
  const [weeklyScore, setWeeklyScore] = useState(0);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [completedStartSteps, setCompletedStartSteps] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pf_start_week_steps") || "[]") as string[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    loadData();
  }, [settings]);

  const loadData = () => {
    const allLeads = localDb.getLeads();
    const allTasks = localDb.getTasks();
    const allScripts = localDb.getScripts();
    const allPayments = localDb.getPayments();

    setLeads(allLeads);
    setTasks(allTasks);
    setScripts(allScripts);
    setPayments(allPayments);

    // Calculate daily progress from leads created today
    const todayStr = new Date().toISOString().split("T")[0];
    
    const leadsAddedToday = allLeads.filter(l => l.created_at.startsWith(todayStr)).length;
    setDailyLeadsAdded(leadsAddedToday);

    // Messages sent today (using interactions)
    const allInteractions = localDb.getInteractions();
    const messagesSentToday = allInteractions.filter(i => 
      i.date.startsWith(todayStr) && 
      (i.type.toLowerCase().includes("message") || i.type.toLowerCase().includes("outreach") || i.type.toLowerCase().includes("contact"))
    ).length;
    setDailyMessagesSent(messagesSentToday);

    // Follow-ups completed today
    const followupsDoneToday = allTasks.filter(t => 
      t.completed_at && 
      t.completed_at.startsWith(todayStr) && 
      t.task_type === TaskType.FollowUp
    ).length;
    setDailyFollowUpsCompleted(followupsDoneToday);

    // Calculate weekly performance score
    // Metrics over the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const leadsLast7Days = allLeads.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
    const tasksCompletedLast7Days = allTasks.filter(t => t.completed_at && new Date(t.completed_at) >= sevenDaysAgo).length;
    const registrationsLast7Days = localDb.getWebinarRegistrations().filter(r => new Date(r.created_at) >= sevenDaysAgo).length;
    
    const baseScore = (leadsLast7Days * 15) + (tasksCompletedLast7Days * 10) + (registrationsLast7Days * 15);
    const contentBonus = settings.grow_mode ? (localDb.getContentPosts().length * 10) : 0;
    
    setWeeklyScore(Math.min(100, Math.max(15, baseScore + contentBonus)));
  };

  const handleToggleTask = (taskId: string) => {
    localDb.toggleTaskStatus(taskId);
    loadData();
  };

  const handleCopyScript = (script: Script) => {
    let text = script.content;
    // Replace standard variables
    text = text.replace(/\{\{name\}\}/g, "Prospect")
               .replace(/\{\{webinar_title\}\}/g, "Side Income Accelerator Webinar")
               .replace(/\{\{webinar_date\}\}/g, "Sunday")
               .replace(/\{\{webinar_time\}\}/g, "8:00 PM")
               .replace(/\{\{replay_link\}\}/g, "https://brightfuture.my/replay")
               .replace(/\{\{whatsapp_link\}\}/g, "https://brightfuture.my/register")
               .replace(/\{\{first_name\}\}/g, settings.name);

    navigator.clipboard.writeText(text);
    setCopiedScriptId(script.id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  const startWeekSteps = [
    {
      id: "profile",
      day: "Day 1",
      title: "Set profile and targets",
      detail: "Confirm WhatsApp, email, brand name, and realistic daily goals."
    },
    {
      id: "first-list",
      day: "Day 2",
      title: "Write your first 20-name list",
      detail: "Add warm contacts who may value products, education, or a conversation."
    },
    {
      id: "disclosure",
      day: "Day 3",
      title: "Practice transparent disclosure",
      detail: "Copy the Amway disclosure script and make it natural in your own voice."
    },
    {
      id: "five-messages",
      day: "Day 4",
      title: "Send five respectful messages",
      detail: "Use opt-in language, no pressure, and log every response."
    },
    {
      id: "followups",
      day: "Day 5",
      title: "Clear all due follow-ups",
      detail: "Move each person to the next honest stage: replied, not now, customer, or do not contact."
    },
    {
      id: "content",
      day: "Day 6",
      title: "Publish one helpful post",
      detail: "Share a wellness, beauty, home-care, or business lesson without claims or hype."
    },
    {
      id: "review",
      day: "Day 7",
      title: "Review and plan next week",
      detail: "Check what created replies, then repeat the simplest working action."
    }
  ];

  const toggleStartStep = (id: string) => {
    setCompletedStartSteps(prev => {
      const next = prev.includes(id) ? prev.filter(step => step !== id) : [...prev, id];
      localStorage.setItem("pf_start_week_steps", JSON.stringify(next));
      return next;
    });
  };

  // Filter tasks due today or overdue
  const todayStr = new Date().toISOString().split("T")[0];
  const pendingFollowups = tasks.filter(t => 
    t.status === TaskStatus.Pending && 
    t.due_date <= todayStr &&
    t.lead_id !== null
  );

  // Filter hot temperature leads
  const hotLeads = leads.filter(l => l.lead_temperature === "Hot" && l.stage !== "Do Not Contact" && l.stage !== "Customer");

  // Get active script
  const disclosureScript = scripts.find(s => s.category === "Amway Disclosure") || scripts[0];

  return (
    <div className="space-y-6 pb-20 w-full font-sans text-gray-900">
      {/* Onboarding / Amway Eligibility Banner */}
      <div className="bg-[#1a1a1a] text-white rounded-[24px] p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-blue-600 text-[10px] font-bold uppercase rounded tracking-wider">Active Workspace</span>
            <span className="text-xs text-gray-400 font-medium">Team: {settings.brand_name}</span>
          </div>
          <h3 className="text-lg font-bold">Welcome back, {settings.name}!</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Workspace Mode: <span className="font-semibold bg-white/10 px-1.5 py-0.5 rounded text-white">{settings.scale_mode ? "Scale Mode" : settings.grow_mode ? "Grow Mode" : "Start Mode"}</span>. Focus on building real customer relationships and sharing compliant Amway Malaysia opportunities.
          </p>
        </div>
        {/* Decorative background glow */}
        <div className="absolute top-[-20px] right-[-20px] w-46 h-46 bg-blue-600 rounded-full blur-[80px] opacity-25"></div>
      </div>

      {/* First week action checklist */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950">First 7 Days Start Plan</h3>
              <p className="text-[10px] text-gray-500">Simple setup and action rhythm for a new Amway business.</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
            {completedStartSteps.length}/{startWeekSteps.length} Complete
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {startWeekSteps.map(step => {
            const done = completedStartSteps.includes(step.id);
            return (
              <button
                id={`start-week-${step.id}`}
                key={step.id}
                onClick={() => toggleStartStep(step.id)}
                className={`p-3 rounded-xl border text-left transition-colors min-h-[112px] ${
                  done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wide">{step.day}</span>
                  <CheckSquare className={`w-4 h-4 ${done ? "text-emerald-600" : "text-gray-300"}`} />
                </div>
                <p className="text-xs font-bold mt-2">{step.title}</p>
                <p className="text-[10px] leading-snug mt-1 opacity-80">{step.detail}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress & Targets Circle Dashboard */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
          <span>Today's Actions</span>
          <span className="text-[10px] font-mono text-gray-400 font-medium">Date: {todayStr}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Leads Added Progress */}
          <div className="p-4 bg-gray-50 rounded-[20px] text-center flex flex-col justify-between items-center relative overflow-hidden border border-gray-100">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Leads Added</span>
            <div className="my-2 flex items-baseline justify-center">
              <span className="text-2xl font-semibold text-gray-950">{dailyLeadsAdded}</span>
              <span className="text-xs text-gray-400">/{settings.daily_lead_target}</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (dailyLeadsAdded / settings.daily_lead_target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Messages Sent Progress */}
          <div className="p-4 bg-gray-50 rounded-[20px] text-center flex flex-col justify-between items-center relative overflow-hidden border border-gray-100">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">First Messages</span>
            <div className="my-2 flex items-baseline justify-center">
              <span className="text-2xl font-semibold text-gray-950">{dailyMessagesSent}</span>
              <span className="text-xs text-gray-400">/{settings.daily_message_target}</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div 
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (dailyMessagesSent / settings.daily_message_target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Follow ups completed Progress */}
          <div className="p-4 bg-gray-50 rounded-[20px] text-center flex flex-col justify-between items-center relative overflow-hidden border border-gray-100">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Follow-Ups</span>
            <div className="my-2 flex items-baseline justify-center">
              <span className="text-2xl font-semibold text-gray-950">{dailyFollowUpsCompleted}</span>
              <span className="text-xs text-gray-400">/{settings.daily_follow_up_target}</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div 
                className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (dailyFollowUpsCompleted / settings.daily_follow_up_target) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Weekly score rating */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs font-bold text-gray-800 leading-none">Weekly Momentum Score</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Based on leads, content, and follow-ups</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-lg font-bold text-blue-600">{weeklyScore}</span>
            <span className="text-xs text-gray-400">/100</span>
          </div>
        </div>
      </div>

      {/* Amway Malaysia PV/BV Monthly Performance Roadmap */}
      <AmwayRoadmap />

      {/* Due Follow-up Reminders queue */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Due Follow-Ups Today ({pendingFollowups.length})</span>
          </h3>
          <button 
            id="nav-to-leads-queue"
            onClick={() => onNavigateToTab("Leads")} 
            className="text-[11px] text-blue-600 font-bold hover:underline"
          >
            View Queue
          </button>
        </div>

        {pendingFollowups.length === 0 ? (
          <div className="p-5 bg-gray-50 rounded-[20px] text-center border border-dashed border-gray-200">
            <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-800">Clean Slate!</p>
            <p className="text-[10px] text-gray-400 mt-0.5">No overdue follow-up tasks remaining.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 sm:grid-cols-2 gap-2">
            {pendingFollowups.slice(0, 3).map(task => {
              const taskLead = leads.find(l => l.id === task.lead_id);
              return (
                <div 
                  key={task.id} 
                  className="p-3 bg-gray-50 hover:bg-gray-100/50 rounded-xl flex items-start justify-between border border-gray-100 transition-colors"
                >
                  <div className="flex items-start space-x-2.5">
                    <button 
                      id={`toggle-task-${task.id}`}
                      onClick={() => handleToggleTask(task.id)} 
                      className="mt-0.5 text-gray-400 hover:text-blue-600"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{task.task_type}</span>
                      <p className="text-xs font-bold text-gray-800">{task.title}</p>
                      {taskLead && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Lead: {taskLead.name} ({taskLead.phone}) • Stage: {taskLead.stage}
                        </p>
                      )}
                    </div>
                  </div>
                  {taskLead && (
                    <button
                      id={`action-followup-${task.id}`}
                      onClick={() => onSelectLeadForDetail(taskLead)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 active:scale-95 transition-transform"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {pendingFollowups.length > 3 && (
              <p className="text-center text-[11px] text-gray-400 mt-2">
                + {pendingFollowups.length - 3} more tasks waiting in the Follow-up Queue.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hot Temperature Leads */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-950 flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Hot Prospects ({hotLeads.length})</span>
          </h3>
          <button 
            id="trigger-add-lead-dash"
            onClick={onAddLeadTrigger}
            className="p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {hotLeads.length === 0 ? (
          <p className="text-[11px] text-gray-400 text-center p-4 bg-gray-50 rounded-[20px] border border-gray-100">
            No prospects marked as "Hot" yet. Update temperatures in CRM details.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {hotLeads.slice(0, 4).map(lead => (
              <div 
                key={lead.id} 
                onClick={() => onSelectLeadForDetail(lead)}
                className="p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">HOT</span>
                    <span className="text-[9px] text-gray-400">{lead.interest_type}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 mt-1">{lead.name}</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-2">{lead.notes || "No additional notes."}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-400">
                  <span>Stage: {lead.stage}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance / Daily script shortcut */}
      {disclosureScript && (
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-950 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Compliant Amway Disclosure</span>
            </h3>
            <button
              id="copy-compliance-script"
              onClick={() => handleCopyScript(disclosureScript)}
              className="text-[10px] flex items-center space-x-1 font-bold text-gray-500 bg-gray-50 border border-gray-200 py-1.5 px-2.5 rounded-lg hover:bg-gray-100"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedScriptId === disclosureScript.id ? "Copied!" : "Copy"}</span>
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed italic">
              “{disclosureScript.content}”
            </p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-[20px] flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-tight">
              Rule 4.3: Be crystal-clear about Amway affiliation from the first contact. Transparency builds professional trust and preserves ABO status.
            </p>
          </div>
        </div>
      )}

      {/* GROW MODE: Content Plan reminder */}
      {settings.grow_mode && (
        <div className="bg-blue-50/50 p-6 rounded-[24px] border border-blue-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-800 flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Today's Content Task</span>
            </h3>
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">GROW ENABLED</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Consistency breeds outreach. Have you published an organic product routine or wellness tip post on Instagram / TikTok today? 
          </p>
          <button
            id="nav-to-more-content"
            onClick={() => onNavigateToTab("More")}
            className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 active:scale-95 transition-transform"
          >
            Open Content Planner
          </button>
        </div>
      )}

      {/* SCALE MODE: Payment status */}
      {settings.scale_mode && payments.length > 0 && (
        <div className="bg-[#1a1a1a] p-6 rounded-[24px] text-white shadow-lg space-y-3 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center space-x-1.5">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span>Stripe Checkout Transactions</span>
              </h3>
              <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono font-bold">SCALE ACTIVE</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {payments.slice(0, 2).map(pay => (
                <div key={pay.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between text-xs border border-white/5">
                  <div>
                    <p className="font-bold text-white">Workshop Registration</p>
                    <p className="text-[10px] text-gray-400">Date: {pay.created_at.split("T")[0]}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-blue-400">RM {pay.amount.toFixed(2)}</span>
                    <span className="block text-[8px] uppercase tracking-wide bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded mt-1">
                      {pay.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative graphic */}
          <div className="absolute top-[-20px] right-[-20px] w-36 h-36 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
        </div>
      )}
    </div>
  );
}
