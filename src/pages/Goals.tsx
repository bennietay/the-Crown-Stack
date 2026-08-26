import { FormEvent, useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useDataStore } from "../store/dataStore";
import { inclusiveDaysBetween, summarizeRevenue } from "../lib/revenue";

const money = (value: number) => `MYR ${Math.round(value).toLocaleString()}`;

export function Goals() {
  const workspace = useAuthStore(s => s.workspace);
  const { revenueGoals, revenueEvents, opportunities, addRevenueGoal, updateRevenueGoal } = useDataStore();
  const goals = revenueGoals.filter(goal => goal.workspaceId === workspace?.id);
  const events = revenueEvents.filter(event => event.workspaceId === workspace?.id);
  const activeGoal = goals.find(goal => goal.status === "active") || goals[0];
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "2026 Revenue Goal", targetAmount: "1000000", startDate: "2026-01-01", endDate: "2026-12-31" });
  const totals = useMemo(() => summarizeRevenue(events), [events]);
  const pipeline = opportunities.filter(o => o.workspaceId === workspace?.id && !["won", "lost"].includes(o.stage.toLowerCase()) && o.currency.toUpperCase() === "MYR").reduce((sum, o) => {
    const value = o.estimatedValue || o.expectedValue || 0;
    return sum + value * Math.max(0, Math.min(1, (o.probability || 0) / 100));
  }, 0);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const metrics = useMemo(() => {
    if (!activeGoal) return null;
    const totalDays = inclusiveDaysBetween(activeGoal.startDate, activeGoal.endDate);
    const elapsedDays = Math.min(totalDays, inclusiveDaysBetween(activeGoal.startDate, today));
    const daysRemaining = Math.max(0, inclusiveDaysBetween(today, activeGoal.endDate));
    const remaining = Math.max(0, activeGoal.targetAmount - totals.collected);
    const runRate = totals.collected / Math.max(1, elapsedDays);
    return { totalDays, elapsedDays, daysRemaining, remaining, runRate, projected: runRate * totalDays };
  }, [activeGoal, today, totals.collected]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!workspace || Number(form.targetAmount) <= 0 || form.endDate < form.startDate) return;
    setSaving(true);
    try {
      await Promise.all(goals.filter(goal => goal.status === "active").map(goal => updateRevenueGoal(goal.id, { status: "paused" })));
      await addRevenueGoal({ workspaceId: workspace.id, name: form.name.trim(), targetAmount: Number(form.targetAmount), currency: "MYR", startDate: form.startDate, endDate: form.endDate, status: "active" });
      setOpen(false);
    } finally { setSaving(false); }
  }

  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Command Center</p><h1 className="mt-1 text-2xl font-bold">Revenue Goals</h1><p className="mt-1 text-sm text-slate-500">Collected, booked, pipeline and forecast remain separate.</p></div><button onClick={() => setOpen(v => !v)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">New goal</button></div>
    {open && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 md:grid-cols-5"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" aria-label="Goal name"/><input required type="number" min="1" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} className="rounded-lg border px-3 py-2 text-sm" aria-label="Target MYR"/><input required type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="rounded-lg border px-3 py-2 text-sm"/><input required type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="rounded-lg border px-3 py-2 text-sm"/><button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving…" : "Activate goal"}</button></form>}
    {!activeGoal || !metrics ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Create the first revenue goal to start deterministic tracking.</div> : <>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-slate-900">{activeGoal.name}</h2><p className="text-xs text-slate-500">{activeGoal.startDate} to {activeGoal.endDate}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">{activeGoal.status}</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, totals.collected / activeGoal.targetAmount * 100)}%` }} /></div><p className="mt-2 text-xs text-slate-500">{(totals.collected / activeGoal.targetAmount * 100).toFixed(1)}% collected</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Goal" value={money(activeGoal.targetAmount)}/><Metric label="Collected" value={money(totals.collected)}/><Metric label="Booked" value={money(totals.booked)}/><Metric label="Weighted pipeline" value={money(pipeline)}/><Metric label="Remaining" value={money(metrics.remaining)}/><Metric label="Days remaining" value={metrics.daysRemaining.toString()}/><Metric label="Required daily" value={money(metrics.remaining / Math.max(1, metrics.daysRemaining))}/><Metric label="Required weekly" value={money(metrics.remaining / Math.max(1, metrics.daysRemaining) * 7)}/><Metric label="Current daily run rate" value={money(metrics.runRate)}/><Metric label="Projected period revenue" value={money(metrics.projected)}/><Metric label="Expected (unbooked)" value={money(totals.expected)}/><Metric label="Refunded" value={money(totals.refunded)}/></div>
      {totals.excludedForeignCurrencyEvents > 0 && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{totals.excludedForeignCurrencyEvents} foreign-currency event(s) are excluded because no MYR conversion rate was recorded.</p>}
    </>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{value}</p></div>; }
