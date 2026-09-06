import React, { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@/src/lib/router";
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
import { businessContexts, businessOwnsRoute, useBusinessStore } from "@/src/store/businessStore";
import { cn } from "@/src/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const workspace = useAuthStore(state => state.workspace);
  const initWorkspace = useDataStore(state => state.initWorkspace);
  const data = useDataStore();
  const fetchSettings = useSettingsStore(state => state.fetchSettings);
  const settingsLoading = useSettingsStore(state => state.loading);
  const settingsError = useSettingsStore(state => state.error);
  const location = useLocation();
  const navigate = useNavigate();
  const activeBusiness = useBusinessStore(state => state.activeBusiness);
  const businessContext = businessContexts.find(context => context.id === activeBusiness) || businessContexts[0];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const searchResults = normalizedSearch.length < 2 ? [] : [
    ...data.leads.map(row => ({ id: row.id, type: "Lead", title: row.contactName, detail: row.companyName || row.email, href: "/leads" })),
    ...data.opportunities.map(row => ({ id: row.id, type: "Opportunity", title: row.name || row.title || "Opportunity", detail: row.stage, href: "/pipeline" })),
    ...data.proposals.map(row => ({ id: row.id, type: "Proposal", title: row.title || row.id, detail: row.status, href: "/proposals" })),
    ...data.customers.map(row => ({ id: row.id, type: "Customer", title: row.name, detail: row.email, href: "/customers" })),
    ...data.diamondProspects.map(row => ({ id: row.id, type: "Amway", title: row.name, detail: row.prospectType, href: "/diamond" })),
  ].filter(row => `${row.title} ${row.detail} ${row.type}`.toLowerCase().includes(normalizedSearch)).slice(0, 8);

  const openSearchResult = (href: string) => { setSearchQuery(""); navigate(href); };

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

  // Never leave a user on a route belonging to another workspace. This also
  // protects direct URL entry after switching workspaces.
  useEffect(() => {
    if (!businessOwnsRoute(activeBusiness, location.pathname)) {
      navigate(businessContexts.find(context => context.id === activeBusiness)?.href || "/");
    }
  }, [activeBusiness, location.pathname, navigate]);

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
              {businessContext.name}
            </h1>

            <span className="hidden sm:inline rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200">
              {activeBusiness === "all" ? "Combined business view" : "Business workspace"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative hidden xl:flex items-center rounded-full bg-slate-100 px-3.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && searchResults[0]) openSearchResult(searchResults[0].href); if (event.key === "Escape") setSearchQuery(""); }} placeholder="Search workspace…" aria-label="Search workspace" className="ml-2 w-40 bg-transparent text-xs focus:outline-none" />
              {normalizedSearch.length >= 2 && <div className="absolute right-0 top-10 z-50 w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">{searchResults.length ? searchResults.map(result => <button key={`${result.type}-${result.id}`} type="button" onClick={() => openSearchResult(result.href)} className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"><div><p className="text-sm font-semibold text-slate-900">{result.title}</p><p className="text-xs text-slate-500">{result.detail}</p></div><span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{result.type}</span></button>) : <p className="p-5 text-center text-xs text-slate-500">No workspace record matches “{searchQuery}”.</p>}</div>}
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
          {workspace?.id && (settingsLoading || settingsError) ? (
            <div className={cn(
              "mb-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
              settingsError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-500"
            )}>
              <span>{settingsError ? "Workspace settings could not be refreshed. Default settings are active." : "Refreshing workspace settings…"}</span>
              {settingsError ? (
                <button type="button" onClick={() => void fetchSettings(workspace.id)} className="font-semibold underline underline-offset-2 hover:no-underline">
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}
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
