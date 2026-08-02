import React, { useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { OPPORTUNITY_STAGES, OpportunityStage, validateStageTransition } from "@/src/lib/opportunityStateMachine";
import { Opportunity } from "@/src/types";
import { DollarSign, AlertCircle, FileText, Lock, Plus, ArrowRight, ShieldCheck } from "lucide-react";
import { useSettingsStore } from "@/src/store/settingsStore";
import { v4 as uuidv4 } from "uuid";

export function Pipeline() {
  const { opportunities, updateOpportunity, addProposal } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const user = useAuthStore(state => state.user);
  const currency = useSettingsStore(state => state.settings.business.currency);

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [targetStage, setTargetStage] = useState<OpportunityStage | null>(null);
  const [transitionReason, setTransitionReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Proposal Creation Modal State
  const [proposalModalOpp, setProposalModalOpp] = useState<Opportunity | null>(null);
  const [customerProblem, setCustomerProblem] = useState("");
  const [otcCharges, setOtcCharges] = useState(2500);
  const [mrcCharges, setMrcCharges] = useState(250);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [createdProposalResult, setCreatedProposalResult] = useState<{ proposalId: string; token: string; publicUrl: string } | null>(null);

  const workspaceOpps = opportunities.filter(o => o.workspaceId === workspace?.id);

  const handleStageChangeClick = (opp: Opportunity, newStageStr: string) => {
    const newStage = newStageStr as OpportunityStage;
    setSelectedOpp(opp);
    setTargetStage(newStage);
    setTransitionReason("");
    setErrorMessage(null);
  };

  const executeStageTransition = async () => {
    if (!selectedOpp || !targetStage || !workspace) return;
    setUpdating(true);
    setErrorMessage(null);

    try {
      const validation = validateStageTransition(selectedOpp.stage as OpportunityStage, targetStage, transitionReason, user?.role);
      if (!validation.valid) throw new Error(validation.error || "Stage transition rejected");
      const history = [...(selectedOpp.stageHistory || []), {
        fromStage: selectedOpp.stage,
        toStage: targetStage,
        changedAt: new Date().toISOString(),
        changedBy: user?.id || "workspace-user",
        reason: transitionReason.trim() || undefined,
      }];
      await updateOpportunity(selectedOpp.id, { stage: targetStage, stageHistory: history, updatedAt: new Date().toISOString() });

      setSelectedOpp(null);
      setTargetStage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateVersionedProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalModalOpp || !workspace) return;
    setGeneratingProposal(true);

    try {
      const token = uuidv4();
      const proposalId = await addProposal({
        workspaceId: workspace.id,
        opportunityId: proposalModalOpp.id,
        title: `${proposalModalOpp.name || proposalModalOpp.title || "Project"} proposal`,
        customerProblem: customerProblem || undefined,
        items: [],
        status: "draft",
        totalOTC: otcCharges,
        totalMRC: mrcCharges,
        currency,
        token,
        taxRate: 0,
        pricing: {
          otcCharges,
          mrcCharges,
          taxes: 0,
          deposit: Math.round(otcCharges * 0.5),
          paymentSchedule: "50% deposit upfront, 50% upon go-live",
        },
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      });
      setCreatedProposalResult({ proposalId, token, publicUrl: `/p/${token}` });
    } catch (err: any) {
      alert(`Proposal error: ${err.message}`);
    } finally {
      setGeneratingProposal(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commercial Pipeline & Opportunities</h1>
          <p className="text-sm text-slate-500">Controlled stage transitions, historical audit records, and versioned proposals.</p>
        </div>
      </div>

      {/* Kanban Stages */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {OPPORTUNITY_STAGES.map((stage) => {
          const stageOpps = workspaceOpps.filter((o) => o.stage === stage);
          return (
            <div key={stage} className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-4 w-[310px] shrink-0 flex flex-col min-h-[550px]">
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  {stage}
                </h3>
                <span className="text-xs font-extrabold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                  {stageOpps.length}
                </span>
              </div>

              <div className="space-y-3 flex-1">
                {stageOpps.map((opp) => (
                  <Card key={opp.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{opp.title || opp.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Owner: {opp.opportunityOwner || "Sales"}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                        <span className="font-bold text-indigo-700">
                          {currency} {(opp.expectedValue || opp.estimatedValue || 0).toLocaleString()}
                        </span>
                        <span className="text-slate-400">Probability: {opp.probability || 30}%</span>
                      </div>

                      {/* Stage Selector */}
                      <div>
                        <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Move Stage:</label>
                        <select
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800"
                          value={opp.stage}
                          onChange={(e) => handleStageChangeClick(opp, e.target.value)}
                        >
                          {OPPORTUNITY_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setProposalModalOpp(opp);
                          setCustomerProblem(opp.problemSummary || "");
                          setCreatedProposalResult(null);
                        }}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-1.5 h-auto font-medium flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Generate Proposal
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Transition Reason Modal */}
      {selectedOpp && targetStage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Stage Transition Validation
            </h3>
            <p className="text-xs text-slate-600">
              Moving <strong>{selectedOpp.title || selectedOpp.name}</strong> from <span className="font-semibold">{selectedOpp.stage}</span> to <span className="font-semibold text-indigo-600">{targetStage}</span>.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-start gap-2 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transition Reason / Notes (Required if skipping stages or marking Lost) *
              </label>
              <textarea
                rows={3}
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="Explain the commercial justification or customer response..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedOpp(null)}>Cancel</Button>
              <Button onClick={executeStageTransition} disabled={updating} className="bg-indigo-600 text-white">
                {updating ? "Saving..." : "Confirm Stage Move"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Generator Modal */}
      {proposalModalOpp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Generate Commercial Proposal
            </h3>

            {!createdProposalResult ? (
              <form onSubmit={handleCreateVersionedProposal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Problem Statement</label>
                  <textarea
                    rows={3}
                    value={customerProblem}
                    onChange={(e) => setCustomerProblem(e.target.value)}
                    placeholder="Describe the client's current pain point..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">OTC Setup Charges ({currency})</label>
                    <input
                      type="number"
                      value={otcCharges}
                      onChange={(e) => setOtcCharges(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Monthly MRC ({currency})</label>
                    <input
                      type="number"
                      value={mrcCharges}
                      onChange={(e) => setMrcCharges(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setProposalModalOpp(null)}>Cancel</Button>
                  <Button type="submit" disabled={generatingProposal} className="bg-indigo-600 text-white">
                    {generatingProposal ? "Generating..." : "Create Draft Proposal"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl space-y-2 border border-emerald-200">
                  <p className="font-bold text-sm">Draft proposal created</p>
                  <p>Proposal ID: <span className="font-mono">{createdProposalResult.proposalId}</span></p>
                  <p>Review it in Proposals, then mark it ready to copy the public link.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setProposalModalOpp(null)} className="bg-slate-900 text-white">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
