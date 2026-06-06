import { supabaseAdmin } from "./supabaseAdmin.js";

export async function writeAuditLog(input: {
  tenantId?: string | null;
  actorUid?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    tenant_id: input.tenantId ?? null,
    actor_uid: input.actorUid ?? null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {}
  });

  if (error) {
    console.warn(`Audit log failed for ${input.action}: ${error.message}`);
  }
}
