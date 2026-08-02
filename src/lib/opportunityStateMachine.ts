export type OpportunityStage =
  | "Qualified"
  | "Discovery"
  | "Solution proposed"
  | "Proposal sent"
  | "Negotiation"
  | "Verbal agreement"
  | "Won"
  | "Lost";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "Qualified",
  "Discovery",
  "Solution proposed",
  "Proposal sent",
  "Negotiation",
  "Verbal agreement",
  "Won",
  "Lost"
];

// Matrix of valid forward transitions without requiring special reason
const ALLOWED_FORWARD_TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  Qualified: ["Discovery", "Lost"],
  Discovery: ["Solution proposed", "Qualified", "Lost"],
  "Solution proposed": ["Proposal sent", "Discovery", "Lost"],
  "Proposal sent": ["Negotiation", "Verbal agreement", "Won", "Solution proposed", "Lost"],
  Negotiation: ["Verbal agreement", "Won", "Proposal sent", "Lost"],
  "Verbal agreement": ["Won", "Negotiation", "Lost"],
  Won: [], // Terminal stage
  Lost: ["Qualified", "Discovery"] // Can re-open if reason provided
};

export interface StageHistoryEvent {
  fromStage: OpportunityStage;
  toStage: OpportunityStage;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export function validateStageTransition(
  currentStage: OpportunityStage,
  newStage: OpportunityStage,
  reason?: string,
  userRole?: string
): { valid: boolean; error?: string } {
  if (currentStage === newStage) {
    return { valid: true };
  }

  // Admin override always valid if reason provided
  if ((userRole === "super_admin" || userRole === "workspace_admin") && reason && reason.trim().length >= 3) {
    return { valid: true };
  }

  // Won is terminal
  if (currentStage === "Won" && userRole !== "super_admin") {
    return { valid: false, error: "Cannot transition away from Won stage without Super Admin authorization" };
  }

  // Check state machine transitions
  const allowed = ALLOWED_FORWARD_TRANSITIONS[currentStage] || [];
  const isDirectNext = allowed.includes(newStage);

  if (!isDirectNext) {
    // If skipping stages or moving backward, a reason is MANDATORY
    if (!reason || reason.trim().length < 5) {
      return {
        valid: false,
        error: `Transitioning from "${currentStage}" to "${newStage}" requires a valid explanation / reason (min 5 characters)`
      };
    }
  }

  // Moving to Lost requires a lost reason
  if (newStage === "Lost" && (!reason || reason.trim().length < 3)) {
    return { valid: false, error: "Reason is required when marking an opportunity as Lost" };
  }

  return { valid: true };
}
