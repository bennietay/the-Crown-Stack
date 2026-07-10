/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { User, Settings, Lead } from "./types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { initDb, localDb } from "./db/localDb";
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import LeadsManager from "./components/LeadsManager";
import WebinarFunnel from "./components/WebinarFunnel";
import ProductsManager from "./components/ProductsManager";
import MoreTab from "./components/MoreTab";
import SettingsTab from "./components/SettingsTab";
import { getSupabaseUserName, supabase, supabaseConfigured } from "./db/supabase";
import { pullFromSupabase } from "./db/supabaseSync";

import { 
  Calendar, 
  Users, 
  Tv, 
  ShoppingBag, 
  Grid, 
  Sliders,
  LogOut,
  TrendingUp,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Today");
  
  // Cross-navigation states
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [addLeadTrigger, setAddLeadTrigger] = useState(false);

  useEffect(() => {
    // Bootstrap local database sandbox
    initDb();

    const restoreLocalDemo = () => {
      const storedUser = localStorage.getItem("pf_user");
      if (!storedUser) return false;
      const parsedUser = JSON.parse(storedUser) as User;
      if (parsedUser.id !== "local-demo") return false;
      setUser(parsedUser);
      const storedSettings = localDb.getSettings();
      if (storedSettings && storedSettings.compliance_accepted) {
        setSettings(storedSettings);
      }
      return true;
    };

    const applySupabaseUser = async (supabaseUser: SupabaseUser) => {
      const loggedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name: getSupabaseUserName(supabaseUser)
      };
      setUser(loggedUser);
      localStorage.setItem("pf_user", JSON.stringify(loggedUser));
      await pullFromSupabase();

      const storedSettings = localDb.getSettings();
      if (storedSettings && storedSettings.compliance_accepted) {
        setSettings(storedSettings);
      }
    };

    if (!supabaseConfigured || !supabase) {
      restoreLocalDemo();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        applySupabaseUser(data.session.user);
      } else {
        restoreLocalDemo();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applySupabaseUser(session.user);
      } else if (!restoreLocalDemo()) {
        setUser(null);
        setSettings(null);
        localStorage.removeItem("pf_user");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    const storedSettings = localDb.getSettings();
    if (storedSettings && storedSettings.compliance_accepted) {
      setSettings(storedSettings);
    }
  };

  const handleOnboardingComplete = (finalSettings: Settings) => {
    setSettings(finalSettings);
  };

  const handleLogout = async () => {
    if (window.confirm("Do you want to sign out from ProspectFlow?")) {
      try {
        if (supabase) {
          await supabase.auth.signOut();
        }
        localStorage.removeItem("pf_user");
        setUser(null);
        setSettings(null);
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
  };

  const handleNavigateToLeadDetail = (lead: Lead) => {
    setSelectedLeadForDetail(lead);
    setActiveTab("Leads");
  };

  const handleTriggerAddLead = () => {
    setAddLeadTrigger(true);
    setActiveTab("Leads");
  };

  // Guard: User is not authenticated
  if (!user) {
    return <Login userEmail="" onLoginSuccess={handleLoginSuccess} />;
  }

  // Guard: Compliance terms & Profile parameters not completed
  if (!settings) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-[100dvh] bg-[#f5f5f5] text-[#1a1a1a] flex flex-col md:flex-row font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION (For Desktop & Tablet) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-full shrink-0">
        <div className="p-6 space-y-6">
          {/* Brand header */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-none text-gray-950">ProspectFlow</h1>
              <span className="text-[9px] text-blue-600 font-bold tracking-wide">MY SOLO GROWTH</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-4">
            {[
              { id: "Today", label: "Today Checklist", icon: Calendar },
              { id: "Leads", label: "Leads Pipeline", icon: Users },
              { id: "Webinar", label: "Webinar CMS", icon: Tv },
              { id: "Products", label: "Products & Orders", icon: ShoppingBag },
              { id: "More", label: "More Modules", icon: Grid },
              { id: "Settings", label: "Portal Settings", icon: Sliders }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  id={`desktop-sidebar-nav-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center space-x-3 transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Block Footer */}
        <div className="p-4 border-t border-gray-100 space-y-3 shrink-0 mt-auto">
          <div className="flex items-center space-x-2.5 p-3 bg-gray-50 rounded-2xl">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-white text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
              {settings.name[0]}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-bold truncate text-gray-900">{settings.name}</p>
              <p className="text-[10px] text-gray-500 truncate leading-none">{settings.email}</p>
            </div>
          </div>
          <button
            id="desktop-logout-btn"
            onClick={handleLogout}
            className="w-full py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Portal</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* TOP HEADER BAR (Mobile Only) */}
        <header className="md:hidden bg-white text-gray-900 px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-200 z-40">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xs text-white">
              P
            </div>
            <span className="font-bold text-xs tracking-tight text-gray-950">{settings.brand_name || "ProspectFlow MY"}</span>
          </div>
          <button
            id="mobile-logout-btn"
            onClick={handleLogout}
            className="p-1 text-gray-500 hover:text-red-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* COMPLIANCE FOOTER / SCALABILITY INDICATOR */}
        <div className="hidden md:flex fixed bottom-4 right-4 bg-white/95 backdrop-blur-xs py-1.5 px-3 rounded-full border border-gray-200 text-[10px] text-gray-500 font-mono shadow-sm z-50">
          <span>Active Focus: </span>
          <span className="font-bold text-gray-700 ml-1">Launch Mode</span>
          {settings.scale_mode && <span className="text-blue-600 font-bold ml-1">• Scale Enabled</span>}
        </div>

        {/* CENTRAL SCROLLABLE CONTENT BODY */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 w-full pb-24 md:pb-8">
          <div className="w-full max-w-7xl mx-auto">
            {activeTab === "Today" && (
              <Dashboard 
                settings={settings} 
                onNavigateToTab={setActiveTab} 
                onSelectLeadForDetail={handleNavigateToLeadDetail}
                onAddLeadTrigger={handleTriggerAddLead}
              />
            )}
            {activeTab === "Leads" && (
              <LeadsManager 
                settings={settings} 
                selectedLeadFromOutside={selectedLeadForDetail}
                onClearSelectedLead={() => setSelectedLeadForDetail(null)}
                onAddLeadTrigger={addLeadTrigger}
                onResetAddLeadTrigger={() => setAddLeadTrigger(false)}
              />
            )}
            {activeTab === "Webinar" && (
              <WebinarFunnel settings={settings} />
            )}
            {activeTab === "Products" && (
              <ProductsManager settings={settings} />
            )}
            {activeTab === "More" && (
              <MoreTab settings={settings} onUpdateSettings={setSettings} />
            )}
            {activeTab === "Settings" && (
              <SettingsTab settings={settings} onUpdateSettings={setSettings} />
            )}
          </div>
        </main>

        {/* FLOATING BOTTOM NAV BAR (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 py-2 px-3 flex items-center overflow-x-auto overflow-y-hidden z-40" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          <style dangerouslySetInnerHTML={{__html: `
            nav::-webkit-scrollbar { display: none; }
          `}} />
          {[
            { id: "Today", label: "Today", icon: Calendar },
            { id: "Leads", label: "Leads", icon: Users },
            { id: "Webinar", label: "Webinar", icon: Tv },
            { id: "Products", label: "Products", icon: ShoppingBag },
            { id: "More", label: "More", icon: Grid },
            { id: "Settings", label: "Settings", icon: Sliders }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                id={`mobile-bottom-nav-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-shrink-0 w-[72px] flex flex-col items-center justify-center space-y-1 focus:outline-none"
              >
                <div className={`p-1.5 rounded-full transition-transform ${
                  isActive ? "text-blue-600 bg-blue-50 scale-110" : "text-gray-500 hover:bg-gray-100"
                }`}>
                  <IconComp className="w-5 h-5" />
                </div>
                <span className={`text-[9px] font-bold tracking-wide ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
