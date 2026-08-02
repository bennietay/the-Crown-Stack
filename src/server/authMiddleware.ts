import { Request, Response, NextFunction } from "express";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { Role } from "../types";

export interface RequestContext {
  uid: string;
  email?: string;
  activeWorkspaceId?: string;
  membershipId?: string;
  canonicalRole: Role;
  customerId?: string;
  customerContactId?: string;
  requestId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: Role;
    workspaceIds?: string[];
    customerId?: string;
  };
  workspaceId?: string;
  memberRole?: Role;
  requestId?: string;
  context?: RequestContext;
}

const getDb = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }
  return null;
};

// 1. Authenticate Request Middleware
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const requestId = req.requestId || (req.headers["x-request-id"] as string) || "req-unknown";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing Bearer token", code: "UNAUTHORIZED" });
  }

  const token = authHeader.split("Bearer ")[1];

  if (getApps().length === 0) {
    const isDevBypassEnabled = process.env.NODE_ENV === "test" || (process.env.NODE_ENV !== "production" && process.env.APP_MODE === "demo" && process.env.ENABLE_DEV_AUTH_BYPASS === "true");
    
    if (!isDevBypassEnabled) {
      console.error("[SECURITY] Firebase Admin is uninitialized and no explicit test bypass is enabled.");
      return res.status(503).json({ error: "Auth provider unavailable", code: "AUTH_UNAVAILABLE" });
    }

    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString() || '{}');
      const devRole: Role = (payload.role as Role) || "workspace_admin";
      req.user = {
        uid: payload.user_id || payload.sub || "usr-bennie",
        email: payload.email,
        role: devRole,
        workspaceIds: payload.workspaceIds || ["ws-bennie"]
      };

      req.context = {
        uid: req.user.uid,
        email: req.user.email,
        canonicalRole: devRole,
        requestId,
        customerId: payload.customerId || "cust-acme-prod"
      };

      return next();
    } catch {
      req.user = {
        uid: "usr-bennie",
        email: undefined,
        role: "workspace_admin", // low-privilege dev role, never super_admin
        workspaceIds: ["ws-bennie"]
      };

      req.context = {
        uid: "usr-bennie",
        email: undefined,
        canonicalRole: "workspace_admin",
        requestId,
        customerId: "cust-acme-prod"
      };

      return next();
    }
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const db = getDb();
    let globalRole: Role = (decodedToken.role as Role) || "customer";

    if (db) {
      const userDoc = await db.collection("users").doc(decodedToken.uid).get();
      if (userDoc.exists) {
        globalRole = (userDoc.data()?.role as Role) || globalRole;
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: globalRole,
      workspaceIds: (decodedToken.workspaceIds as string[]) || []
    };

    req.context = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      canonicalRole: globalRole,
      requestId
    };

    next();
  } catch (error: any) {
    console.error("Authentication failed:", error.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token", code: "INVALID_TOKEN" });
  }
};

// 2. Workspace Membership Verification Middleware
export const requireWorkspace = (getWorkspaceId?: (req: Request) => string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    }

    const workspaceId = getWorkspaceId
      ? getWorkspaceId(req)
      : (req.params.workspaceId || req.body.workspaceId || (req.query.workspaceId as string));

    if (!workspaceId) {
      return res.status(400).json({ error: "Bad Request: Missing workspaceId parameter", code: "MISSING_WORKSPACE_ID" });
    }

    req.workspaceId = workspaceId;
    if (req.context) {
      req.context.activeWorkspaceId = workspaceId;
    }

    // Super admin has platform-wide workspace access
    if (req.user.role === "super_admin") {
      req.memberRole = "super_admin";
      return next();
    }

    const db = getDb();
    if (!db) {
      if (process.env.NODE_ENV === "test" || (process.env.NODE_ENV !== "production" && process.env.APP_MODE === "demo" && process.env.ENABLE_DEV_AUTH_BYPASS === "true")) {
        req.memberRole = req.user.role || "workspace_admin";
        return next();
      }
      return res.status(503).json({ error: "Workspace authorization unavailable", code: "AUTH_UNAVAILABLE" });
    }

    try {
      const memberDocId = `${workspaceId}_${req.user.uid}`;
      const memberDoc = await db.collection("workspaceUsers").doc(memberDocId).get();

      if (!memberDoc.exists || memberDoc.data()?.status !== "active") {
        return res.status(403).json({
          error: `Forbidden: User is not an active member of workspace ${workspaceId}`,
          code: "NOT_WORKSPACE_MEMBER"
        });
      }

      req.memberRole = memberDoc.data()?.role as Role;
      if (req.context) {
        req.context.membershipId = memberDocId;
        req.context.canonicalRole = req.memberRole;
      }
      next();
    } catch (err: any) {
      console.error("Workspace verification error:", err.message);
      return res.status(500).json({ error: "Internal Server Error verifying workspace access" });
    }
  };
};

// 3. Role Verification Middleware
export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.memberRole) {
      return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    }

    if (req.memberRole === "super_admin" || allowedRoles.includes(req.memberRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Access requires one of [${allowedRoles.join(", ")}]. Your role: ${req.memberRole}`,
      code: "ROLE_NOT_PERMITTED"
    });
  };
};

// 4. Customer Ownership Verification Middleware
export const requireCustomerOwnership = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.context) {
      return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    }

    // Internal staff (admin, manager, sales) do not require customer link check if they have valid workspace role
    if (req.memberRole && ["super_admin", "workspace_admin", "account_manager", "sales"].includes(req.memberRole)) {
      return next();
    }

    // Customer role must resolve customerId from verified context
    if (req.context.customerId) {
      return next();
    }

    const db = getDb();
    if (db) {
      try {
        const contactQuery = await db.collection("customerContacts")
          .where("userId", "==", req.user.uid)
          .limit(1)
          .get();

        if (!contactQuery.empty) {
          const contactData = contactQuery.docs[0].data();
          req.context.customerId = contactData.customerId;
          req.context.customerContactId = contactQuery.docs[0].id;
          return next();
        }
      } catch (err: any) {
        console.error("Error looking up customer contact link:", err.message);
      }
    }

    // Explicit automated-test fallback only.
    if (process.env.NODE_ENV === "test" && req.user.email) {
      req.context.customerId = "cust-acme-prod";
      return next();
    }

    return res.status(403).json({
      error: "Forbidden: No verified customer link associated with authenticated account",
      code: "CUSTOMER_LINK_REQUIRED"
    });
  };
};

// 5. Resource Workspace Match Middleware
export const requireResourceWorkspace = (getResourceWorkspaceId: (req: AuthenticatedRequest) => Promise<string | null>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.workspaceId) {
      return res.status(400).json({ error: "Missing workspace context", code: "MISSING_WORKSPACE_CONTEXT" });
    }

    try {
      const resourceWorkspaceId = await getResourceWorkspaceId(req);
      if (resourceWorkspaceId && resourceWorkspaceId !== req.workspaceId) {
        return res.status(403).json({
          error: `Forbidden: Cross-tenant resource mismatch. Resource belongs to ${resourceWorkspaceId}, active workspace is ${req.workspaceId}`,
          code: "CROSS_TENANT_VIOLATION"
        });
      }
      next();
    } catch (err: any) {
      return res.status(500).json({ error: "Error validating resource workspace matching", details: err.message });
    }
  };
};

// 6. Audit Logger Helper
export const logAuditEvent = async (event: {
  workspaceId: string;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  ip?: string;
  requestId?: string;
}) => {
  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...event,
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify({ event: "audit_log", ...auditEntry }));

  const db = getDb();
  if (db) {
    try {
      await db.collection("auditLogs").doc(auditEntry.id).set(auditEntry);
    } catch (err: any) {
      console.error("Failed to write audit log to Firestore:", err.message);
    }
  }

  return auditEntry;
};
