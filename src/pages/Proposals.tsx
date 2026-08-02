import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDataStore } from "@/src/store/dataStore";
import { Proposal } from "@/src/types";
import { useAuthStore } from "@/src/store/authStore";
import { useSettingsStore } from "@/src/store/settingsStore";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export function Proposals() {
  const { proposals, opportunities, products, addProposal, updateProposal } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const settings = useSettingsStore(state => state.settings);
  const workspaceProposals = proposals.filter(p => p.workspaceId === workspace?.id);
  const workspaceOpps = opportunities.filter(o => o.workspaceId === workspace?.id);
  const workspaceProducts = products.filter(p => p.workspaceId === workspace?.id);
  
  const currency = settings?.business?.currency || 'USD';

  const [showAdd, setShowAdd] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [newProposal, setNewProposal] = useState({
    opportunityId: "",
    items: [] as { productId: string; quantity: number }[]
  });

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);

  const applyTemplate = (templateId: "launch" | "growth" | "care") => {
    let items = [];
    if (templateId === "launch") {
      const p = workspaceProducts.find(prod => prod.name.includes("Launch"));
      if (p) items.push({ productId: p.id, quantity: 1 });
    } else if (templateId === "growth") {
      const p = workspaceProducts.find(prod => prod.name.includes("Growth"));
      if (p) items.push({ productId: p.id, quantity: 1 });
    } else if (templateId === "care") {
      const p = workspaceProducts.find(prod => prod.name.includes("Care Plan"));
      if (p) items.push({ productId: p.id, quantity: 1 });
    }
    setNewProposal(prev => ({ ...prev, items }));
  };

  const handleAddItem = () => {
    if (!selectedProduct) return;
    setNewProposal(prev => {
      const existing = prev.items.find(i => i.productId === selectedProduct);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map(i => i.productId === selectedProduct ? { ...i, quantity: i.quantity + selectedQty } : i)
        };
      }
      return { ...prev, items: [...prev.items, { productId: selectedProduct, quantity: selectedQty }] };
    });
    setSelectedProduct("");
    setSelectedQty(1);
  };

  const handleCreate = () => {
    if (!workspace || !newProposal.opportunityId) return;
    
    // calculate totals
    let totalOTC = 0;
    let totalMRC = 0;
    newProposal.items.forEach(item => {
      const product = workspaceProducts.find(p => p.id === item.productId);
      if (product) {
        if (product.type === "otc") totalOTC += product.price * item.quantity;
        if (product.type === "mrc") totalMRC += product.price * item.quantity;
      }
    });

    const validityDays = settings?.sales?.proposalValidityDays || 30;
    const taxRate = settings?.sales?.taxRate || 0;

    addProposal({
      workspaceId: workspace.id,
      opportunityId: newProposal.opportunityId,
      items: newProposal.items,
      status: "draft",
      totalOTC,
      totalMRC,
      taxRate,
      currency,
      token: uuidv4(),
      expiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString()
    });
    setShowAdd(false);
    setNewProposal({ opportunityId: "", items: [] });
  };

  const markReadyToShare = async (proposal: Proposal) => {
    await updateProposal(proposal.id, { status: "sent" });
    await copyLink(proposal.token);
  };

  const copyLink = async (token?: string) => {
    if (!token) return;
    const link = `${window.location.origin}/p/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Proposals</h2>
          <p className="text-sm text-slate-500">Prepare proposals, copy a secure link, and track customer decisions.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>Create Proposal</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Opportunity</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Total OTC</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Total MRC</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspaceProposals.map((p) => {
                  const opp = workspaceOpps.find(o => o.id === p.opportunityId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{opp?.name || "Unknown"}</td>
                      <td className="px-6 py-3 font-semibold text-slate-600">{currency} {p.totalOTC.toLocaleString()}</td>
                      <td className="px-6 py-3 font-semibold text-slate-600">{currency} {p.totalMRC.toLocaleString()}/mo</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase 
                          ${p.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                            p.status === 'draft' ? 'bg-slate-100 text-slate-700' : 
                            p.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {p.token && p.status === "sent" && (
                            <Button variant="ghost" size="sm" onClick={() => copyLink(p.token)} title="Copy Share Link">
                              {copiedToken === p.token ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
                            </Button>
                          )}
                          {p.token && p.status === "sent" && (
                            <a href={`/p/${p.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {p.status === "draft" && <Button variant="ghost" size="sm" onClick={() => markReadyToShare(p)}>Ready & copy link</Button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {workspaceProposals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No proposals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create Fast Proposal</CardTitle>
              <CardDescription>Select an opportunity and apply a quick template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Opportunity</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={newProposal.opportunityId}
                  onChange={e => setNewProposal({...newProposal, opportunityId: e.target.value})}
                >
                  <option value="">Select an opportunity...</option>
                  {workspaceOpps.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-3 gap-2 my-2">
                <Button variant="outline" size="sm" onClick={() => applyTemplate('launch')} className="text-xs">
                  Template: Launch
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyTemplate('growth')} className="text-xs">
                  Template: Growth
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyTemplate('care')} className="text-xs">
                  Template: Care Plan
                </Button>
              </div>

              <div className="border border-slate-200 rounded-md p-4 bg-slate-50 mt-4">
                <h4 className="text-sm font-semibold mb-2">Edit Items</h4>
                <div className="flex gap-2 mb-4">
                  <select 
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                  >
                    <option value="">Select a product...</option>
                    {workspaceProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({currency} {p.price} {p.type})</option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    min="1"
                    className="w-20 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={selectedQty}
                    onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                  />
                  <Button onClick={handleAddItem} variant="secondary">Add</Button>
                </div>
                
                {newProposal.items.length > 0 && (
                  <ul className="space-y-2 text-sm">
                    {newProposal.items.map((item, idx) => {
                      const p = workspaceProducts.find(prod => prod.id === item.productId);
                      return (
                        <li key={idx} className="flex justify-between bg-white p-2 border border-slate-100 rounded">
                          <span>{p?.name} (x{item.quantity})</span>
                          <span className="font-semibold">{currency} {(p?.price || 0) * item.quantity} {p?.type}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!newProposal.opportunityId}>Save & Generate Token</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
