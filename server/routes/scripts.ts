import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireEmpireLeader,
  requireFeature,
  requireSupabaseUser,
  requireTenantMatch
} from "../middleware/SubscriptionMiddleware.js";

export const scriptsRouter = Router();

scriptsRouter.use(requireSupabaseUser);

scriptsRouter.get(
  "/:tenantId/scripts",
  requireTenantMatch,
  requireFeature("script-vault"),
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from("scripts")
      .select("*")
      .eq("tenant_id", req.user!.tenantId)
      .order("updated_at", { ascending: false })
      .limit(25);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ scripts: data });
  }
);

scriptsRouter.post(
  "/:tenantId/scripts/push",
  requireTenantMatch,
  requireFeature("duplication-engine"),
  requireEmpireLeader,
  async (req, res) => {
    const { title, channel, body, imageUrl } = req.body as {
      title?: string;
      channel?: string;
      body?: string;
      imageUrl?: string;
    };

    if (!title || !channel || !body) {
      return res.status(400).json({ error: "title, channel, and body are required." });
    }

    const { data, error } = await supabaseAdmin
      .from("scripts")
      .insert({
        tenant_id: req.user!.tenantId,
        owner_uid: req.user!.uid,
        pushed_by_uid: req.user!.uid,
        title,
        channel,
        body,
        image_url: imageUrl ?? null,
        visibility: "downline"
      })
      .select("id")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ id: data.id });
  }
);
