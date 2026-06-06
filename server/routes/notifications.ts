import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireSuperadmin,
  requireSupabaseUser
} from "../middleware/SubscriptionMiddleware.js";

export const notificationsRouter = Router();

async function queueNotification(params: {
  tenantId: string;
  eventType: string;
  recipientEmail?: string;
  payload?: Record<string, unknown>;
}) {
  const { data: rules } = await supabaseAdmin
    .from("notification_rules")
    .select("*")
    .eq("trigger", params.eventType)
    .eq("enabled", true);

  if (!rules?.length) return;

  await supabaseAdmin.from("notification_events").insert(
    rules.map((rule) => ({
      tenant_id: params.tenantId,
      rule_id: rule.id,
      event_type: params.eventType,
      recipient_email: params.recipientEmail ?? null,
      channel: rule.channel,
      status: "queued",
      payload: params.payload ?? {}
    }))
  );
}

notificationsRouter.post("/public/:tenantId/appointments", async (req, res) => {
  const { prospectName, prospectEmail, scheduledAt } = req.body as {
    prospectName?: string;
    prospectEmail?: string;
    scheduledAt?: string;
  };

  if (!prospectName || !prospectEmail || !scheduledAt) {
    return res.status(400).json({ error: "prospectName, prospectEmail, and scheduledAt are required." });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      tenant_id: req.params.tenantId,
      prospect_name: prospectName,
      prospect_email: prospectEmail,
      scheduled_at: scheduledAt
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await queueNotification({
    tenantId: req.params.tenantId,
    eventType: "new_appointment",
    recipientEmail: prospectEmail,
    payload: { appointmentId: data.id, prospectName, scheduledAt }
  });

  return res.status(201).json({ appointment: data });
});

notificationsRouter.post(
  "/admin/notifications/daily-task-reminders",
  requireSupabaseUser,
  requireSuperadmin,
  async (_req, res) => {
    const { data: tenants, error } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .in("status", ["active", "trialing"]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await Promise.all(
      (tenants ?? []).map((tenant) =>
        queueNotification({
          tenantId: tenant.id,
          eventType: "daily_task_reminder",
          payload: { reminder: "Daily Apex checklist is ready." }
        })
      )
    );

    return res.json({ queued: tenants?.length ?? 0 });
  }
);
