import { FormEvent, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { DiamondProspectStatus, DiamondProspectType } from "../types";
import { supabase } from "../supabase";

const statuses: DiamondProspectStatus[] = ["Lead", "Contacted", "Shown Plan", "Follow Up", "Joined ABO", "Joined PC", "Closed", "Not Interested", "Archived"];
const types: DiamondProspectType[] = ["Business Builder / ABO", "Product Customer / PC", "Professional / Career", "Student / Young Adult", "Family / Warm Network", "Other"];

export function DiamondPath() {
  const workspace = useAuthStore(state => state.workspace);
  const { diamondProspects, diamondCustomers, diamondFollowUps, diamondProducts, diamondPurchases, diamondScripts, addDiamondProspect, updateDiamondProspect, addDiamondFollowUp, updateDiamondFollowUp } = useDataStore();
  const [tab, setTab] = useState<"prospects" | "customers" | "followups" | "products" | "orders" | "scripts">("prospects");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<DiamondProspectType>(types[0]);
  const [status, setStatus] = useState<DiamondProspectStatus>("Lead");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false); const [importMessage, setImportMessage] = useState("");
  const activeWorkspaceId = workspace?.id || "";
  const dueFollowUps = useMemo(() => diamondFollowUps.filter(task => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [diamondFollowUps]);
  const reorderReadyCustomers = useMemo(() => {
    const cutoff = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return diamondCustomers.filter(customer => customer.isActive && customer.nextReorderDate && customer.nextReorderDate <= cutoff).sort((a, b) => (a.nextReorderDate || "").localeCompare(b.nextReorderDate || ""));
  }, [diamondCustomers]);

  async function createProspect(event: FormEvent) {
    event.preventDefault();
    if (!activeWorkspaceId || !name.trim()) return;
    setSaving(true);
    try {
      await addDiamondProspect({ workspaceId: activeWorkspaceId, name: name.trim(), phone: phone.trim() || undefined, status, prospectType: type, preferredContactMethod: phone.trim() ? "WhatsApp" : "Phone Call" });
      setName(""); setPhone(""); setShowForm(false);
    } finally { setSaving(false); }
  }

  async function scheduleFollowUp(prospect: typeof diamondProspects[number]) {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await addDiamondFollowUp({ workspaceId: activeWorkspaceId, prospectId: prospect.id, contactName: prospect.name, channel: "WhatsApp", stage: "Prospecting", dueDate, completed: false, notes: "Next-step follow-up" });
    await updateDiamondProspect(prospect.id, { status: "Follow Up", nextFollowUpDate: dueDate });
  }

  async function importBackup(file?: File) {
    if (!file || !activeWorkspaceId) return;
    if (file.size > 2_000_000) { setImportMessage("Backup exceeds the 2 MB safe import limit."); return; }
    setImporting(true); setImportMessage("");
    try {
      const payload = JSON.parse(await file.text()); const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error("Sign in again before importing");
      const response = await fetch("/api/integrations/amway/import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ workspaceId: activeWorkspaceId, ...payload }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Import failed");
      setImportMessage(`Imported ${Object.values(result.counts as Record<string, number>).reduce((sum, count) => sum + count, 0)} Diamond Path records. Live workspace data will refresh automatically.`);
    } catch (error: any) { setImportMessage(error instanceof SyntaxError ? "Choose a valid Diamond Path JSON backup." : error.message); }
    finally { setImporting(false); }
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Amway growth module</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Diamond Path CRM</h1><p className="mt-1 text-sm text-slate-500">Prospecting, customer care and reorder momentum in the Revenue OS.</p></div>
      <div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{importing ? "Importing…" : "Import Diamond Path backup"}<input disabled={importing} type="file" accept="application/json,.json" className="hidden" onChange={e => void importBackup(e.target.files?.[0])}/></label><button type="button" onClick={() => setShowForm(value => !value)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Add prospect</button></div>
    </div>
    {importMessage && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{importMessage}</p>}
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7"><Metric label="Active prospects" value={diamondProspects.filter(p => !["Archived", "Not Interested"].includes(p.status)).length} /><Metric label="Customers" value={diamondCustomers.length} /><Metric label="Reorders due (7d)" value={reorderReadyCustomers.length} /><Metric label="Open follow-ups" value={dueFollowUps.length} /><Metric label="Products" value={diamondProducts.length}/><Metric label="Orders" value={diamondPurchases.length}/><Metric label="PV recorded" value={diamondPurchases.filter(p => p.status !== "Cancelled").reduce((sum, p) => sum + Number(p.pv || 0), 0)}/></div>
    {reorderReadyCustomers.length > 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-emerald-950">Customer care revenue actions</h2><p className="text-xs text-emerald-800">These customers are due or nearly due for a reorder. Contact them before prospecting cold.</p></div><button type="button" onClick={() => setTab("customers")} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800">Work reorders</button></div><div className="mt-3 grid gap-2 md:grid-cols-3">{reorderReadyCustomers.slice(0, 6).map(customer => <div key={customer.id} className="rounded-lg border border-emerald-100 bg-white p-3"><p className="text-sm font-semibold text-slate-900">{customer.name}</p><p className="text-xs text-slate-500">Due {customer.nextReorderDate} · {customer.lastPurchaseAmount ? `Last MYR ${customer.lastPurchaseAmount.toLocaleString()}` : "amount not recorded"}</p></div>)}</div></div>}
    {showForm && <form onSubmit={createProspect} className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="grid gap-3 sm:grid-cols-4"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp / phone" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><select value={type} onChange={e => setType(e.target.value as DiamondProspectType)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{types.map(item => <option key={item}>{item}</option>)}</select><select value={status} onChange={e => setStatus(e.target.value as DiamondProspectStatus)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{statuses.map(item => <option key={item}>{item}</option>)}</select></div><button disabled={saving} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save prospect"}</button></form>}
    <div className="overflow-x-auto border-b border-slate-200"><div className="flex min-w-max gap-5">{([["prospects", "Prospects"], ["customers", "Customers"], ["followups", "Follow-ups"], ["products", "Products"], ["orders", "Orders & Reorders"], ["scripts", "Scripts"]] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500"}`}>{label}</button>)}</div></div>
    {tab === "prospects" && <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Prospect</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Next action</th></tr></thead><tbody>{diamondProspects.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">No Diamond Path prospects yet. Add one to start the pipeline.</td></tr> : diamondProspects.map(prospect => <tr key={prospect.id} className="border-t border-slate-100"><td className="px-4 py-3"><div className="font-semibold text-slate-900">{prospect.name}</div><div className="text-xs text-slate-500">{prospect.phone || prospect.email || "No contact details"}</div></td><td className="px-4 py-3 text-slate-600">{prospect.prospectType}</td><td className="px-4 py-3"><select value={prospect.status} onChange={e => void updateDiamondProspect(prospect.id, { status: e.target.value as DiamondProspectStatus })} className="rounded-md border border-slate-200 px-2 py-1 text-xs"><option>{prospect.status}</option>{statuses.filter(item => item !== prospect.status).map(item => <option key={item}>{item}</option>)}</select></td><td className="px-4 py-3">{prospect.status === "Follow Up" ? <span className="text-xs text-slate-500">{prospect.nextFollowUpDate || "Scheduled"}</span> : <button type="button" onClick={() => void scheduleFollowUp(prospect)} className="text-xs font-semibold text-indigo-600 hover:underline">Schedule WhatsApp follow-up</button>}</td></tr>)}</tbody></table></div>}
    {tab === "customers" && <div className="rounded-xl border border-slate-200 bg-white p-4">{diamondCustomers.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Customer records will appear here after a prospect joins as a PC/ABO.</p> : <div className="space-y-2">{diamondCustomers.map(customer => <div key={customer.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3"><div><p className="font-semibold">{customer.name}</p><p className="text-xs text-slate-500">{customer.phone || customer.email || "No contact details"}</p></div><span className="text-xs text-slate-500">Next reorder: {customer.nextReorderDate || "Not set"}</span></div>)}</div>}</div>}
    {tab === "followups" && <div className="space-y-2">{dueFollowUps.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">No open Diamond Path follow-ups.</div> : dueFollowUps.map(task => <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-semibold text-slate-900">{task.contactName}</p><p className="text-xs text-slate-500">{task.channel} · due {task.dueDate} · {task.stage}</p></div><button type="button" onClick={() => void updateDiamondFollowUp(task.id, { completed: true, completedAt: new Date().toISOString() })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Mark complete</button></div>)}</div>}
    {tab === "products" && <SimpleTable headers={["SKU", "Product", "Category", "Member", "Retail", "PV / BV"]} rows={diamondProducts.map(p => [p.sku, p.name, p.category, `MYR ${Number(p.memberPrice || 0).toLocaleString()}`, `MYR ${Number(p.retailPrice || 0).toLocaleString()}`, `${p.pv || 0} / ${p.bv || 0}`])} empty="Import a Diamond Path backup containing the product catalogue."/>}
    {tab === "orders" && <SimpleTable headers={["Date", "Customer", "Product", "Total", "PV", "Reorder"]} rows={diamondPurchases.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)).map(p => [p.purchaseDate, p.customerName || p.customerId, `${p.quantity}× ${p.productName}`, `MYR ${Number(p.totalPrice || 0).toLocaleString()}`, String(p.pv || 0), p.expectedReorderDate || "—"])} empty="No Amway orders imported."/>}
    {tab === "scripts" && <div className="grid gap-3 md:grid-cols-2">{diamondScripts.length ? diamondScripts.map(script => <article key={script.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-indigo-700">{script.category}</p><h2 className="mt-1 font-bold">{script.title}</h2></div><span className="text-[10px] font-bold uppercase text-slate-500">{script.status}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{script.content}</p></article>) : <div className="md:col-span-2"><SimpleTable headers={["Scripts"]} rows={[]} empty="No approved outreach scripts imported."/></div>}</div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>; }
function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) { return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-12 text-center text-slate-500">{empty}</td></tr>}</tbody></table></div>; }
