import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

export type SubscriptionTier = "ignite" | "ascent" | "empire";

export type FeatureKey =
  | "daily-apex"
  | "script-vault"
  | "personal-crm"
  | "landing-page-builder"
  | "automation-sequences"
  | "team-snapshot"
  | "duplication-engine"
  | "ai-prospecting-hub"
  | "team-analytics";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  tenantId: string;
  tier: SubscriptionTier;
  role: "new_joiner" | "member" | "leader" | "admin" | "superadmin";
  isSuperadmin?: boolean;
  tenantStatus?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const tierRank: Record<SubscriptionTier, number> = {
  ignite: 1,
  ascent: 2,
  empire: 3
};

const featureMinimumTier: Record<FeatureKey, SubscriptionTier> = {
  "daily-apex": "ignite",
  "script-vault": "ignite",
  "personal-crm": "ignite",
  "landing-page-builder": "ascent",
  "automation-sequences": "ascent",
  "team-snapshot": "ascent",
  "duplication-engine": "empire",
  "ai-prospecting-hub": "empire",
  "team-analytics": "empire"
};

export async function requireSupabaseUser(req: Request, res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return res.status(401).json({ error: "Missing Supabase bearer token." });
  }

  const {
    data: { user },
    error: authError
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: "Invalid Supabase session." });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("tenant_id,tier,role,is_superadmin,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return res.status(403).json({ error: "User profile has not been provisioned." });
  }

  if (profile.status && profile.status !== "active") {
    return res.status(403).json({ error: "User access is not active." });
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("status")
    .eq("id", profile.tenant_id)
    .single();

  if (tenant?.status && !["active", "trialing"].includes(tenant.status)) {
    return res.status(402).json({ error: "Tenant subscription is not active." });
  }

  req.user = {
    uid: user.id,
    email: user.email,
    tenantId: profile.tenant_id,
    tier: profile.tier,
    role: profile.role,
    isSuperadmin: Boolean(profile.is_superadmin),
    tenantStatus: tenant?.status
  };

  return next();
}

export function requireSuperadmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  if (!req.user.isSuperadmin && req.user.role !== "superadmin") {
    return res.status(403).json({ error: "Superadmin access is required." });
  }

  return next();
}

export function requireTenantAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  if (!["leader", "admin", "superadmin"].includes(req.user.role)) {
    return res.status(403).json({ error: "Tenant admin access is required." });
  }

  return next();
}

export function requireFeature(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication is required." });
    }

    const minimumTier = featureMinimumTier[feature];
    const allowed = tierRank[req.user.tier] >= tierRank[minimumTier];

    if (!allowed) {
      return res.status(402).json({
        error: "Subscription upgrade required.",
        feature,
        minimumTier,
        currentTier: req.user.tier
      });
    }

    return next();
  };
}

export function requireTenantMatch(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  const tenantId = req.params.tenantId ?? req.body.tenantId ?? req.query.tenantId;

  if (tenantId && tenantId !== req.user.tenantId) {
    return res.status(403).json({ error: "Cross-tenant access denied." });
  }

  return next();
}

export function requireEmpireLeader(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication is required." });
  }

  const isLeader =
    req.user.role === "leader" || req.user.role === "admin" || req.user.role === "superadmin";
  const isEmpire = req.user.tier === "empire";

  if (!isLeader || !isEmpire) {
    return res.status(403).json({ error: "Empire leader access is required." });
  }

  return next();
}
