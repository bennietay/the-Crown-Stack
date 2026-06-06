import { useEffect, useMemo, useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { AppShell } from "./components/AppShell";
import { LoginAccessManagement } from "./features/access/LoginAccessManagement";
import { ActivationPage } from "./features/auth/ActivationPage";
import { AuthPage } from "./features/auth/AuthPage";
import { SalesPageCMS } from "./features/cms/SalesPageCMS";
import { Dashboard } from "./features/dashboard/Dashboard";
import { DuplicationEngine } from "./features/duplication/DuplicationEngine";
import { FastStartOS } from "./features/fast-start-os/FastStartOS";
import { NewJoinerView } from "./features/new-joiner/NewJoinerView";
import { SalesPage } from "./features/sales/SalesPage";
import { SetupWizard } from "./features/setup/SetupWizard";
import { AppSettings } from "./features/settings/AppSettings";
import { SuperadminConsole } from "./features/superadmin/SuperadminConsole";
import { SuperadminPortalShell } from "./features/superadmin/SuperadminPortalShell";
import { TodayActionConsole } from "./features/today/TodayActionConsole";
import { FeatureWorkspace } from "./features/workspace/FeatureWorkspace";
import { LegalDisclaimersPage } from "./features/legal/LegalDisclaimersPage";
import { WebinarRegistrationPage, WebinarReplayPage, WebinarThankYouPage } from "./features/webinar/WebinarFunnelPages";
import {
  demoDownlineProfile,
  demoAccessUsers,
  demoAdCampaigns,
  demoAutomationSequences,
  demoAppointments,
  demoComplianceGuardrails,
  demoContactPrompts,
  demoInvites,
  demoFastStartPlan,
  demoFollowUpSteps,
  demoLeads,
  demoLegalDocuments,
  demoLocationPricing,
  demoNotificationRules,
  demoOutreachTasks,
  demoPlaybookPackages,
  demoPowerHourActions,
  demoProfile,
  demoSalesPage,
  demoSeoSettings,
  demoScripts,
  demoScriptPersonalizations,
  demoSponsorCheckIns,
  demoSettings,
  demoSuperadminProfile,
  demoTeamNodes,
  demoTenants,
  demoTrackingSettings,
  demoTrafficRevenue,
  demoMomentumScores
} from "./lib/mockData";
import { createCheckoutSession, createPublicCheckoutSession } from "./lib/api";
import { languageOptions, type LanguageCode } from "./lib/i18n";
import { applySeo } from "./lib/seo";
import { applyTracking } from "./lib/tracking";
import type { SubscriptionTier } from "./types/subscription";

export default function App() {
  return (
    <AuthProvider>
      <DupliosApp />
    </AuthProvider>
  );
}

function DupliosApp() {
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const publicViews = ["sales", "login", "activate", "legal", "webinar-register", "webinar-thank-you", "webinar-replay"];
  const initialView = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") ?? "sales";
  }, []);
  const [view, setView] = useState(initialView);
  const [theme, setTheme] = useState<"bright" | "dark">(() => {
    const saved = window.localStorage.getItem("duplios-theme");
    return saved === "dark" ? "dark" : "bright";
  });
  const [audienceMode, setAudienceMode] = useState<"new_joiner" | "growing" | "leader">(() => {
    const saved = window.localStorage.getItem("duplios-audience-mode");
    return saved === "new_joiner" || saved === "growing" || saved === "leader" ? saved : "new_joiner";
  });
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const saved = window.localStorage.getItem("duplios-language");
    return saved === "en" || saved === "ms" || saved === "zh" || saved === "other" ? saved : "en";
  });
  const sessionId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("session_id");
  }, []);
  const [authMode, setAuthMode] = useState<"signin" | "create">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const [postSignInRoutingPending, setPostSignInRoutingPending] = useState(false);
  const [setupComplete, setSetupComplete] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("duplios-setup") ?? "{}").completed === true;
    } catch {
      return false;
    }
  });
  const { profile, profileError, session, loading, signOut } = useAuth();
  const isLegalView = view === "legal" || view.startsWith("legal:");
  const isProtectedView = !publicViews.includes(view) && !isLegalView;
  const canUseDemoData = demoMode || Boolean(session);
  const activeProfile = profile ?? (demoMode ? demoProfile : null);
  const effectiveRole = activeProfile?.isSuperadmin ? "superadmin" : activeProfile?.role;
  const cleanSalesPage = useMemo(
    () => ({
      ...demoSalesPage,
      testimonials: demoMode ? demoSalesPage.testimonials : []
    }),
    [demoMode]
  );
  const appData = useMemo(
    () => ({
      tenants: demoMode ? demoTenants : [],
      settings: demoSettings,
      accessUsers: demoMode ? demoAccessUsers : [],
      invites: demoMode ? demoInvites : [],
      salesPage: cleanSalesPage,
      legalDocuments: demoLegalDocuments,
      trafficRevenue: demoMode ? demoTrafficRevenue : [],
      locationPricing: demoLocationPricing,
      notificationRules: demoNotificationRules,
      trackingSettings: demoTrackingSettings,
      seoSettings: demoSeoSettings,
      adCampaigns: demoMode ? demoAdCampaigns : [],
      scripts: demoMode ? demoScripts : [],
      teamNodes: demoMode ? demoTeamNodes : [],
      leads: demoMode ? demoLeads : [],
      followUpSteps: demoMode ? demoFollowUpSteps : [],
      automationSequences: demoMode ? demoAutomationSequences : [],
      outreachTasks: demoMode ? demoOutreachTasks : [],
      fastStartPlan: demoMode ? demoFastStartPlan : [],
      contactPrompts: demoMode ? demoContactPrompts : [],
      powerHourActions: demoMode ? demoPowerHourActions : [],
      sponsorCheckIns: demoMode ? demoSponsorCheckIns : [],
      playbookPackages: demoMode ? demoPlaybookPackages : [],
      scriptPersonalizations: demoMode ? demoScriptPersonalizations : [],
      appointments: demoMode ? demoAppointments : [],
      momentumScores: demoMode ? demoMomentumScores : [],
      complianceGuardrails: demoMode ? demoComplianceGuardrails : [],
      downlineProfile: demoMode ? demoDownlineProfile : activeProfile
    }),
    [activeProfile, cleanSalesPage, demoMode]
  );
  const canAccessSuperadmin =
    Boolean(profile?.isSuperadmin) ||
    profile?.role === "superadmin" ||
    profile?.role === "admin";

  useEffect(() => {
    applyTracking(demoTrackingSettings);
    applySeo(demoSeoSettings);
  }, []);

  useEffect(() => {
    const selectedLanguage = languageOptions.find((option) => option.code === language);
    document.documentElement.lang = selectedLanguage?.htmlLang ?? "en";
  }, [language]);

  useEffect(() => {
    if (!view.startsWith("legal:")) return;
    const targetId = view.split(":")[1];
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [view]);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "bright" ? "dark" : "bright";
      window.localStorage.setItem("duplios-theme", nextTheme);
      return nextTheme;
    });
  };

  const requireSession = (nextView: string) => {
    setView(session || demoMode ? nextView : "login");
  };

  const changeAudienceMode = (mode: "new_joiner" | "growing" | "leader") => {
    setAudienceMode(mode);
    window.localStorage.setItem("duplios-audience-mode", mode);
  };

  const changeLanguage = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("duplios-language", nextLanguage);
  };

  const changeView = (nextView: string) => {
    if (nextView === "login") {
      setAuthMode("signin");
    }
    setView(nextView);
  };

  const handleSignedIn = (_email: string) => {
    setPostSignInRoutingPending(true);
    setView("dashboard");
  };

  useEffect(() => {
    if (!postSignInRoutingPending || !profile) return;

    if (profile.role === "superadmin" || profile.role === "admin" || profile.isSuperadmin) {
      changeAudienceMode("leader");
      setView("superadmin");
    } else {
      setView("dashboard");
    }

    setPostSignInRoutingPending(false);
  }, [postSignInRoutingPending, profile]);

  const startCheckout = async (tier: SubscriptionTier, email?: string, countryCode?: string) => {
    try {
      if (!session || !profile) {
        const checkoutEmail = email?.trim().toLowerCase();

        if (!checkoutEmail) {
          setNotice("Enter a work email before starting checkout, or create a free trial workspace first.");
          return;
        }

        if (demoMode) {
          setNotice("Demo checkout skipped. Showing the trial workspace preview.");
          setView("dashboard");
          return;
        }

        const { url } = await createPublicCheckoutSession(checkoutEmail, tier, countryCode);
        window.location.href = url;
        return;
      }

      const { url } = await createCheckoutSession(profile.tenantId, tier);
      window.location.href = url;
    } catch (error) {
      if (demoMode) {
        setNotice("Demo checkout fallback: Stripe is not configured locally, so the trial workspace opened instead.");
        setView("dashboard");
        return;
      }

      setNotice(error instanceof Error ? error.message : "Unable to start checkout.");
    }
  };

  const renderSuperadmin = () => (
    <SuperadminConsole
      tenants={appData.tenants}
      settings={appData.settings}
      accessUsers={appData.accessUsers}
      invites={appData.invites}
      salesPage={appData.salesPage}
      legalDocuments={appData.legalDocuments}
      trafficRevenue={appData.trafficRevenue}
      locationPricing={appData.locationPricing}
      notificationRules={appData.notificationRules}
      trackingSettings={appData.trackingSettings}
      seoSettings={appData.seoSettings}
      adCampaigns={appData.adCampaigns}
    />
  );

  const renderView = () => {
    const currentWebinarId = new URLSearchParams(window.location.search).get("webinar");

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-crown-navy px-4 text-center text-crown-champagne">
          Preparing your workspace...
        </div>
      );
    }

    if (isProtectedView && !canUseDemoData) {
      return <AuthPage initialMode={authMode} onBack={() => setView("sales")} onSignedIn={handleSignedIn} />;
    }

    if (isProtectedView && session && !activeProfile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-crown-navy px-4 text-center">
          <div className="max-w-xl rounded-lg border border-white/10 bg-crown-ink p-6 shadow-glow">
            <p className="text-lg font-semibold text-white">
              {profileError ? "Profile setup is missing" : "Preparing your workspace profile..."}
            </p>
            {profileError ? (
              <>
                <p className="mt-3 text-sm leading-6 text-crown-champagne">{profileError}</p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-crown-navy p-4 text-left text-xs leading-6 text-crown-mist">
{`update profiles
set role = 'superadmin',
    is_superadmin = true,
    tier = 'empire',
    status = 'active'
where email = '${session.user.email ?? "your-email@example.com"}';`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    setView("login");
                  }}
                  className="mt-4 h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
                >
                  Sign in again after fixing profile
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm text-crown-champagne">Loading tenant role, plan, and access level...</p>
            )}
          </div>
        </div>
      );
    }

    if (
      isProtectedView &&
      activeProfile &&
      !setupComplete &&
      !activeProfile.isSuperadmin &&
      activeProfile.role !== "superadmin"
    ) {
      return <SetupWizard profile={activeProfile} onComplete={() => setSetupComplete(true)} />;
    }

    switch (view) {
      case "activate":
        return <ActivationPage sessionId={sessionId} onActivated={() => setView("dashboard")} />;
      case "login":
        return <AuthPage initialMode={authMode} onBack={() => setView("sales")} onSignedIn={handleSignedIn} />;
      case "legal":
        return <LegalDisclaimersPage documents={appData.legalDocuments} />;
      case "webinar-register":
        return (
          <WebinarRegistrationPage
            webinarId={currentWebinarId}
            onRegistered={(id) => {
              window.history.replaceState(null, "", `${window.location.pathname}?view=webinar-thank-you&webinar=${encodeURIComponent(id)}`);
              setView("webinar-thank-you");
            }}
          />
        );
      case "webinar-thank-you":
        return (
          <WebinarThankYouPage
            webinarId={currentWebinarId}
            onReplay={(id) => {
              window.history.replaceState(null, "", `${window.location.pathname}?view=webinar-replay&webinar=${encodeURIComponent(id)}`);
              setView("webinar-replay");
            }}
          />
        );
      case "webinar-replay":
        return <WebinarReplayPage webinarId={currentWebinarId} />;
      case "dashboard":
        if (effectiveRole === "new_joiner" || effectiveRole === "member") {
          return <TodayActionConsole profile={activeProfile ?? appData.downlineProfile ?? demoProfile} scripts={appData.scripts} leads={appData.leads} fastStartPlan={appData.fastStartPlan} onNavigate={setView} />;
        }

        if (effectiveRole === "leader") {
          return (
            <FeatureWorkspace
              feature="team-hub"
              leads={appData.leads}
              scripts={appData.scripts}
              outreachTasks={appData.outreachTasks}
              teamNodes={appData.teamNodes}
              automationSequences={appData.automationSequences}
              fastStartPlan={appData.fastStartPlan}
            />
          );
        }

        if (effectiveRole === "admin") {
          return (
            <FeatureWorkspace
              feature="automation"
              leads={appData.leads}
              scripts={appData.scripts}
              outreachTasks={appData.outreachTasks}
              teamNodes={appData.teamNodes}
              automationSequences={appData.automationSequences}
              fastStartPlan={appData.fastStartPlan}
            />
          );
        }

        return <Dashboard profile={activeProfile ?? demoProfile} scripts={appData.scripts} leads={appData.leads} onNavigate={setView} />;
      case "fast-start-os":
        return (
          <FastStartOS
            fastStartPlan={appData.fastStartPlan}
            contactPrompts={appData.contactPrompts}
            powerHourActions={appData.powerHourActions}
            sponsorCheckIns={appData.sponsorCheckIns}
            playbookPackages={appData.playbookPackages}
            scriptPersonalizations={appData.scriptPersonalizations}
            appointments={appData.appointments}
            momentumScores={appData.momentumScores}
            complianceGuardrails={appData.complianceGuardrails}
          />
        );
      case "cms":
        return <SalesPageCMS content={appData.salesPage} onPreview={() => setView("sales")} />;
      case "duplication":
        return (
          <DuplicationEngine
            scripts={appData.scripts}
            teamNodes={appData.teamNodes}
            leads={appData.leads}
            followUpSteps={appData.followUpSteps}
            automationSequences={appData.automationSequences}
            outreachTasks={appData.outreachTasks}
            fastStartPlan={appData.fastStartPlan}
          />
        );
      case "settings":
        return (
          <AppSettings
            profile={activeProfile ?? demoProfile}
            theme={theme}
            onToggleTheme={toggleTheme}
            audienceMode={audienceMode}
            onAudienceModeChange={changeAudienceMode}
            language={language}
            onLanguageChange={changeLanguage}
            onNavigate={setView}
          />
        );
      case "access":
        return <LoginAccessManagement users={appData.accessUsers} invites={appData.invites} />;
      case "growth-crm":
      case "playbook":
      case "sales-sprint":
      case "resource-vault":
      case "tasks":
      case "events":
      case "ai-scripts":
      case "linkedin":
      case "team-metrics":
      case "team-hub":
      case "automation":
        return (
          <FeatureWorkspace
            feature={view}
            leads={appData.leads}
            scripts={appData.scripts}
            outreachTasks={appData.outreachTasks}
            teamNodes={appData.teamNodes}
            automationSequences={appData.automationSequences}
            fastStartPlan={appData.fastStartPlan}
          />
        );
      case "superadmin":
        return renderSuperadmin();
      default:
        if (isLegalView) {
          return <LegalDisclaimersPage documents={appData.legalDocuments} />;
        }

        return (
          <SalesPage
            content={appData.salesPage}
            locationPricing={appData.locationPricing}
            onStart={() => requireSession("dashboard")}
            onCheckout={startCheckout}
          />
        );
    }
  };

  if (!loading && view === "superadmin" && canUseDemoData) {
    return (
      <SuperadminPortalShell
        profile={profile ?? (demoMode ? demoSuperadminProfile : null)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onBackToApp={() => {
          changeAudienceMode("leader");
          setView("dashboard");
        }}
        onSignOut={() => {
          void signOut();
          setView("sales");
        }}
      >
        {renderSuperadmin()}
      </SuperadminPortalShell>
    );
  }

  return (
    <AppShell
      activeView={isProtectedView && !canUseDemoData ? "login" : view}
      onViewChange={changeView}
      profile={profile ?? (demoMode ? demoProfile : null)}
      canAccessSuperadmin={canAccessSuperadmin}
      onSignOut={() => {
        void signOut();
        setView("sales");
      }}
      theme={theme}
      onToggleTheme={toggleTheme}
      audienceMode={audienceMode}
      language={language}
    >
      {notice ? (
        <div className="border-b border-crown-gold/20 bg-crown-gold/10 px-4 py-3 text-center text-sm text-crown-champagne">
          {notice}
        </div>
      ) : null}
      {renderView()}
    </AppShell>
  );
}
