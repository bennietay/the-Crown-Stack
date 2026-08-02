import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, FileText, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Proposal, Product } from "@/src/types";

type PublicProduct = Pick<Product, "id" | "name"> & Partial<Product>;

export function ProposalView() {
  const token = decodeURIComponent(window.location.pathname.slice(3));
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedRecord, setAcceptedRecord] = useState<any>(null);
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerTitle: "", company: "" });
  const [checks, setChecks] = useState({ reviewedScope: false, acceptCommercialTerms: false, hasAuthority: false, agreeTermsAndPolicies: false });

  useEffect(() => {
    async function loadProposal() {
      try {
        if (!token) throw new Error("Proposal link is invalid.");
        const response = await fetch(`/api/proposals/public/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok || !data.proposal) throw new Error(data.error || "Proposal not found or no longer available.");
        setProposal(data.proposal);
        setProducts(data.products || []);
      } catch (loadError: any) {
        setError(loadError.message || "Failed to load proposal.");
      } finally {
        setLoading(false);
      }
    }
    loadProposal();
  }, [token]);

  const currency = proposal?.currency || "MYR";
  const productName = (id: string) => products.find(product => product.id === id)?.name || "Custom service";

  async function handleAccept(event: FormEvent) {
    event.preventDefault();
    if (!Object.values(checks).every(Boolean)) {
      setError("Confirm all four statements before accepting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/proposals/public/${encodeURIComponent(token || "")}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, confirmedCheckboxes: checks }),
      });
      const data = await response.json();
      if (!response.ok || !data.acceptanceRecord) throw new Error(data.error || "Acceptance could not be recorded.");
      setAcceptedRecord(data.acceptanceRecord);
    } catch (acceptError: any) {
      setError(acceptError.message || "Acceptance could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-sm text-slate-600">Loading proposal…</div>;

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center"><CardContent className="pt-6 text-slate-700">{error || "Proposal not found"}</CardContent></Card>
      </div>
    );
  }

  if (acceptedRecord || proposal.status.toLowerCase() === "accepted") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl text-center shadow-xl">
          <CardContent className="p-8 space-y-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900">Proposal accepted</h1>
            <p className="text-sm text-slate-600">Thank you. Your acceptance is recorded. Bennie will contact you with payment and kickoff instructions.</p>
            {acceptedRecord?.id && <p className="text-xs text-slate-500">Acceptance reference: {acceptedRecord.id}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl sm:p-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Bennie Studio</p>
              <h1 className="text-3xl font-extrabold tracking-tight">{proposal.title || "Project proposal"}</h1>
              <p className="mt-2 text-sm text-slate-300">A clear scope, investment and decision record.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
              <p className="text-xs uppercase text-slate-400">Valid until</p>
              <p className="mt-1 font-bold">{new Date(proposal.expiresAt || proposal.expiryDate || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" />Scope and investment</CardTitle>
            <CardDescription>Review every line before accepting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {(proposal.items || []).map((item, index) => (
                <div key={`${item.productId}-${index}`} className="flex items-center justify-between border-b border-slate-100 p-4 last:border-0">
                  <div><p className="font-bold text-slate-900">{productName(item.productId)}</p><p className="text-xs text-slate-500">Quantity {item.quantity}</p></div>
                  <p className="text-sm font-semibold text-slate-700">Included in total</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-950 p-5 text-white"><p className="text-xs uppercase text-slate-400">One-off</p><p className="mt-1 text-2xl font-extrabold">{currency} {proposal.totalOTC.toLocaleString()}</p></div>
              <div className="rounded-xl bg-indigo-950 p-5 text-white"><p className="text-xs uppercase text-indigo-300">Monthly</p><p className="mt-1 text-2xl font-extrabold">{currency} {proposal.totalMRC.toLocaleString()}<span className="text-sm font-normal">/mo</span></p></div>
            </div>
            {proposal.taxRate ? <p className="text-xs text-slate-500">Tax rate: {proposal.taxRate}%</p> : null}
          </CardContent>
        </Card>

        <Card className="border-2 border-indigo-600 shadow-xl">
          <CardHeader className="bg-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Accept this proposal</CardTitle>
            <CardDescription className="text-indigo-100">Acceptance records your signatory details and decision. Payment instructions follow separately.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleAccept} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["customerName", "Full legal name", "name"], ["customerEmail", "Authorised email", "email"],
                  ["customerTitle", "Title / role", "organization-title"], ["company", "Company name", "organization"],
                ].map(([key, label, autocomplete]) => (
                  <div key={key}>
                    <label htmlFor={key} className="mb-1 block text-xs font-bold text-slate-700">{label} *</label>
                    <input id={key} type={key === "customerEmail" ? "email" : "text"} required autoComplete={autocomplete} value={(form as any)[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {[
                  ["reviewedScope", "I reviewed the scope, pricing and responsibilities."],
                  ["acceptCommercialTerms", "I accept the one-off and recurring commercial terms shown."],
                  ["hasAuthority", "I am authorised to accept for this organisation."],
                  ["agreeTermsAndPolicies", "I agree that this electronic acceptance records our decision."],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-start gap-3 text-xs text-slate-800"><input type="checkbox" checked={(checks as any)[key]} onChange={event => setChecks(current => ({ ...current, [key]: event.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" /><span>{label}</span></label>
                ))}
              </div>
              {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-4 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"><ShieldCheck className="h-5 w-5" />{submitting ? "Recording acceptance…" : "Accept proposal"}</button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
