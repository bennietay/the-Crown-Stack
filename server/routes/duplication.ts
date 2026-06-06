import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireFeature,
  requireSupabaseUser,
  requireTenantMatch
} from "../middleware/SubscriptionMiddleware.js";

export const duplicationRouter = Router();

duplicationRouter.use(requireSupabaseUser);

duplicationRouter.get(
  "/:tenantId/duplication/command-center",
  requireTenantMatch,
  requireFeature("personal-crm"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;

    const [team, leads, followUps, automations, outreach] = await Promise.all([
      supabaseAdmin.from("team_members").select("*").eq("tenant_id", tenantId).order("level"),
      supabaseAdmin.from("lead_records").select("*").eq("tenant_id", tenantId).order("next_follow_up_at"),
      supabaseAdmin.from("follow_up_steps").select("*").eq("tenant_id", tenantId).order("day_offset"),
      supabaseAdmin.from("automation_sequences").select("*").eq("tenant_id", tenantId),
      supabaseAdmin.from("social_outreach_tasks").select("*").eq("tenant_id", tenantId).order("created_at")
    ]);

    const error = [team.error, leads.error, followUps.error, automations.error, outreach.error].find(Boolean);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      team: team.data,
      leads: leads.data,
      followUps: followUps.data,
      automations: automations.data,
      outreach: outreach.data
    });
  }
);

duplicationRouter.post(
  "/:tenantId/leads",
  requireTenantMatch,
  requireFeature("personal-crm"),
  async (req, res) => {
    const { name, source, stage = "new", temperature = "warm", nextAction, nextFollowUpAt, notes } = req.body;

    if (!name || !source || !nextAction || !nextFollowUpAt) {
      return res.status(400).json({ error: "name, source, nextAction, and nextFollowUpAt are required." });
    }

    const { data, error } = await supabaseAdmin
      .from("lead_records")
      .insert({
        tenant_id: req.user!.tenantId,
        owner_uid: req.user!.uid,
        name,
        source,
        stage,
        temperature,
        next_action: nextAction,
        next_follow_up_at: nextFollowUpAt,
        notes
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ lead: data });
  }
);

duplicationRouter.post(
  "/:tenantId/outreach",
  requireTenantMatch,
  requireFeature("personal-crm"),
  async (req, res) => {
    const { platform, action, target, script } = req.body;

    if (!platform || !action || !target || !script) {
      return res.status(400).json({ error: "platform, action, target, and script are required." });
    }

    const { data, error } = await supabaseAdmin
      .from("social_outreach_tasks")
      .insert({
        tenant_id: req.user!.tenantId,
        owner_uid: req.user!.uid,
        platform,
        action,
        target,
        script,
        status: "queued"
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ task: data });
  }
);
