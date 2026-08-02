import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { format, isBefore, isToday, parseISO } from "date-fns";
import { 
  X, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText, 
  Calendar, 
  Clock, 
  Flame, 
  ThermometerSun, 
  Snowflake, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert, 
  Award, 
  DollarSign, 
  Plus, 
  Pencil, 
  Trash2, 
  UserPlus, 
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { Lead, LeadQualificationAnswers } from "@/src/types";
import { CsvImportModal, TemplateField } from "@/src/components/CsvImportModal";
import { useSettingsStore } from "@/src/store/settingsStore";
import { v4 as uuidv4 } from "uuid";

export function Leads() {
  const { leads, tasks, products, addLead, updateLead, deleteLead, addOpportunity, addProposal } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const settings = useSettingsStore(state => state.settings);
  const currency = settings.business.currency;
  const money = new Intl.NumberFormat(settings.business.locale, { style: "currency", currency, maximumFractionDigits: 0 });
  
  const [search, setSearch] = useState("");
  const [filterView, setFilterView] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "qualification" | "closing">("overview");

  // CSV Import State
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  const leadTemplateFields: TemplateField[] = [
    { key: "contactName", label: "Contact Name", required: true, example: "John Doe", aliases: ["name", "full name", "contact", "person"] },
    { key: "email", label: "Email Address", required: true, example: "john@acme.com", aliases: ["email", "e-mail", "mail"] },
    { key: "phone", label: "Phone Number", example: "+1 555-0192", aliases: ["phone", "mobile", "tel", "contact number"] },
    { key: "companyName", label: "Company Name", example: "Acme Corp", aliases: ["company", "organization", "business"] },
    { key: "service", label: "Service / Requirement", example: "Website Rebuild", aliases: ["service", "requirement", "interest", "product"] },
    { key: "estimatedOtc", label: `One-time budget (${currency})`, example: "5000", aliases: ["budget", "otc", "one off", "cost"] },
    { key: "estimatedMrc", label: `Monthly care budget (${currency})`, example: "350", aliases: ["mrc", "monthly", "retainer"] },
    { key: "temperature", label: "Temperature (hot/warm/cold)", example: "warm", aliases: ["temperature", "heat", "priority", "rating"] },
    { key: "notes", label: "Notes / Context", example: "Interested in Q3 launch", aliases: ["notes", "description", "details", "comments"] }
  ];

  const sampleLeadCsvData = [
    ["Alice Walker", "alice@vertexsolutions.com", "+1 555-0144", "Vertex Solutions", "Full Web Redesign & SEO", "8500", "450", "hot", "Wants launch before end of Q3"],
    ["Marcus Chen", "mchen@nexuslogistics.io", "+1 555-0821", "Nexus Logistics", "E-Commerce Portal", "12000", "600", "warm", "Met at industry trade show"],
    ["Example Contact", "contact@example.org", "+60 12-345 6789", "Example Organisation", "Lead Generation Website", "4000", "250", "cold", "Requested initial scope estimate"]
  ];

  const handleBatchImportLeads = (rows: Record<string, any>[]) => {
    if (!workspace) return;
    let importedCount = 0;

    rows.forEach(row => {
      if (!row.contactName || !row.email) return;

      const otcVal = parseFloat(row.estimatedOtc) || 0;
      const mrcVal = parseFloat(row.estimatedMrc) || 0;
      const temp = (row.temperature || "warm").toLowerCase();
      const validTemp = ["hot", "warm", "cold"].includes(temp) ? (temp as "hot" | "warm" | "cold") : "warm";

      addLead({
        workspaceId: workspace.id,
        contactName: row.contactName.trim(),
        email: row.email.trim(),
        phone: row.phone?.trim() || "",
        companyName: row.companyName?.trim() || "",
        country: "",
        source: "CSV Batch Import",
        status: "new",
        temperature: validTemp,
        score: validTemp === "hot" ? settings.sales.hotThreshold : validTemp === "warm" ? settings.sales.warmThreshold : Math.max(0, settings.sales.warmThreshold - 10),
        estimatedOtc: otcVal,
        estimatedMrc: mrcVal,
        details: { 
          service: row.service?.trim() || "",
          message: row.notes?.trim() || ""
        }
      });

      importedCount++;
    });

    alert(`Imported ${importedCount} lead(s) into "${workspace.name}" for review.`);
  };

  // CRUD Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);

  // Lead Form State
  const defaultLeadForm = {
    contactName: "",
    email: "",
    phone: "",
    companyName: "",
    country: "",
    status: "new" as Lead["status"],
    temperature: "warm" as Lead["temperature"],
    score: 50,
    estimatedOtc: 0,
    estimatedMrc: 0,
    service: settings.leadCapture.serviceOptions[0] || "",
    notes: ""
  };
  const [formData, setFormData] = useState(defaultLeadForm);

  // Qualification Form State
  const [qualAnswers, setQualAnswers] = useState<LeadQualificationAnswers>({});

  const workspaceLeads = leads.filter(l => l.workspaceId === workspace?.id);
  const workspaceTasks = tasks.filter(t => t.workspaceId === workspace?.id);
  const now = new Date();

  const filteredLeads = workspaceLeads.filter(l => {
    const s = search.toLowerCase();
    const matchesSearch = !search || 
      l.contactName.toLowerCase().includes(s) || 
      l.email.toLowerCase().includes(s) || 
      l.companyName?.toLowerCase().includes(s);
      
    if (!matchesSearch) return false;

    if (filterView === "hot") return l.temperature === "hot";
    if (filterView === "uncontacted") return l.status === "new";
    if (filterView === "high_budget") return l.details?.budget === "10k+" || (l.estimatedOtc || 0) >= 10000;
    if (filterView === "overdue") {
      const lTasks = workspaceTasks.filter(t => t.leadId === l.id && t.status === "pending");
      return lTasks.some(t => isBefore(new Date(t.dueDate), now) && !isToday(new Date(t.dueDate)));
    }
    
    return true;
  });

  const getTemperatureIcon = (temp?: string) => {
    if (temp === "hot") return <Flame className="w-3.5 h-3.5 text-red-500 mr-1" />;
    if (temp === "warm") return <ThermometerSun className="w-3.5 h-3.5 text-orange-500 mr-1" />;
    return <Snowflake className="w-3.5 h-3.5 text-blue-400 mr-1" />;
  };

  const getSlaStatus = (lead: Lead) => {
    if (lead.status !== "new") return { text: "Contacted", color: "text-slate-500 bg-slate-50 border-slate-200" };
    const hoursSince = (now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > settings.business.leadSlaHours) return { text: `SLA breached (>${settings.business.leadSlaHours}h)`, color: "text-red-700 bg-red-50 border-red-200 font-bold" };
    if (hoursSince > settings.business.leadSlaHours / 2) return { text: "Action required", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { text: `In SLA (<${settings.business.leadSlaHours}h)`, color: "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold" };
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      alert("No valid phone number.");
      return;
    }
    const msg = encodeURIComponent(`Hi ${name}, Bennie here from Bennie Studio. Thanks for reaching out!`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactName || !formData.email) {
      alert("Please provide at least a contact name and email address.");
      return;
    }

    addLead({
      workspaceId: workspace?.id || "ws-bennie",
      contactName: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      companyName: formData.companyName,
      country: formData.country,
      status: formData.status,
      temperature: formData.temperature,
      score: formData.score,
      estimatedOtc: formData.estimatedOtc,
      estimatedMrc: formData.estimatedMrc,
      source: "Manual CRM Entry",
      details: {
        service: formData.service,
        budget: formData.estimatedOtc > 0 ? money.format(formData.estimatedOtc) : "Not provided",
        message: formData.notes
      }
    });

    setIsCreateOpen(false);
    setFormData(defaultLeadForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadToEdit) return;

    updateLead(leadToEdit.id, {
      contactName: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      companyName: formData.companyName,
      country: formData.country,
      status: formData.status,
      temperature: formData.temperature,
      score: formData.score,
      estimatedOtc: formData.estimatedOtc,
      estimatedMrc: formData.estimatedMrc,
      details: {
        ...leadToEdit.details,
        service: formData.service,
        message: formData.notes
      }
    });

    if (selectedLead?.id === leadToEdit.id) {
      setSelectedLead({
        ...selectedLead,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName,
        country: formData.country,
        status: formData.status,
        temperature: formData.temperature,
        score: formData.score,
        estimatedOtc: formData.estimatedOtc,
        estimatedMrc: formData.estimatedMrc
      });
    }

    setIsEditOpen(false);
    setLeadToEdit(null);
  };

  const handleConfirmDelete = () => {
    if (!leadToDelete) return;
    deleteLead(leadToDelete.id);
    if (selectedLead?.id === leadToDelete.id) {
      setSelectedLead(null);
    }
    setLeadToDelete(null);
  };

  const openEditModal = (lead: Lead) => {
    setLeadToEdit(lead);
    setFormData({
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone || "",
      companyName: lead.companyName || "",
      country: lead.country || "",
      status: lead.status,
      temperature: lead.temperature || "cold",
      score: lead.score || 0,
      estimatedOtc: lead.estimatedOtc || 0,
      estimatedMrc: lead.estimatedMrc || 0,
      service: lead.details?.service || settings.leadCapture.serviceOptions[0] || "",
      notes: lead.details?.message || ""
    });
    setIsEditOpen(true);
  };

  const calculateAutoScore = (answers: LeadQualificationAnswers): number => {
    let score = 20; // Base score
    if (answers.isDecisionMaker) score += 20;
    const budgetIndex = settings.leadCapture.budgetRanges.indexOf(answers.budgetRange || "");
    if (budgetIndex === settings.leadCapture.budgetRanges.length - 1) score += 25;
    else if (budgetIndex >= Math.max(1, settings.leadCapture.budgetRanges.length - 2)) score += 15;
    if (answers.timeline === "asap" || answers.timeline === "1-3months") score += 15;
    if (answers.ongoingManagementRequired) score += 10;
    if (answers.currentProblem && answers.currentProblem.length > 10) score += 10;
    return Math.min(100, score);
  };

  const handleSaveQualification = () => {
    if (!selectedLead) return;
    const newScore = calculateAutoScore(qualAnswers);
    const classification = newScore >= settings.sales.hotThreshold ? "hot" : newScore >= settings.sales.warmThreshold ? "warm" : newScore >= 30 ? "cold" : "nurture";
    
    const auditEntry = {
      date: new Date().toISOString(),
      user: "Bennie",
      prevScore: selectedLead.score || 0,
      newScore,
      reason: `Qualification form completed. Answers calculated score ${newScore}.`
    };

    updateLead(selectedLead.id, {
      score: newScore,
      temperature: classification === "hot" ? "hot" : classification === "warm" ? "warm" : "cold",
      qualificationClassification: classification,
      qualificationAnswers: qualAnswers,
      qualificationAudit: [...(selectedLead.qualificationAudit || []), auditEntry]
    });

    setSelectedLead({
      ...selectedLead,
      score: newScore,
      temperature: classification === "hot" ? "hot" : classification === "warm" ? "warm" : "cold",
      qualificationClassification: classification,
      qualificationAnswers: qualAnswers
    });

    alert(`Qualification saved! Calculated score: ${newScore}/100 (${classification.toUpperCase()})`);
  };

  const handleCreateProposalFromLead = async (option: "A" | "B") => {
    if (!selectedLead || !workspace) return;
    const product = products.find(item => item.workspaceId === workspace.id && item.type === (option === "A" ? "otc" : "mrc"));
    if (!product) {
      alert(`Add a ${option === "A" ? "one-time" : "monthly recurring"} product in Products & Pricing before creating this proposal.`);
      return;
    }
    const otcVal = option === "A" ? (selectedLead.closingOffer?.optionA?.otc || selectedLead.estimatedOtc || product.price) : 0;
    const mrcVal = option === "B" ? (selectedLead.closingOffer?.optionB?.mrc || selectedLead.estimatedMrc || product.price) : 0;

    const opportunityId = await addOpportunity({
      workspaceId: workspace.id,
      leadId: selectedLead.id,
      name: selectedLead.companyName || selectedLead.contactName,
      stage: "Solution proposed",
      estimatedValue: option === "A" ? otcVal : mrcVal * 12,
      currency,
      probability: 50,
      source: selectedLead.source || "lead",
    });

    await addProposal({
      workspaceId: workspace.id,
      opportunityId,
      items: [{ productId: product.id, quantity: 1, type: product.type, price: option === "A" ? otcVal : mrcVal }],
      status: "draft",
      totalOTC: option === "A" ? otcVal : 0,
      totalMRC: option === "B" ? mrcVal : 0,
      taxRate: 0,
      currency,
      token: uuidv4(),
    });

    await updateLead(selectedLead.id, { status: "proposal" });
    alert(`Draft ${option === "A" ? "one-off" : "monthly care"} proposal created. Review it before sharing.`);
  };

  return (
    <div className="space-y-6 relative flex-1 flex flex-col overflow-hidden h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 pb-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Leads & Response Engine</h2>
          <p className="text-sm text-slate-500">Capture, qualification scoring, engagement tracking & closing workflows.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            onClick={() => {
              setFormData(defaultLeadForm);
              setIsCreateOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" /> Add New Lead
          </Button>

          <Button 
            variant="outline"
            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-800 font-semibold flex items-center gap-1.5 shadow-2xs"
            onClick={() => setIsCsvImportOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Import CSV
          </Button>

          <Button variant="outline" onClick={() => {
            const url = `${window.location.origin}/capture`;
            navigator.clipboard.writeText(url);
            alert(`Public Lead Form URL copied to clipboard: ${url}`);
          }}>Public Form Link</Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-8 pb-8">
        <Card className="flex-1 flex flex-col overflow-hidden border-slate-200">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <Button variant={filterView === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterView("all")}>All ({workspaceLeads.length})</Button>
                <Button variant={filterView === "uncontacted" ? "default" : "outline"} size="sm" onClick={() => setFilterView("uncontacted")}>Uncontacted</Button>
                <Button variant={filterView === "hot" ? "default" : "outline"} size="sm" onClick={() => setFilterView("hot")}>🔥 Hot</Button>
                <Button variant={filterView === "overdue" ? "default" : "outline"} size="sm" onClick={() => setFilterView("overdue")}>Overdue</Button>
                <Button variant={filterView === "high_budget" ? "default" : "outline"} size="sm" onClick={() => setFilterView("high_budget")}>High Budget</Button>
              </div>
              <input 
                placeholder="Search contact, company, email..."
                className="h-8 w-64 rounded-md border border-slate-200 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Qualification Score</th>
                  <th className="px-6 py-3">SLA Status</th>
                  <th className="px-6 py-3">Potential Value</th>
                  <th className="px-6 py-3">Recommended Next Action</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => {
                  const sla = getSlaStatus(lead);
                  const lTasks = workspaceTasks.filter(t => t.leadId === lead.id && t.status === "pending");
                  const nextTask = lTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
                  
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                      setSelectedLead(lead);
                      setQualAnswers(lead.qualificationAnswers || {});
                    }}>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-slate-900">{lead.contactName}</div>
                        <div className="text-xs text-slate-500">{lead.companyName || lead.email}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center mb-1">
                          {getTemperatureIcon(lead.temperature)}
                          <span className="text-xs font-bold capitalize">{lead.temperature || "cold"} ({lead.score || 0}/100)</span>
                        </div>
                        <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0 h-4">
                          {lead.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className={`text-[10px] ${sla.color}`}>
                          {sla.text}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-bold text-slate-800">
                          ${(lead.estimatedOtc || 8000).toLocaleString()} OTC
                        </span>
                        <span className="text-[10px] text-slate-400 block">+ ${(lead.estimatedMrc || 350).toLocaleString()}/mo MRC</span>
                      </td>
                      <td className="px-6 py-3">
                        {nextTask ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-700">{nextTask.title}</span>
                            <span className="text-slate-400 block">Due {format(parseISO(nextTask.dueDate), "MMM d")}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">Run Qualification Check</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" title="Edit Lead" onClick={() => openEditModal(lead)}>
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Delete Lead" onClick={() => setLeadToDelete(lead)}>
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedLead(lead);
                            setQualAnswers(lead.qualificationAnswers || {});
                          }}>
                            Cockpit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* CREATE LEAD MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Create New Lead
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}><X className="w-4 h-4" /></Button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Contact Name *</label>
                  <input 
                    required
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="e.g. Customer name"
                    value={formData.contactName}
                    onChange={e => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <input 
                    required
                    type="email"
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="sarah@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Phone Number</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="+61 400 123 456"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Company Name</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded-md"
                    placeholder="e.g. Acme Services"
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Status</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="new">New</option>
                    <option value="researching">Researching</option>
                    <option value="qualified">Qualified</option>
                    <option value="contacted">Contacted</option>
                    <option value="discovery">Discovery</option>
                    <option value="proposal">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="nurture">Nurture</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Temperature</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md bg-white"
                    value={formData.temperature}
                    onChange={e => setFormData({...formData, temperature: e.target.value as any})}
                  >
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Country</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md bg-white"
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                  >
                    <option value="US">US</option>
                    <option value="UK">UK</option>
                    <option value="SG">Singapore</option>
                    <option value="MY">Malaysia</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Est. One-Off Value (OTC $)</label>
                  <input 
                    type="number"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.estimatedOtc}
                    onChange={e => setFormData({...formData, estimatedOtc: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Est. Monthly Value (MRC $)</label>
                  <input 
                    type="number"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.estimatedMrc}
                    onChange={e => setFormData({...formData, estimatedMrc: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Service Required</label>
                <input 
                  className="w-full mt-1 p-2 border rounded-md"
                  placeholder="e.g. Website Design, Monthly Care Plan"
                  value={formData.service}
                  onChange={e => setFormData({...formData, service: e.target.value})}
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Notes / Requirements</label>
                <textarea 
                  rows={2}
                  className="w-full mt-1 p-2 border rounded-md resize-none"
                  placeholder="Additional context or background..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Save & Create Lead</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LEAD MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xl w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-600" /> Edit Lead Details
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}><X className="w-4 h-4" /></Button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Contact Name *</label>
                  <input 
                    required
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.contactName}
                    onChange={e => setFormData({...formData, contactName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Email Address *</label>
                  <input 
                    required
                    type="email"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Phone Number</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Company Name</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.companyName}
                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Status</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md bg-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                  >
                    <option value="new">New</option>
                    <option value="qualifying">Qualifying</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Temperature</label>
                  <select 
                    className="w-full mt-1 p-2 border rounded-md bg-white"
                    value={formData.temperature}
                    onChange={e => setFormData({...formData, temperature: e.target.value as any})}
                  >
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Score (0-100)</label>
                  <input 
                    type="number"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.score}
                    onChange={e => setFormData({...formData, score: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Est. OTC ($)</label>
                  <input 
                    type="number"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.estimatedOtc}
                    onChange={e => setFormData({...formData, estimatedOtc: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Est. MRC ($)</label>
                  <input 
                    type="number"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={formData.estimatedMrc}
                    onChange={e => setFormData({...formData, estimatedMrc: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Service Required</label>
                <input 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={formData.service}
                  onChange={e => setFormData({...formData, service: e.target.value})}
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Notes / Requirements</label>
                <textarea 
                  rows={2}
                  className="w-full mt-1 p-2 border rounded-md resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Update Lead</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-100 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Lead Record</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-bold text-slate-800">{leadToDelete.contactName}</span> ({leadToDelete.email})?
                This action will remove the lead permanently from your workspace.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" onClick={() => setLeadToDelete(null)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleConfirmDelete}>Confirm Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* LEAD COCKPIT DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setSelectedLead(null)}>
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900">{selectedLead.contactName}</span>
                <Badge variant="outline" className="capitalize text-xs bg-white">
                  {getTemperatureIcon(selectedLead.temperature)} {selectedLead.temperature} ({selectedLead.score || 0}/100)
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" title="Edit Lead" onClick={() => openEditModal(selectedLead)}>
                  <Pencil className="w-4 h-4 text-slate-600" />
                </Button>
                <Button variant="ghost" size="sm" title="Delete Lead" onClick={() => setLeadToDelete(selectedLead)}>
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/40 text-xs font-semibold">
              <button 
                className={`py-3 px-4 border-b-2 transition-all ${activeDrawerTab === 'overview' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveDrawerTab('overview')}
              >
                Engagement Overview
              </button>
              <button 
                className={`py-3 px-4 border-b-2 transition-all ${activeDrawerTab === 'qualification' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveDrawerTab('qualification')}
              >
                Structured Qualification (10 Qs)
              </button>
              <button 
                className={`py-3 px-4 border-b-2 transition-all ${activeDrawerTab === 'closing' ? 'border-blue-600 text-blue-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveDrawerTab('closing')}
              >
                Sales Closing Panel (2 Offers)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* OVERVIEW TAB */}
              {activeDrawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button className="bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={() => openWhatsApp(selectedLead.phone || "", selectedLead.contactName)}>
                      <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Response
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = `mailto:${selectedLead.email}`}>
                      <Mail className="w-4 h-4 mr-2" /> Email Outreach
                    </Button>
                    <Button variant="outline" onClick={() => setActiveDrawerTab('closing')}>
                      <FileText className="w-4 h-4 mr-2" /> Close Deal / Proposal
                    </Button>
                  </div>

                  {/* Buying Intent & Revenue Indicators */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Commercial Snapshot
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-slate-500">Estimated One-off (OTC):</span>
                        <p className="font-extrabold text-slate-900 text-base">${(selectedLead.estimatedOtc || 8000).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Estimated Subscription (MRC):</span>
                        <p className="font-extrabold text-indigo-700 text-base">${(selectedLead.estimatedMrc || 350).toLocaleString()}/mo</p>
                      </div>
                    </div>
                  </div>

                  {/* Submitted Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Inbound Submission Data</h4>
                    <div className="p-4 rounded-xl border border-slate-100 bg-white space-y-2 text-xs">
                      <p><span className="font-semibold text-slate-700">Company:</span> {selectedLead.companyName || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-700">Service Required:</span> {selectedLead.details?.service || 'Website'}</p>
                      <p><span className="font-semibold text-slate-700">Budget Range:</span> {selectedLead.details?.budget || 'Not specified'}</p>
                      <p><span className="font-semibold text-slate-700">Message:</span> "{selectedLead.details?.message || 'No initial message'}"</p>
                    </div>
                  </div>
                </div>
              )}

              {/* QUALIFICATION FORM TAB */}
              {activeDrawerTab === 'qualification' && (
                <div className="space-y-6">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
                    <p className="font-semibold flex items-center gap-1.5"><Award className="w-4 h-4 text-blue-600" /> Qualification Engine</p>
                    <p className="mt-0.5">Answer the 10 core qualification criteria to calculate the lead score and classification (Hot/Warm/Cold/Nurture).</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-800">1. Target Business Result / ROI Goal</label>
                      <input 
                        className="w-full mt-1 p-2 border rounded-md"
                        value={qualAnswers.businessResult || ""}
                        onChange={e => setQualAnswers({...qualAnswers, businessResult: e.target.value})}
                        placeholder="e.g. Double B2B conversion rate"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-800">2. Current Problem / Bottleneck</label>
                      <input 
                        className="w-full mt-1 p-2 border rounded-md"
                        value={qualAnswers.currentProblem || ""}
                        onChange={e => setQualAnswers({...qualAnswers, currentProblem: e.target.value})}
                        placeholder="e.g. Old non-responsive site, slow load times"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-800">3. Budget Range</label>
                        <select 
                          className="w-full mt-1 p-2 border rounded-md bg-white"
                          value={qualAnswers.budgetRange || ""}
                          onChange={e => setQualAnswers({...qualAnswers, budgetRange: e.target.value})}
                        >
                          <option value="">Select budget...</option>
                          {settings.leadCapture.budgetRanges.map(range => <option key={range} value={range}>{range}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-800">4. Decision Maker Authority</label>
                        <select 
                          className="w-full mt-1 p-2 border rounded-md bg-white"
                          value={qualAnswers.isDecisionMaker ? "yes" : "no"}
                          onChange={e => setQualAnswers({...qualAnswers, isDecisionMaker: e.target.value === "yes"})}
                        >
                          <option value="yes">Yes - Final Decision Maker</option>
                          <option value="no">No - Influencer / Manager</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-800">5. Timeline</label>
                        <select 
                          className="w-full mt-1 p-2 border rounded-md bg-white"
                          value={qualAnswers.timeline || ""}
                          onChange={e => setQualAnswers({...qualAnswers, timeline: e.target.value})}
                        >
                          <option value="">Select timeline...</option>
                          <option value="asap">Immediate / ASAP</option>
                          <option value="1-3months">1-3 Months</option>
                          <option value="flexible">Flexible / Exploring</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-800">6. Ongoing Website Care Required?</label>
                        <select 
                          className="w-full mt-1 p-2 border rounded-md bg-white"
                          value={qualAnswers.ongoingManagementRequired ? "yes" : "no"}
                          onChange={e => setQualAnswers({...qualAnswers, ongoingManagementRequired: e.target.value === "yes"})}
                        >
                          <option value="yes">Yes - Wants Managed Care</option>
                          <option value="no">No - One-off build only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-800">7. Cost / Impact of Delay ({currency} lost / month)</label>
                      <input 
                        className="w-full mt-1 p-2 border rounded-md"
                        value={qualAnswers.delayImpact || ""}
                        onChange={e => setQualAnswers({...qualAnswers, delayImpact: e.target.value})}
                        placeholder={`e.g. Losing ${money.format(10000)}/month to competitors`}
                      />
                    </div>

                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4" onClick={handleSaveQualification}>
                      Calculate Score & Save Qualification
                    </Button>
                  </div>
                </div>
              )}

              {/* SALES CLOSING TAB */}
              {activeDrawerTab === 'closing' && (
                <div className="space-y-6">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-900">
                    <p className="font-semibold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-purple-600" /> Solopreneur Sales-Closing Panel</p>
                    <p className="mt-0.5">Present two clear offers: a one-off project (Option A) and a managed monthly care plan (Option B).</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Option A */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Option A: Custom Build</Badge>
                      <p className="text-xl font-extrabold text-slate-900">{selectedLead.closingOffer?.optionA?.otc || selectedLead.estimatedOtc ? money.format(selectedLead.closingOffer?.optionA?.otc || selectedLead.estimatedOtc || 0) : "Price from catalogue"} <span className="text-xs font-normal text-slate-500">one-time</span></p>
                      <p className="text-xs text-slate-600">Uses the first one-time product in Products & Pricing unless a lead-specific offer is recorded.</p>
                      <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs" onClick={() => handleCreateProposalFromLead("A")}>
                        Create Option A Draft
                      </Button>
                    </div>

                    {/* Option B */}
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                      <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Option B: Monthly Care</Badge>
                      <p className="text-xl font-extrabold text-indigo-900">{selectedLead.closingOffer?.optionB?.mrc || selectedLead.estimatedMrc ? money.format(selectedLead.closingOffer?.optionB?.mrc || selectedLead.estimatedMrc || 0) : "Price from catalogue"} <span className="text-xs font-normal text-slate-500">/month</span></p>
                      <p className="text-xs text-slate-600">Uses the first recurring product in Products & Pricing unless a lead-specific offer is recorded.</p>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs" onClick={() => handleCreateProposalFromLead("B")}>
                        Create Option B Draft
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        title="Import Leads from CSV Spreadsheet"
        entityName="Leads"
        templateFields={leadTemplateFields}
        sampleCsvFilename="bennie_leads_import_template.csv"
        sampleData={sampleLeadCsvData}
        onImport={handleBatchImportLeads}
      />
    </div>
  );
}
