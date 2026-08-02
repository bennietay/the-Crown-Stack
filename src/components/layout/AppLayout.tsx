import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "@/src/lib/router";
import { Sidebar } from "./Sidebar";
import { 
  Settings,
  Menu, 
  X, 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  FileText, 
  Search 
} from "lucide-react";
import { useAuthStore } from "@/src/store/authStore";
import { useDataStore } from "@/src/store/dataStore";
import { useSettingsStore } from "@/src/store/settingsStore";
import { cn } from "@/src/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const workspace = useAuthStore(state => state.workspace);
  const initWorkspace = useDataStore(state => state.initWorkspace);
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  const settingsLoading = useSettingsStore(state => state.loading);
  const settingsError = useSettingsStore(state => state.error);
  const loadedSettingsWorkspaceId = useSettingsStore(state => state.loadedWorkspaceId);
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (workspace?.id) {
      const unsubscribe = initWorkspace(workspace.id);
      void fetchSettings(workspace.id);
      return unsubscribe;
    }
  }, [workspace?.id, initWorkspace, fetchSettings]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (workspace?.id && (settingsLoading || loadedSettingsWorkspaceId !== workspace.id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">{settingsError ? "Workspace settings unavailable" : "Loading workspace settings…"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {settingsError || "Preparing the current pricing, lead scoring and proposal rules."}
          </p>
          {settingsError ? (
            <button
              type="button"
              onClick={() => void fetchSettings(workspace.id)}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Retry settings
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sliding Drawer */}
          <div className="relative z-10 w-72 max-w-[80vw] h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar onClose={() => setMobileMenuOpen(false)} className="w-full border-r-0" />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden w-full min-w-0">
        {/* Header */}
        <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open mobile menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="text-base sm:text-xl font-semibold text-slate-800 truncate">
              {workspace?.name || 'Workspace'}
            </h1>

            <span className="hidden sm:inline rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
              Secure workspace
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative hidden xl:flex items-center rounded-full bg-slate-100 px-3.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search..." className="ml-2 w-40 bg-transparent text-xs focus:outline-none" />
            </div>

            <Link
              to="/settings"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </header>

        {/* Viewport Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden items-center justify-around px-2 shadow-lg">
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors",
              location.pathname === "/" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/queue"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors",
              location.pathname === "/queue" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <CheckSquare className="h-5 w-5 mb-0.5" />
            <span>Queue</span>
          </Link>

          <Link
            to="/leads"
            className={cn(
              "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors",
              location.pathname === "/leads" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Users className="h-5 w-5 mb-0.5" />
            <span>Leads</span>
          </Link>

          <Link
              to="/proposals"
              className={cn(
                "flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium transition-colors",
                location.pathname === "/proposals" ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <FileText className="h-5 w-5 mb-0.5" />
              <span>Proposals</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full py-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <Menu className="h-5 w-5 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
      </main>

    </div>
  );
}
