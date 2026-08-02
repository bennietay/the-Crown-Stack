/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, ReactNode, Suspense, useEffect } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { RouterProvider, useLocation } from "./lib/router";
import { Login } from "./pages/Login";
import { Unauthorized } from "./pages/Unauthorized";
import { useAuthStore } from "./store/authStore";
import { Role } from "./types";

const Dashboard = lazy(() => import("./pages/Dashboard").then(module => ({ default: module.Dashboard })));
const WorkQueue = lazy(() => import("./pages/WorkQueue").then(module => ({ default: module.WorkQueue })));
const Leads = lazy(() => import("./pages/Leads").then(module => ({ default: module.Leads })));
const Pipeline = lazy(() => import("./pages/Pipeline").then(module => ({ default: module.Pipeline })));
const Products = lazy(() => import("./pages/Products").then(module => ({ default: module.Products })));
const Proposals = lazy(() => import("./pages/Proposals").then(module => ({ default: module.Proposals })));
const Customers = lazy(() => import("./pages/Customers").then(module => ({ default: module.Customers })));
const Tickets = lazy(() => import("./pages/Tickets").then(module => ({ default: module.Tickets })));
const Settings = lazy(() => import("./pages/Settings").then(module => ({ default: module.Settings })));
const NotFound = lazy(() => import("./pages/NotFound").then(module => ({ default: module.NotFound })));
const LeadCapture = lazy(() => import("./pages/LeadCapture").then(module => ({ default: module.LeadCapture })));
const ProposalView = lazy(() => import("./pages/ProposalView").then(module => ({ default: module.ProposalView })));

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
