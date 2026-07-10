/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Lead, 
  LeadStage, 
  InterestType, 
  PermissionStatus, 
  Interaction, 
  Task, 
  Script, 
  Settings,
  Product
} from "../types";
import { localDb } from "../db/localDb";
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  MessageSquare, 
  Flame, 
  User, 
  Phone, 
  Mail, 
  Sparkles, 
  Send, 
  PlusCircle, 
  ChevronRight, 
  FolderPlus, 
  X, 
  AlertCircle, 
  TrendingUp, 
  CheckCircle2, 
  Briefcase, 
  UserPlus, 
  Smile, 
  XOctagon, 
  List, 
  Columns, 
  Inbox 
} from "lucide-react";

interface LeadsManagerProps {
  settings: Settings;
  selectedLeadFromOutside: Lead | null;
  onClearSelectedLead: () => void;
  onAddLeadTrigger: boolean;
  onResetAddLeadTrigger: () => void;
}

export default function LeadsManager({ 
  settings, 
  selectedLeadFromOutside,
  onClearSelectedLead,
  onAddLeadTrigger,
  onResetAddLeadTrigger
}: LeadsManagerProps) {
  // CRM Views: 'list' | 'pipeline' | 'queue' | 'calendar'
  const [viewMode, setViewMode] = useState<"list" | "pipeline" | "queue" | "calendar">("list");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [interestFilter, setInterestFilter] = useState<string>("All");
  const [stageFilter, setStageFilter] = useState<string>("All");

  // Form Modals
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);

  // Form States: New Lead
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPlatform, setNewLeadPlatform] = useState("WhatsApp");
  const [newLeadSource, setNewLeadSource] = useState("");
  const [newLeadInterest, setNewLeadInterest] = useState<InterestType>(InterestType.Wellness);
  const [newLeadTemp, setNewLeadTemp] = useState<"Cold" | "Warm" | "Hot">("Warm");
  const [newLeadStage, setNewLeadStage] = useState<LeadStage>(LeadStage.New);
  const [newLeadAngle, setNewLeadAngle] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [newLeadFollowUpDate, setNewLeadFollowUpDate] = useState(new Date().toISOString().split("T")[0]);

  // Form States: New Interaction
  const [interactionType, setInteractionType] = useState("WhatsApp outreach");
  const [interactionNotes, setInteractionNotes] = useState("");

  // Script Preview/Generator inside detail
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiOptions, setAiOptions] = useState<{ type: string; description: string; message: string }[]>([]);
  const [aiError, setAiError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadLeads();
    setScripts(localDb.getScripts());
    setProducts(localDb.getProducts());
  }, []);

  useEffect(() => {
    if (selectedLeadFromOutside) {
      setSelectedLead(selectedLeadFromOutside);
      onClearSelectedLead(); // reset trigger
    }
  }, [selectedLeadFromOutside]);

  useEffect(() => {
    if (onAddLeadTrigger) {
      setShowAddLeadModal(true);
      onResetAddLeadTrigger();
    }
  }, [onAddLeadTrigger]);

  const loadLeads = () => {
    setLeads(localDb.getLeads());
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) {
      alert("Name and Phone are required.");
      return;
    }

    // Standardize phone format (Malaysian numbers should prefix 60)
    let formattedPhone = newLeadPhone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "60" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("60") && formattedPhone.length > 5) {
      formattedPhone = "60" + formattedPhone;
    }

    const leadToCreate: Lead = {
      id: `l_${Date.now()}`,
      name: newLeadName,
      phone: formattedPhone,
      email: newLeadEmail,
      platform: newLeadPlatform,
      source: newLeadSource || "Direct",
      interest_type: newLeadInterest,
      lead_temperature: newLeadTemp,
      stage: newLeadStage,
      permission_status: PermissionStatus.OkToFollowUp,
      best_angle: newLeadAngle,
      notes: newLeadNotes,
      last_contacted_at: null,
      next_follow_up_at: newLeadFollowUpDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    localDb.saveLead(leadToCreate);
    loadLeads();
    setShowAddLeadModal(false);

    // Reset Form Fields
    setNewLeadName("");
    setNewLeadPhone("");
    setNewLeadEmail("");
    setNewLeadSource("");
    setNewLeadAngle("");
    setNewLeadNotes("");
  };

  const handleAddInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !interactionNotes) return;

    localDb.addInteraction({
      lead_id: selectedLead.id,
      type: interactionType,
      notes: interactionNotes,
      date: new Date().toISOString()
    });

    // Reload active lead detail
    const refreshedLead = localDb.getLeads().find(l => l.id === selectedLead.id);
    if (refreshedLead) setSelectedLead(refreshedLead);

    loadLeads();
    setShowAddInteractionModal(false);
    setInteractionNotes("");
  };

  const handleQuickStageChange = (newStage: LeadStage) => {
    if (!selectedLead) return;
    const updatedLead = { ...selectedLead, stage: newStage };
    localDb.saveLead(updatedLead);
    setSelectedLead(updatedLead);
    loadLeads();
  };

  const handleUpdatePermissionStatus = (status: PermissionStatus) => {
    if (!selectedLead) return;
    const updatedLead: Lead = { 
      ...selectedLead, 
      permission_status: status,
      stage: status === PermissionStatus.DoNotContact ? LeadStage.DoNotContact : selectedLead.stage
    };
    localDb.saveLead(updatedLead);
    setSelectedLead(updatedLead);
    loadLeads();
  };

  const handleDeleteLead = (id: string) => {
    if (window.confirm("Are you sure you want to delete this prospect and their history?")) {
      localDb.deleteLead(id);
      setSelectedLead(null);
      loadLeads();
    }
  };

  // Trigger Script Interpolation
  const handleSelectScript = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    const script = scripts.find(s => s.id === scriptId);
    if (script && selectedLead) {
      let content = script.content;
      content = content.replace(/\{\{name\}\}/g, selectedLead.name)
                       .replace(/\{\{webinar_title\}\}/g, "Malaysian Side Income Accelerator")
                       .replace(/\{\{webinar_date\}\}/g, "Next Sunday")
                       .replace(/\{\{webinar_time\}\}/g, "8:00 PM")
                       .replace(/\{\{replay_link\}\}/g, `${window.location.origin}/webinar/side-income-accelerator/replay`)
                       .replace(/\{\{whatsapp_link\}\}/g, `${window.location.origin}/webinar/side-income-accelerator/register`)
                       .replace(/\{\{first_name\}\}/g, settings.name);
      setGeneratedMessage(content);
    } else {
      setGeneratedMessage("");
    }
  };

  const handleGenerateAiScripts = async () => {
    if (!selectedLead) return;
    setIsGeneratingAi(true);
    setAiError("");
    setAiOptions([]);
    try {
      const response = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedLead.name,
          interestType: selectedLead.interest_type,
          temperature: selectedLead.lead_temperature,
          stage: selectedLead.stage,
          notes: selectedLead.notes || `Sourced from ${selectedLead.source}`,
          settings: settings
        })
      });
      const data = await response.json();
      if (data.success && data.scripts) {
        setAiOptions(data.scripts);
      } else {
        setAiError(data.error || "Failed to generate outreach scripts.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError("Error calling ProspectFlow AI Server. Please try again.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (!selectedLead) return;
    const cleanPhone = selectedLead.phone.replace(/\D/g, "");
    const encodedText = encodeURIComponent(generatedMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, "_blank");

    // Automatically log this outreach
    localDb.addInteraction({
      lead_id: selectedLead.id,
      type: "WhatsApp outreach",
      notes: `Sent message: "${generatedMessage.substring(0, 60)}..."`,
      date: new Date().toISOString()
    });

    // Refresh lead state
    const refreshed = localDb.getLeads().find(l => l.id === selectedLead.id);
    if (refreshed) setSelectedLead(refreshed);
    loadLeads();
  };

  // Compliance checker warning helper
  const checkMessageCompliance = (text: string) => {
    const riskyTerms = [
      "guaranteed income", "easy money", "cure", "treat disease", 
      "no effort", "secret opportunity", "get rich quick", 
      "guaranteed results", "limited territory", "no selling required"
    ];
    return riskyTerms.filter(term => text.toLowerCase().includes(term));
  };

  // Filtering Logic
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.phone.includes(searchQuery) || 
                          l.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInterest = interestFilter === "All" || l.interest_type === interestFilter;
    const matchesStage = stageFilter === "All" || l.stage === stageFilter;
    return matchesSearch && matchesInterest && matchesStage;
  });

  // Follow-up Queue Filtering (Due or overdue)
  const todayStr = new Date().toISOString().split("T")[0];
  const queueLeads = leads.filter(l => l.next_follow_up_at && l.next_follow_up_at <= todayStr && l.stage !== LeadStage.DoNotContact);
  const next14Days = Array.from({ length: 14 }, (_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() + idx);
    return date.toISOString().split("T")[0];
  });

  return (
    <div className="space-y-4 pb-20 w-full font-sans text-gray-900">
      {/* Detail Page Router View */}
      {selectedLead ? (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden animate-fade-in space-y-4">
          {/* Header Block */}
          <div className="bg-[#1a1a1a] text-white p-6 relative overflow-hidden">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <button 
                  id="back-to-leads-list"
                  onClick={() => setSelectedLead(null)} 
                  className="text-xs text-gray-400 hover:text-white flex items-center mb-2 font-medium"
                >
                  ← Back to Pipeline
                </button>
                <h2 className="text-xl font-bold tracking-tight">{selectedLead.name}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedLead.lead_temperature === "Hot" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                    selectedLead.lead_temperature === "Warm" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                    "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {selectedLead.lead_temperature} Temp
                  </span>
                  <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full border border-white/5">
                    {selectedLead.interest_type}
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                    Stage: {selectedLead.stage}
                  </span>
                </div>
              </div>
              <button 
                id={`delete-lead-${selectedLead.id}`}
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold"
              >
                Delete
              </button>
            </div>
            {/* Decorative bg light */}
            <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-blue-600 rounded-full blur-[60px] opacity-25"></div>
          </div>

          <div className="p-5 space-y-4">
            {/* Quick Actions Panel */}
            <div className="bg-gray-50 p-4 rounded-[20px] border border-gray-100 space-y-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Quick Funnel Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mark-lead-customer"
                  onClick={() => handleQuickStageChange(LeadStage.Customer)}
                  className="py-2 px-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-xs font-bold text-gray-700 flex items-center space-x-1.5 justify-center transition-colors"
                >
                  <Smile className="w-4 h-4 text-blue-600" />
                  <span>Mark as Customer</span>
                </button>
                <button
                  id="mark-lead-partner"
                  onClick={() => handleQuickStageChange(LeadStage.BusinessProspect)}
                  className="py-2 px-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl text-xs font-bold text-gray-700 flex items-center space-x-1.5 justify-center transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Business Prospect</span>
                </button>
                <button
                  id="mark-lead-notnow"
                  onClick={() => handleQuickStageChange(LeadStage.NotNow)}
                  className="py-2 px-3 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 flex items-center space-x-1.5 justify-center transition-colors"
                >
                  <XOctagon className="w-4 h-4 text-slate-400" />
                  <span>Not Ready (30d)</span>
                </button>
                <button
                  id="mark-lead-dnc"
                  onClick={() => handleQuickStageChange(LeadStage.DoNotContact)}
                  className="py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-bold text-rose-700 flex items-center space-x-1.5 justify-center transition-colors"
                >
                  <XOctagon className="w-4 h-4 text-rose-500" />
                  <span>Do Not Contact</span>
                </button>
              </div>
            </div>

            {/* Profile detail cards */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Contact Information</h3>
              <div className="bg-slate-50 p-3 rounded-xl space-y-2.5 border border-slate-100 text-xs">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{selectedLead.email || "No email stored."}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Source: {selectedLead.source} ({selectedLead.platform})</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Next Follow-up Date: <span className="font-bold text-blue-600">{selectedLead.next_follow_up_at || "None"}</span></span>
                </div>
                {selectedLead.best_angle && (
                  <div className="pt-2 border-t border-slate-200 mt-2">
                    <p className="font-bold text-slate-700 mb-0.5">Best Angle/Hook:</p>
                    <p className="text-slate-600 italic">"{selectedLead.best_angle}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* PDPA Compliance & Data Consent Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase">PDPA Consent & Privacy</h3>
                <span className="text-[9px] bg-slate-900 text-emerald-400 font-mono px-2 py-0.5 rounded-full font-bold">
                  PDPA 2010
                </span>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100 text-xs">
                {/* Status Indicator */}
                <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      selectedLead.permission_status === PermissionStatus.OkToFollowUp ? "bg-emerald-500 animate-pulse" :
                      selectedLead.permission_status === PermissionStatus.NoReplyYet ? "bg-amber-400" : "bg-rose-500"
                    }`} />
                    <span className="font-bold text-slate-850">
                      {selectedLead.permission_status === PermissionStatus.OkToFollowUp ? "Consent Granted (Opt-In)" :
                       selectedLead.permission_status === PermissionStatus.NoReplyYet ? "Verification Pending" : "Consent Revoked / Opt-Out"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-450 font-mono">
                    {selectedLead.source === "Webinar Form" ? "Webinar Opt-In" : "Manual Log"}
                  </span>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Data processing limited to Amway Malaysia product consultations & direct-selling opportunities. Medical/income guarantees prohibited.
                </p>

                {/* Consent Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {selectedLead.permission_status !== PermissionStatus.OkToFollowUp ? (
                    <button
                      id="grant-consent-btn"
                      onClick={() => handleUpdatePermissionStatus(PermissionStatus.OkToFollowUp)}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] rounded-lg text-center transition-colors shadow-xs"
                    >
                      Log Verbal Opt-In
                    </button>
                  ) : (
                    <button
                      id="revoke-consent-btn"
                      onClick={() => handleUpdatePermissionStatus(PermissionStatus.DoNotContact)}
                      className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[10px] rounded-lg text-center transition-colors shadow-xs"
                    >
                      Revoke Opt-In
                    </button>
                  )}
                  
                  <button
                    id="copy-pdpa-notice-btn"
                    onClick={() => {
                      const msg = `Hi ${selectedLead.name}, this is ${settings.name} (Amway Business Owner). Under the Malaysian Personal Data Protection Act (PDPA) 2010, I would like to verify that you consent to me keeping your contact details to share Nutrilite, Artistry, or Amway business updates with you. You can request to view, correct, or delete your records at any time. Thank you!`;
                      navigator.clipboard.writeText(msg);
                      alert("PDPA Legal Consent Notice text copied! Ready to paste into WhatsApp outreach.");
                    }}
                    className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[10px] rounded-lg border border-slate-200 text-center transition-colors"
                  >
                    Copy PDPA Notice
                  </button>

                  <button
                    id="download-lead-data-btn"
                    onClick={() => {
                      const data = {
                        pdpa_reference_id: `pdpa_${selectedLead.id}`,
                        lead_name: selectedLead.name,
                        contact_phone: selectedLead.phone,
                        contact_email: selectedLead.email || "N/A",
                        opt_in_status: selectedLead.permission_status,
                        purpose: "Amway Malaysia Product & Business Consulting",
                        created_at: selectedLead.created_at,
                        data_security_standard: "Supabase Auth with Postgres row-level security"
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `PDPA_Data_Access_Report_${selectedLead.name.replace(/\s+/g, "_")}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="col-span-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] rounded-lg border border-slate-300 text-center transition-colors"
                  >
                    Generate PDPA Portability Access File (JSON)
                  </button>
                </div>
              </div>
            </div>

            {/* Suggested script & WhatsApp engine */}
            <div className="bg-blue-50/50 p-4 rounded-[20px] border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dynamic Message Generator</span>
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Match Script Context</label>
                <select
                  id="select-suggested-script"
                  value={selectedScriptId}
                  onChange={(e) => handleSelectScript(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Choose suggested script --</option>
                  {scripts.map(s => (
                    <option key={s.id} value={s.id}>{s.category} - {s.title}</option>
                  ))}
                </select>
              </div>

              {/* ChatGPT AI Copilot Integration Section */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white p-4.5 rounded-2xl border border-indigo-500/20 space-y-3 shadow-md relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-blue-600/15 rounded-full blur-[40px] pointer-events-none"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-bold font-sans tracking-wide">ChatGPT Compliance Copilot</span>
                  </div>
                  <span className="text-[8px] font-mono bg-amber-500/10 border border-amber-500/35 text-amber-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Secured API
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed font-sans relative z-10">
                  Generate personalized, policy-vetted outreach messages matching your lead's interest in <span className="font-bold text-blue-300">{selectedLead.interest_type}</span> with zero compliance risks.
                </p>

                {aiError && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-[9px] leading-snug">
                    {aiError}
                  </div>
                )}

                <button
                  id="generate-ai-scripts-btn"
                  onClick={handleGenerateAiScripts}
                  disabled={isGeneratingAi}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-[11px] rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 active:scale-95 duration-150"
                >
                  {isGeneratingAi ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking Malaysian guidelines...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Draft Outreach with ChatGPT</span>
                    </>
                  )}
                </button>

                {aiOptions.length > 0 && (
                  <div className="space-y-2 pt-1 relative z-10">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Generated Safe Templates (Tap to Edit):</span>
                    <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                      {aiOptions.map((opt, i) => (
                        <div 
                          key={i} 
                          className="bg-black/30 border border-slate-850 p-3 rounded-xl text-left hover:border-blue-500/40 transition-colors group relative cursor-pointer"
                          onClick={() => {
                            setGeneratedMessage(opt.message);
                            setSelectedScriptId(""); // Deselect manual templates
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-blue-400 font-sans">{opt.type}</span>
                            <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md font-bold">Option {i + 1}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 italic mb-1.5 leading-snug">{opt.description}</p>
                          <p className="text-[10px] text-slate-200 line-clamp-3 bg-black/20 p-2 rounded border border-slate-900 leading-relaxed font-mono whitespace-pre-line">{opt.message}</p>
                          <div className="text-right mt-1.5">
                            <span className="text-[9px] text-blue-400 font-semibold group-hover:underline">Click to Apply Script & Edit →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {generatedMessage && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-600">Generated outreach message (Editable)</label>
                  <textarea
                    id="generated-script-text"
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  {/* Compliance check warnings banner */}
                  {(() => {
                    const infractions = checkMessageCompliance(generatedMessage);
                    if (infractions.length > 0) {
                      return (
                        <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-[10px] flex items-start space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Risky compliance phrases flagged:</span>
                            <span className="italic">"{infractions.join('", "')}"</span>
                            <span className="block mt-1 text-slate-500 font-normal">Instead, speak transparently about effort, dedication, product refund policies, and real wellness benefits.</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <button
                    id="trigger-whatsapp-outreach"
                    onClick={handleOpenWhatsApp}
                    className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 shadow-sm active:scale-95 transition-transform"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Launch WhatsApp wa.me Outreach</span>
                  </button>
                </div>
              )}
            </div>

            {/* PRODUCT RECOMMENDATIONS */}
            <div className="bg-emerald-50/40 p-4 rounded-[20px] border border-emerald-100 space-y-3">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Product Recommendations ({selectedLead.interest_type})</span>
              </span>
              {(() => {
                const recs = products.filter(p => {
                  const interest = selectedLead.interest_type;
                  if (interest === "Wellness") {
                    return p.category === "Wellness" || p.category === "Nutrition";
                  }
                  if (interest === "Beauty") {
                    return p.category === "Beauty" || p.category === "Skincare";
                  }
                  if (interest === "Home Care") {
                    return p.category === "Home Care";
                  }
                  return p.category === "Wellness" || p.category === "Nutrition"; // Default to wellness
                });

                if (recs.length === 0) {
                  return (
                    <p className="text-[10px] text-emerald-700 italic">
                      No matching products found in the catalogue. Head to the Products tab to import or create Amway products.
                    </p>
                  );
                }

                return (
                  <div className="space-y-2">
                    {recs.map(prod => (
                      <div key={prod.id} className="bg-white p-3 rounded-xl border border-emerald-100 text-xs space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800">{prod.product_name}</h4>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              {prod.product_code} • {prod.brand}
                            </span>
                          </div>
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.2 rounded uppercase">
                            {prod.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{prod.description}</p>
                        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 rounded-lg text-center font-mono text-[9px] text-slate-600 border border-slate-100">
                          <div>
                            <span className="block text-[7px] uppercase font-bold text-slate-400">Retail</span>
                            <span className="font-bold">RM{prod.retail_price}</span>
                          </div>
                          <div>
                            <span className="block text-[7px] uppercase font-bold text-slate-400">ABO</span>
                            <span className="font-bold">RM{prod.abo_price}</span>
                          </div>
                          <div>
                            <span className="block text-[7px] uppercase font-bold text-slate-400">PV</span>
                            <span className="font-bold">{prod.pv}</span>
                          </div>
                          <div>
                            <span className="block text-[7px] uppercase font-bold text-slate-400">BV</span>
                            <span className="font-bold">{prod.bv}</span>
                          </div>
                        </div>
                        <div className="flex space-x-1.5 pt-1">
                          <button
                            id={`recommend-whatsapp-${prod.id}`}
                            onClick={() => {
                              const pitch = `Hi ${selectedLead.name}, since you are focused on ${selectedLead.interest_type}, I highly recommend our ${prod.product_name} (${prod.product_code}) from ${prod.brand}. It is an excellent fit for your daily routine. Retail Price: RM ${prod.retail_price.toFixed(2)}. Let me know if you would like me to arrange a delivery for you!`;
                              const cleanPhone = selectedLead.phone.replace(/\D/g, "");
                              window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(pitch)}`, "_blank");
                              
                              // Log Interaction
                              localDb.addInteraction({
                                lead_id: selectedLead.id,
                                type: "WhatsApp outreach",
                                notes: `Sent recommended product pitch: ${prod.product_name}`,
                                date: new Date().toISOString()
                              });
                              
                              // Refresh
                              const refreshed = localDb.getLeads().find(l => l.id === selectedLead.id);
                              if (refreshed) setSelectedLead(refreshed);
                              loadLeads();
                            }}
                            className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center justify-center space-x-1 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp Recommendation</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Interaction Timeline logs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase">Interaction History</h3>
                <button
                  id="open-interaction-modal"
                  onClick={() => setShowAddInteractionModal(true)}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center space-x-0.5"
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Log Activity</span>
                </button>
              </div>

              {localDb.getInteractions(selectedLead.id).length === 0 ? (
                <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border text-center">
                  No interactions logged yet. Outreach sessions via WhatsApp automatically log here.
                </p>
              ) : (
                <div className="space-y-2">
                  {localDb.getInteractions(selectedLead.id).map(inter => (
                    <div key={inter.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center text-slate-400 text-[9px]">
                        <span className="font-semibold text-slate-500 uppercase">{inter.type}</span>
                        <span>{inter.date.split("T")[0]} {inter.date.split("T")[1]?.substring(0, 5)}</span>
                      </div>
                      <p className="text-slate-700 italic leading-relaxed">"{inter.notes}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Normal CRM List & Dashboard View */
        <div className="space-y-4">
          {/* Tabs Menu Navigation */}
          <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-1.5 w-full">
              {[
                { key: "list", label: "All Contacts", icon: List },
                { key: "pipeline", label: "Pipeline Visual", icon: Columns },
                { key: "queue", label: "Follow-up Queue", icon: Inbox },
                { key: "calendar", label: "Calendar", icon: Calendar }
              ].map(tab => {
                const IconComp = tab.icon;
                return (
                  <button
                    id={`crm-tab-${tab.key}`}
                    key={tab.key}
                    onClick={() => setViewMode(tab.key as any)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all ${
                      viewMode === tab.key
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CRM view modes */}
          {viewMode === "list" && (
            <div className="space-y-3">
              {/* Search and Filters Block */}
              <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="crm-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, phone, email..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Interest Category</label>
                    <select
                      id="crm-filter-interest"
                      value={interestFilter}
                      onChange={(e) => setInterestFilter(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs p-1.5 focus:outline-none"
                    >
                      <option value="All">All Interests</option>
                      {Object.values(InterestType).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase">Funnel Stage</label>
                    <select
                      id="crm-filter-stage"
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs p-1.5 focus:outline-none"
                    >
                      <option value="All">All Stages</option>
                      {Object.values(LeadStage).map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Add Lead and Count */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500">Filtered Results ({filteredLeads.length})</span>
                <button
                  id="open-add-lead-list"
                  onClick={() => setShowAddLeadModal(true)}
                  className="bg-blue-600 text-white font-bold text-xs py-1.5 px-3 rounded-xl hover:bg-blue-700 flex items-center space-x-1 active:scale-95 transition-transform"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>
              </div>

              {/* Leads Cards Grid (Responsive stack) */}
              {filteredLeads.length === 0 ? (
                <div className="p-8 bg-white border rounded-2xl text-center space-y-2">
                  <Search className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">No prospects matched</p>
                  <p className="text-[10px] text-slate-400">Try clearing search or filters to see all contacts.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white p-4 rounded-xl border border-slate-100 hover:border-slate-200 cursor-pointer shadow-sm flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-slate-800">{lead.name}</h4>
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            lead.lead_temperature === "Hot" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                            lead.lead_temperature === "Warm" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                            {lead.lead_temperature}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{lead.phone} • {lead.interest_type}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{lead.notes || "No notes logged."}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[9px] bg-slate-50 text-slate-600 border px-2 py-1 rounded font-semibold text-right">
                          {lead.stage}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === "pipeline" && (
            <div className="overflow-x-auto pb-4 -mx-4 px-4 flex space-x-3 snap-x scrollbar-thin">
              {/* Kanban Horizontal Pipeline columns */}
              {[
                { stage: LeadStage.New, color: "bg-blue-500" },
                { stage: LeadStage.Messaged, color: "bg-indigo-500" },
                { stage: LeadStage.Replied, color: "bg-purple-500" },
                { stage: LeadStage.Interested, color: "bg-pink-500" },
                { stage: LeadStage.WebinarRegistered, color: "bg-yellow-500" },
                { stage: LeadStage.Customer, color: "bg-emerald-500" },
                { stage: LeadStage.BusinessProspect, color: "bg-teal-500" }
              ].map(col => {
                const colLeads = leads.filter(l => l.stage === col.stage);
                return (
                  <div key={col.stage} className="w-64 shrink-0 bg-slate-50 rounded-2xl p-3 border border-slate-200 flex flex-col max-h-[480px]">
                    <div className="flex items-center justify-between mb-3 border-b pb-2">
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-2 h-2 rounded-full ${col.color}`} />
                        <span className="text-xs font-bold text-slate-800 leading-none">{col.stage}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        {colLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2 overflow-y-auto flex-1 pb-4">
                      {colLeads.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-6">Empty</p>
                      ) : (
                        colLeads.map(lead => (
                          <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-sm cursor-pointer space-y-1.5 transition-shadow"
                          >
                            <h5 className="text-xs font-bold text-slate-800 leading-tight">{lead.name}</h5>
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                              <span>{lead.interest_type}</span>
                              <span className="font-mono">{lead.phone.substring(0, 7)}...</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === "queue" && (
            <div className="space-y-3">
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wide">Daily Follow-Up Target</h3>
                <p className="text-[11px] text-purple-700 leading-relaxed mt-1">
                  Check back with prospects who registered, requested replays, or are timing-limited. Systematically completing follow-up tasks ensures no potential subscriber slips through the cracks.
                </p>
              </div>

              {queueLeads.length === 0 ? (
                <div className="p-8 bg-white border border-gray-200 text-center rounded-[24px] shadow-sm">
                  <Smile className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-800">You are All Caught Up!</p>
                  <p className="text-[10px] text-gray-400 mt-1">No due follow-up tasks waiting. Add new leads to start a conversations queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {queueLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer shadow-sm flex items-center justify-between transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-slate-800">{lead.name}</h4>
                          <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.2 rounded">DUE</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">Follow-up date: {lead.next_follow_up_at}</p>
                        <p className="text-[10px] text-slate-500 italic">"Stage: {lead.stage} • {lead.notes}"</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === "calendar" && (
            <div className="space-y-3">
              <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Next 14 Days Follow-Up Calendar</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Use this as your daily WhatsApp action map. Move anyone who opts out to Do Not Contact immediately.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {next14Days.map(date => {
                  const dayLeads = leads.filter(lead =>
                    lead.next_follow_up_at?.startsWith(date) &&
                    lead.stage !== LeadStage.DoNotContact
                  );
                  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-MY", {
                    weekday: "short",
                    day: "numeric",
                    month: "short"
                  });

                  return (
                    <div key={date} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm min-h-[150px]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{dayLabel}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{date}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          dayLeads.length > 0 ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-400"
                        }`}>
                          {dayLeads.length}
                        </span>
                      </div>

                      {dayLeads.length === 0 ? (
                        <p className="text-[10px] text-slate-400 bg-slate-50 rounded-lg p-3 text-center">
                          No scheduled follow-ups.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {dayLeads.map(lead => (
                            <button
                              id={`calendar-lead-${lead.id}`}
                              key={lead.id}
                              onClick={() => setSelectedLead(lead)}
                              className="w-full text-left p-2 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-lg transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 truncate">{lead.name}</span>
                                <span className="text-[8px] font-bold text-slate-500 bg-white border px-1.5 py-0.5 rounded">
                                  {lead.lead_temperature}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5 truncate">{lead.stage} • {lead.interest_type}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD LEAD */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold">Add New Prospect CRM</h3>
              <button 
                id="close-add-lead-modal"
                onClick={() => setShowAddLeadModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Full Name *</label>
                <input
                  id="add-lead-name"
                  type="text"
                  required
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="Mohd Fauzi"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Phone (with country code) *</label>
                  <input
                    id="add-lead-phone"
                    type="text"
                    required
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    placeholder="6011..."
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Email (Optional)</label>
                  <input
                    id="add-lead-email"
                    type="email"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Platform</label>
                  <select
                    id="add-lead-platform"
                    value={newLeadPlatform}
                    onChange={(e) => setNewLeadPlatform(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Outreach Source</label>
                  <input
                    id="add-lead-source"
                    type="text"
                    value={newLeadSource}
                    onChange={(e) => setNewLeadSource(e.target.value)}
                    placeholder="Instagram Reel comment"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Interest focus</label>
                  <select
                    id="add-lead-interest"
                    value={newLeadInterest}
                    onChange={(e) => setNewLeadInterest(e.target.value as any)}
                    className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
                  >
                    {Object.values(InterestType).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Temperature</label>
                  <select
                    id="add-lead-temperature"
                    value={newLeadTemp}
                    onChange={(e) => setNewLeadTemp(e.target.value as any)}
                    className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Initial Stage</label>
                  <select
                    id="add-lead-stage"
                    value={newLeadStage}
                    onChange={(e) => setNewLeadStage(e.target.value as any)}
                    className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
                  >
                    {Object.values(LeadStage).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Next Follow-Up</label>
                  <input
                    id="add-lead-followupdate"
                    type="date"
                    value={newLeadFollowUpDate}
                    onChange={(e) => setNewLeadFollowUpDate(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Outreach Pitch / Hook Angle</label>
                <input
                  id="add-lead-angle"
                  type="text"
                  value={newLeadAngle}
                  onChange={(e) => setNewLeadAngle(e.target.value)}
                  placeholder="Met through gym. Open to Nutrilite protein powder."
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Lead Notes / Context</label>
                <textarea
                  id="add-lead-notes"
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  rows={2}
                  placeholder="Met at expo. Needs advice on daily vitamins."
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t flex space-x-2 shrink-0">
                <button
                  id="add-lead-cancel"
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="flex-1 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  id="add-lead-submit"
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-xl shadow-sm"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INTERACTION */}
      {showAddInteractionModal && selectedLead && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Log Outreach Activity</h3>
              <button 
                id="close-interaction-modal"
                onClick={() => setShowAddInteractionModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInteraction} className="p-4 space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Touchpoint Mode</label>
                <select
                  id="log-interaction-type"
                  value={interactionType}
                  onChange={(e) => setInteractionType(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl text-xs p-2 focus:outline-none"
                >
                  <option value="WhatsApp outreach">WhatsApp outreach</option>
                  <option value="Phone call consultation">Phone call consultation</option>
                  <option value="Zoom presentation briefing">Zoom presentation briefing</option>
                  <option value="In-person coffee meeting">In-person coffee meeting</option>
                  <option value="Left voicemail / follow-up">Left voicemail / follow-up</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Outreach Summary Notes</label>
                <textarea
                  id="log-interaction-notes"
                  required
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  rows={3}
                  placeholder="Sent the Wellness seminar details. Lead is excited to join next week."
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t">
                <button
                  id="log-interaction-cancel"
                  type="button"
                  onClick={() => setShowAddInteractionModal(false)}
                  className="flex-1 py-2 border rounded-xl text-xs hover:bg-slate-50 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  id="log-interaction-submit"
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-xl shadow-sm"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
