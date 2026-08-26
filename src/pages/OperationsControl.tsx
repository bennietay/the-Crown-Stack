import { FormEvent, ReactNode, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { AutomationDefinition, BusinessUnit, NotificationRecord } from "../types";

type View = "notifications" | "automations" | "activity";
const sources: Array<BusinessUnit | "SYSTEM"> = ["WAAS", "ETSY", "AFFILIATE", "AMWAY", "SYSTEM"];

export function OperationsControl({ view }: { view: View }) {
  const workspace = useAuthStore(s => s.workspace); const user = useAuthStore(s => s.user);
  const store = useDataStore();
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ category: "information" as NotificationRecord["category"], source: "SYSTEM" as NotificationRecord["source"], title: "", message: "" });
  const [automation, setAutomation] = useState({ name: "", businessUnit: "SYSTEM" as AutomationDefinition["businessUnit"], trigger: "", conditions: "", action: "", approvalMode: "approval_required" as AutomationDefinition["approvalMode"] });
  async function submit(event: FormEvent) { event.preventDefault(); if (!workspace || !user) return; setSaving(true); try {
    if (view === "notifications") {
      await store.addNotification({ workspaceId: workspace.id, ...notice, status: "unread" });
      await store.addActivity({ workspaceId: workspace.id, actor: "USER", businessUnit: notice.source, action: "notification.created", entityType: "notification", result: "success", metadata: { title: notice.title } });
      setNotice({ ...notice, title: "", message: "" });
    } else if (view === "automations") {
      await store.addAutomation({ workspaceId: workspace.id, ...automation, enabled: false });
      await store.addActivity({ workspaceId: workspace.id, actor: "USER", businessUnit: automation.businessUnit, action: "automation.created", entityType: "automation", result: "success", metadata: { name: automation.name } });
      setAutomation({ ...automation, name: "", trigger: "", conditions: "", action: "" });
    }
    setOpen(false);
  } finally { setSaving(false); } }

  if (view === "activity") {
    const rows = store.activityRecords.filter(row => row.workspaceId === workspace?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return <Shell title="Activity & Audit Log" subtitle="Workspace-scoped actions. Secrets are never stored in activity metadata."><Table headers={["Time", "Actor", "Business", "Action", "Entity", "Result"]} rows={rows.map(row => [new Date(row.createdAt).toLocaleString(), row.actor, row.businessUnit, row.action, `${row.entityType}${row.entityId ? ` · ${row.entityId}` : ""}`, row.result])} empty="No recorded activity yet."/></Shell>;
  }

  if (view === "notifications") {
    const rows = store.notifications.filter(row => row.workspaceId === workspace?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return <Shell title="Notification Inbox" subtitle="Critical, warning, opportunity and system information in one queue." action={<button onClick={() => setOpen(v => !v)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Create notification</button>}>
      {open && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 md:grid-cols-4"><select value={notice.category} onChange={e => setNotice({ ...notice, category: e.target.value as NotificationRecord["category"] })} className="rounded-lg border px-3 py-2 text-sm"><option>critical</option><option>warning</option><option>opportunity</option><option>information</option></select><select value={notice.source} onChange={e => setNotice({ ...notice, source: e.target.value as NotificationRecord["source"] })} className="rounded-lg border px-3 py-2 text-sm">{sources.map(source => <option key={source}>{source}</option>)}</select><input required value={notice.title} onChange={e => setNotice({ ...notice, title: e.target.value })} placeholder="Title" className="rounded-lg border px-3 py-2 text-sm"/><input required value={notice.message} onChange={e => setNotice({ ...notice, message: e.target.value })} placeholder="Message" className="rounded-lg border px-3 py-2 text-sm"/><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-4">{saving ? "Saving…" : "Save notification"}</button></form>}
      <div className="space-y-3">{rows.length === 0 ? <Empty text="No notifications."/> : rows.map(row => <article key={row.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{row.category}</span><span className="text-xs font-bold text-indigo-700">{row.source}</span></div><h2 className="mt-2 font-bold">{row.title}</h2><p className="mt-1 text-sm text-slate-600">{row.message}</p></div><div className="flex gap-2"><button onClick={() => void store.updateNotification(row.id, { status: "read" })} className="rounded-lg border px-3 py-2 text-xs font-semibold">Read</button><button onClick={() => void store.updateNotification(row.id, { status: "resolved" })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Resolve</button></div></article>)}</div>
    </Shell>;
  }

  const rows = store.automations.filter(row => row.workspaceId === workspace?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Shell title="Automation Center" subtitle="Register triggers, conditions, actions and safe approval modes. New automations start disabled." action={<button onClick={() => setOpen(v => !v)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Define automation</button>}>
    {open && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 md:grid-cols-3"><input required value={automation.name} onChange={e => setAutomation({ ...automation, name: e.target.value })} placeholder="Automation name" className="rounded-lg border px-3 py-2 text-sm"/><select value={automation.businessUnit} onChange={e => setAutomation({ ...automation, businessUnit: e.target.value as AutomationDefinition["businessUnit"] })} className="rounded-lg border px-3 py-2 text-sm">{sources.map(source => <option key={source}>{source}</option>)}</select><select value={automation.approvalMode} onChange={e => setAutomation({ ...automation, approvalMode: e.target.value as AutomationDefinition["approvalMode"] })} className="rounded-lg border px-3 py-2 text-sm"><option value="approval_required">Approval required</option><option value="notify">Notify only</option><option value="auto">Auto (safe deterministic only)</option></select><input required value={automation.trigger} onChange={e => setAutomation({ ...automation, trigger: e.target.value })} placeholder="Trigger" className="rounded-lg border px-3 py-2 text-sm"/><input required value={automation.conditions} onChange={e => setAutomation({ ...automation, conditions: e.target.value })} placeholder="Conditions" className="rounded-lg border px-3 py-2 text-sm"/><input required value={automation.action} onChange={e => setAutomation({ ...automation, action: e.target.value })} placeholder="Action" className="rounded-lg border px-3 py-2 text-sm"/><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-3">{saving ? "Saving…" : "Save disabled automation"}</button></form>}
    <div className="space-y-3">{rows.length === 0 ? <Empty text="No automations defined."/> : rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex gap-2"><span className="text-xs font-bold text-indigo-700">{row.businessUnit}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">{row.approvalMode.replace("_", " ")}</span></div><h2 className="mt-2 font-bold">{row.name}</h2><dl className="mt-2 grid gap-1 text-sm text-slate-600"><div><strong>Trigger:</strong> {row.trigger}</div><div><strong>Conditions:</strong> {row.conditions}</div><div><strong>Action:</strong> {row.action}</div></dl></div><button onClick={() => void store.updateAutomation(row.id, { enabled: !row.enabled })} className={`rounded-lg px-3 py-2 text-xs font-semibold ${row.enabled ? "bg-emerald-600 text-white" : "border"}`}>{row.enabled ? "Enabled" : "Disabled"}</button></div></article>)}</div>
  </Shell>;
}

function Shell({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) { return <section className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Operations</p><h1 className="mt-1 text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{action}</div>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{text}</div>; }
function Table({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) { return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t">{row.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-slate-500">{empty}</td></tr>}</tbody></table></div>; }
