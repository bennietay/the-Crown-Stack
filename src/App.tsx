/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComponentType, lazy, ReactNode, Suspense, useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { RouterProvider, useLocation } from "./lib/router";
import { Login } from "./pages/Login";
import { Unauthorized } from "./pages/Unauthorized";
import { useAuthStore } from "./store/authStore";
import { Role } from "./types";

function lazyWithChunkRecovery<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>, chunkName: string) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // A deployment can leave an already-open tab holding an old hashed chunk.
      // Reload once with a cache-busting query so it fetches the current manifest.
      const recoveryKey = `bennie-chunk-recovery:${chunkName}`;
      if (!sessionStorage.getItem(recoveryKey)) {
        sessionStorage.setItem(recoveryKey, "1");
        const url = new URL(window.location.href);
        url.searchParams.set("_refresh", Date.now().toString());
        window.location.replace(url.toString());
        return await new Promise<never>(() => undefined);
      }
      sessionStorage.removeItem(recoveryKey);
      throw error;
    }
  });
}

const Dashboard = lazyWithChunkRecovery(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })), "dashboard");
const WorkQueue = lazyWithChunkRecovery(() => import("./pages/WorkQueue").then(module => ({ default: module.WorkQueue })), "work-queue");
const Leads = lazyWithChunkRecovery(() => import("./pages/Leads").then(module => ({ default: module.Leads })), "leads");
const Pipeline = lazyWithChunkRecovery(() => import("./pages/Pipeline").then(module => ({ default: module.Pipeline })), "pipeline");
const Products = lazyWithChunkRecovery(() => import("./pages/Products").then(module => ({ default: module.Products })), "products");
const Proposals = lazyWithChunkRecovery(() => import("./pages/Proposals").then(module => ({ default: module.Proposals })), "proposals");
const Customers = lazyWithChunkRecovery(() => import("./pages/Customers").then(module => ({ default: module.Customers })), "customers");
const Tickets = lazyWithChunkRecovery(() => import("./pages/Tickets").then(module => ({ default: module.Tickets })), "tickets");
const Settings = lazyWithChunkRecovery(() => import("./pages/Settings").then(module => ({ default: module.Settings })), "settings");
const NotFound = lazyWithChunkRecovery(() => import("./pages/NotFound").then(module => ({ default: module.NotFound })), "not-found");
const LeadCapture = lazyWithChunkRecovery(() => import("./pages/LeadCapture").then(module => ({ default: module.LeadCapture })), "lead-capture");
const ProposalView = lazyWithChunkRecovery(() => import("./pages/ProposalView").then(module => ({ default: module.ProposalView })), "proposal-view");

const ADMIN: Role[] = ["super_admin", "workspace_admin"];
const SALES: Role[] = [...ADMIN, "sales"];
const REVENUE_OPERATIONS: Role[] = [...SALES, "operations"];
const STAFF: Role[] = [...SALES, "operations", "support"];

function RouteFallback() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">Loading…</div>;
}

function canAccess(activeRole: Role, allowed: Role[]) {
  return activeRole === "super_admin" || allowed.includes(activeRole);
}

function PrivatePage({ pathname, activeRole }: { pathname: string; activeRole: Role }): ReactNode {
  const routes: Record<string, { element: ReactNode; roles: Role[] }> = {
    "/": { element: <Dashboard />, roles: STAFF },
    "/queue": { element: <WorkQueue />, roles: REVENUE_OPERATIONS },
    "/leads": { element: <Leads />, roles: SALES },
    "/pipeline": { element: <Pipeline />, roles: SALES },
    "/proposals": { element: <Proposals />, roles: SALES },
    "/products": { element: <Products />, roles: STAFF },
    "/customers": { element: <Customers />, roles: STAFF },
    "/tickets": { element: <Tickets />, roles: STAFF },
    "/settings": { element: <Settings />, roles: ADMIN },
    "/unauthorized": { element: <Unauthorized />, roles: STAFF },
  };
  const route = routes[pathname];
  if (!route) return <NotFound />;
  return canAccess(activeRole, route.roles) ? route.element : <Unauthorized />;
}

function ApplicationRoutes() {
  const { pathname } = useLocation();
  const user = useAuthStore(state => state.user);
  const workspace = useAuthStore(state => state.workspace);
  const workspaceRoles = useAuthStore(state => state.workspaceRoles);
  const loading = useAuthStore(state => state.loading);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);

  if (pathname === "/capture") return <LeadCapture />;
  if (pathname.startsWith("/p/")) return <ProposalView />;

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">Loading application…</div>;
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-3 rounded-xl border border-red-100 bg-white p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Unable to open the workspace</h1>
          <p className="rounded-lg bg-slate-50 p-3 text-left text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }
  if (!user) return <Login />;

  const activeRole = workspace ? workspaceRoles[workspace.id] || user.role : user.role;
  return <AppLayout><PrivatePage pathname={pathname} activeRole={activeRole} /></AppLayout>;
}

export default function App() {
  const initAuth = useAuthStore(state => state.initAuth);
  useEffect(() => initAuth(), [initAuth]);

  return (
    <GlobalErrorBoundary>
      <RouterProvider>
        <Suspense fallback={<RouteFallback />}><ApplicationRoutes /></Suspense>
      </RouterProvider>
    </GlobalErrorBoundary>
  );
}
