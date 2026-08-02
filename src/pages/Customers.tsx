import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { Repeat, Send, Sparkles, FileSpreadsheet } from "lucide-react";
import { Customer } from "@/src/types";
import { CsvImportModal, TemplateField } from "@/src/components/CsvImportModal";
import { useSettingsStore } from "@/src/store/settingsStore";

export function Customers() {
  const { customers, products, addCustomer } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const user = useAuthStore(state => state.user);
  const workspaceRoles = useAuthStore(state => state.workspaceRoles);
  const workspaceCustomers = customers.filter(c => c.workspaceId === workspace?.id);
  const activeRole = workspace ? workspaceRoles[workspace.id] || user?.role : user?.role;
  const canManage = !!activeRole && ["super_admin", "workspace_admin", "sales", "operations"].includes(activeRole);
  const currency = useSettingsStore(state => state.settings.business.currency);
  
  const [showAdd, setShowAdd] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [updateTemplateText, setUpdateTemplateText] = useState("");

  const customerTemplateFields: TemplateField[] = [
    { key: "name", label: "Customer / Business Name", required: true, example: "Acme Dental", aliases: ["name", "customer", "business", "company"] },
    { key: "email", label: "Contact Email", required: true, example: "contact@acmedental.com", aliases: ["email", "e-mail", "mail"] },
    { key: "status", label: "Status (active/inactive/onboarding)", example: "active", aliases: ["status", "account status"] },
  ];

  const sampleCustomerCsvData = [
    ["Apex Fitness Gym", "info@apexfitness.com", "active"],
    ["Summit Law Practice", "admin@summitlaw.com", "onboarding"],
    ["Bistro 88 Restaurant", "hello@bistro88.com", "inactive"]
  ];

  const handleBatchImportCustomers = (rows: Record<string, any>[]) => {
    if (!workspace) return;
    let count = 0;

    rows.forEach(row => {
      if (!row.name || !row.email) return;

      addCustomer({
        workspaceId: workspace.id,
        name: row.name.trim(),
        email: row.email.trim(),
        status: ["active", "inactive", "onboarding"].includes((row.status || "").toLowerCase())
          ? row.status.toLowerCase()
          : "active",
      });
      count++;
    });

    alert(`Imported ${count} customer record(s) into "${workspace.name}".`);
  };

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    status: "active" as const
  });

  const handleAdd = () => {
    if (!workspace) return;
    if (!newCustomer.name || !newCustomer.email) {
      alert("Name and email are required");
      return;
    }
    addCustomer({ ...newCustomer, workspaceId: workspace.id });
    setShowAdd(false);
    setNewCustomer({ name: "", email: "", status: "active" });
  };

  const getHealthBadge = (health?: any) => {
    if (!health?.status) return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Not assessed</Badge>;
    const status = health.status;
    if (status === "healthy") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Healthy (90+)</Badge>;
    if (status === "attention_needed") return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Attention Needed</Badge>;
    if (status === "at_risk") return <Badge className="bg-orange-100 text-orange-800 border-orange-200">At Risk</Badge>;
    return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
  };

  const handleCopyProactiveUpdate = async (c: Customer) => {
    const msg = updateTemplateText || (c.project
      ? `Hi ${c.name}, Bennie here from Bennie Studio. Your website project is currently at ${c.project.completionPercentage}% completion. Next milestone: ${c.project.nextMilestone}.`
      : `Hi ${c.name}, Bennie here from Bennie Studio. I’m checking in to see how your website is performing and whether you need any help this week.`);
    await navigator.clipboard.writeText(msg);
    alert("Message copied. Send it through your verified email or WhatsApp account.");
    setUpdateTemplateText("");
  };

  const handleCopyCarePlanOffer = async (c: Customer) => {
    const carePlan = products.find(product => product.workspaceId === workspace?.id && product.type === "mrc");
    const price = carePlan ? new Intl.NumberFormat(undefined, { style: "currency", currency: carePlan.currency }).format(carePlan.price) : "our current monthly rate";
    const planName = carePlan?.name || "website care plan";
    const message = `Hi ${c.name}, based on your current website needs, I recommend our ${planName} at ${price} per month. Would you like me to prepare a full proposal for your review?`;
    await navigator.clipboard.writeText(message);
    alert("Care-plan offer copied. Review it, then send it through your verified channel.");
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Customers & Retention</h2>
          <p className="text-sm text-slate-500">Customer records, reviewed account status and retention follow-ups.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? <Button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white">Add Customer</Button> : null}
          {canManage ? <Button
            variant="outline"
            onClick={() => setIsCsvImportOpen(true)}
            className="bg-white hover:bg-slate-50 border-slate-200 text-slate-800 font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Import CSV
          </Button> : null}
        </div>
      </div>

      {/* CUSTOMER DIRECTORY */}
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Customer Accounts & Health Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Account Health</th>
                  <th className="px-6 py-3">Care Plan Status</th>
                  <th className="px-6 py-3">Active Project Stage</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspaceCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getHealthBadge(c.health)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize text-xs">
                        {c.waas?.status.replace(/_/g, ' ') || 'Not Assessed'}
                      </Badge>
                      {c.waas?.proposedMrc && <span className="text-xs font-bold text-indigo-700 block mt-0.5">{currency} {c.waas.proposedMrc}/mo</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-800 capitalize">
                        {c.project?.stage.replace(/_/g, ' ') || 'Not tracked'}
                      </div>
                      {c.project ? <div className="w-24 h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${c.project.completionPercentage}%` }}></div></div> : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedCustomer(c); }}>
                        Customer Cockpit
                      </Button>
                    </td>
                  </tr>
                ))}
                {workspaceCustomers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">No customers yet. Add a customer after a lead is won or import a reviewed customer list.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CUSTOMER COCKPIT MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-2xl bg-white animate-in zoom-in-95">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">{selectedCustomer.name}</CardTitle>
                <p className="text-xs text-slate-500">{selectedCustomer.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>✕</Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Proactive Update Sender */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" /> Prepare Weekly Update
                </h4>
                <textarea 
                  className="w-full rounded-md border border-slate-200 p-2.5 text-xs focus:ring-1 focus:ring-blue-500 min-h-[70px] bg-white"
                  placeholder="Draft proactive update message..."
                  value={updateTemplateText}
                  onChange={e => setUpdateTemplateText(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Requires human review before sending.</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs" onClick={() => handleCopyProactiveUpdate(selectedCustomer)}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Copy approved message
                  </Button>
                </div>
              </div>

              {/* Care plan proposal prompt */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-indigo-900">Care Plan Opportunity</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">Prepare a reviewed recurring-service recommendation using your current product pricing.</p>
                </div>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0" onClick={() => handleCopyCarePlanOffer(selectedCustomer)}>
                  <Repeat className="w-3.5 h-3.5 mr-1" /> Copy offer message
                </Button>
              </div>

              {/* Revision Requests */}
              {selectedCustomer.revisions && selectedCustomer.revisions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer Revision Requests</h4>
                  {selectedCustomer.revisions.map(r => (
                    <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800">{r.page} - {r.section}: </span>
                        <span className="text-slate-600">"{r.requestedChange}"</span>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {showAdd && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b border-slate-100"><CardTitle className="text-base font-bold">Add customer</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-6">
              <div><label htmlFor="customer-name" className="mb-1 block text-xs font-bold text-slate-700">Customer or business name</label><input id="customer-name" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" value={newCustomer.name} onChange={event => setNewCustomer(current => ({ ...current, name: event.target.value }))} /></div>
              <div><label htmlFor="customer-email" className="mb-1 block text-xs font-bold text-slate-700">Email</label><input id="customer-email" type="email" className="w-full rounded-lg border border-slate-300 p-2.5 text-sm" value={newCustomer.email} onChange={event => setNewCustomer(current => ({ ...current, email: event.target.value }))} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={handleAdd}>Save customer</Button></div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* CSV IMPORT MODAL */}
      <CsvImportModal
        isOpen={isCsvImportOpen && canManage}
        onClose={() => setIsCsvImportOpen(false)}
        title="Import Customer Directory from CSV"
        entityName="Customers"
        templateFields={customerTemplateFields}
        sampleCsvFilename="bennie_customers_import_template.csv"
        sampleData={sampleCustomerCsvData}
        onImport={handleBatchImportCustomers}
      />
    </div>
  );
}
