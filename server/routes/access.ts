import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import {
  requireTenantAdmin,
  requireSupabaseUser,
  requireTenantMatch,
  type SubscriptionTier
} from "../middleware/SubscriptionMiddleware.js";

type UserRole = "new_joiner" | "member" | "leader" | "admin" | "superadmin";

export const accessRouter = Router();

accessRouter.use(requireSupabaseUser);

accessRouter.get("/:tenantId/access/users", requireTenantMatch, requireTenantAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,display_name,email,role,tier,status,last_seen_at,mfa_enabled")
    .eq("tenant_id", req.user!.tenantId)
    .order("display_name", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ users: data });
});

accessRouter.get("/:tenantId/access/invites", requireTenantMatch, requireTenantAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("access_invites")
    .select("*")
    .eq("tenant_id", req.user!.tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ invites: data });
});

accessRouter.post("/:tenantId/access/invites", requireTenantMatch, requireTenantAdmin, async (req, res) => {
  const { email, role, tier } = req.body as {
    email?: string;
    role?: UserRole;
    tier?: SubscriptionTier;
  };

  if (!email || !role || !tier) {
    return res.status(400).json({ error: "email, role, and tier are required." });
  }

  const { data, error } = await supabaseAdmin
    .from("access_invites")
    .insert({
      tenant_id: req.user!.tenantId,
      email,
      role,
      tier,
      invited_by: req.user!.uid,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select("*")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ invite: data });
});

accessRouter.patch("/:tenantId/access/users/:userId", requireTenantMatch, requireTenantAdmin, async (req, res) => {
  const { role, tier, status, mfaEnabled } = req.body as {
    role?: UserRole;
    tier?: SubscriptionTier;
    status?: "active" | "invited" | "suspended";
    mfaEnabled?: boolean;
  };

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      role,
      tier,
      status,
      mfa_enabled: mfaEnabled
    })
    .eq("tenant_id", req.user!.tenantId)
    .eq("id", req.params.userId)
    .select("id,display_name,email,role,tier,status,mfa_enabled")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ user: data });
});
