export const WAAS_DEPLOYMENT_STEPS = [
  "validate_order",
  "validate_onboarding",
  "validate_niche",
  "validate_style",
  "validate_brand",
  "validate_domain",
  "provision_hosting",
  "install_wordpress",
  "create_customer_access",
  "deploy_managed_connector",
  "install_approved_plugins",
  "apply_template",
  "apply_niche_configuration",
  "apply_style_configuration",
  "apply_brand_tokens",
  "apply_structured_content",
  "apply_assets",
  "create_pages",
  "configure_navigation",
  "configure_lead_capture",
  "configure_forms",
  "configure_whatsapp",
  "configure_maps",
  "configure_seo",
  "configure_analytics",
  "configure_crm",
  "configure_performance",
  "configure_domain_ssl",
  "run_qa",
  "generate_preview",
  "review_gate",
] as const;

export type WaasDeploymentStepName = (typeof WAAS_DEPLOYMENT_STEPS)[number];

export type DeploymentStepState = {
  name: string;
  status?: "queued" | "running" | "complete" | "failed" | "skipped";
  retryCount?: number;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
};

/**
 * Returns the first step that is not complete. This is deliberately pure so
 * retries can be tested without a database or a hosting provider.
 */
export function firstIncompleteStep(steps: DeploymentStepState[]): WaasDeploymentStepName | undefined {
  return WAAS_DEPLOYMENT_STEPS.find(name => steps.find(step => step.name === name)?.status !== "complete");
}

export function canResumeDeployment(steps: DeploymentStepState[]): boolean {
  return firstIncompleteStep(steps) !== undefined;
}

export function startStep(step: DeploymentStepState, now = new Date().toISOString()): DeploymentStepState {
  return { ...step, status: "running", startedAt: now };
}

export function completeStep(step: DeploymentStepState, now = new Date().toISOString()): DeploymentStepState {
  return { ...step, status: "complete", completedAt: now };
}

export function failStep(step: DeploymentStepState, errorMessage: string, now = new Date().toISOString()): DeploymentStepState {
  return { ...step, status: "failed", errorMessage, completedAt: now, retryCount: Number(step.retryCount || 0) + 1 };
}
