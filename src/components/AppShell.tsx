import {
  BarChart3,
  BookOpen,
  Bolt,
  Bot,
  CheckSquare,
  Flame,
  Gauge,
  Home,
  Library,
  LogOut,
  Menu,
  Moon,
  MessageSquare,
  Network,
  PlayCircle,
  Settings,
  Sun,
  Target,
  Users,
  X,
  Zap
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { LegalFooter } from "./LegalFooter";
import type { DupliosUserProfile } from "../types/tenant";
import { translate, type LanguageCode } from "../lib/i18n";

interface AppShellProps {
  activeView: string;
  onViewChange: (view: string) => void;
  profile?: DupliosUserProfile | null;
  onSignOut?: () => void;
  canAccessSuperadmin?: boolean;
  theme: "bright" | "dark";
  onToggleTheme: () => void;
  audienceMode: "new_joiner" | "growing" | "leader";
  language: LanguageCode;
  children: ReactNode;
}

const navGroups: Array<{
  label: string;
  modes: Array<"new_joiner" | "growing" | "leader">;
  items: Array<{
    id: string;
    labelKey: Parameters<typeof translate>[1];
    icon: typeof Home;
    modes: Array<"new_joiner" | "growing" | "leader">;
  }>;
}> = [
  {
    label: "Start",
    modes: ["new_joiner", "growing", "leader"],
    items: [
      { id: "dashboard", labelKey: "nav.home", icon: Home, modes: ["new_joiner", "growing", "leader"] },
      { id: "fast-start-os", labelKey: "nav.fastStart", icon: Flame, modes: ["new_joiner", "growing", "leader"] },
      { id: "growth-crm", labelKey: "nav.growthCrm", icon: Users, modes: ["growing", "leader"] },
      { id: "playbook", labelKey: "nav.playbook", icon: Target, modes: ["new_joiner", "growing", "leader"] },
      { id: "settings", labelKey: "nav.settings", icon: Settings, modes: ["new_joiner", "growing", "leader"] }
    ]
  },
  {
    label: "Grow",
    modes: ["growing", "leader"],
    items: [
      { id: "sales-sprint", labelKey: "nav.salesSprint", icon: Zap, modes: ["growing", "leader"] },
      { id: "resource-vault", labelKey: "nav.resourceVault", icon: BookOpen, modes: ["new_joiner", "growing", "leader"] },
      { id: "tasks", labelKey: "nav.tasks", icon: CheckSquare, modes: ["growing", "leader"] },
      { id: "ai-scripts", labelKey: "nav.aiScripts", icon: MessageSquare, modes: ["growing", "leader"] },
      { id: "linkedin", labelKey: "nav.socialOutreach", icon: Network, modes: ["growing", "leader"] }
    ]
  },
  {
    label: "Scale",
    modes: ["leader"],
    items: [
      { id: "duplication", labelKey: "nav.networkPv", icon: Library, modes: ["leader"] },
      { id: "team-metrics", labelKey: "nav.teamMetrics", icon: BarChart3, modes: ["leader"] },
      { id: "team-hub", labelKey: "nav.teamHub", icon: Users, modes: ["leader"] },
      { id: "automation", labelKey: "nav.automation", icon: Bolt, modes: ["leader"] }
    ]
  }
];

export function AppShell({
  activeView,
  onViewChange,
  profile,
  onSignOut,
  canAccessSuperadmin = false,
  theme,
  onToggleTheme,
  audienceMode,
  language,
  children
}: AppShellProps) {
  const isPublic =
    activeView === "sales" ||
    activeView === "login" ||
    activeView === "activate" ||
    activeView === "legal" ||
    activeView.startsWith("legal:");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleGroups = navGroups
    .filter((group) => group.modes.includes(audienceMode))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.modes.includes(audienceMode))
    }))
    .filter((group) => group.items.length > 0);
  const changeView = (view: string) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  if (isPublic) {
    return (
      <main className="min-h-screen bg-crown-navy text-white">
        <nav className="sticky top-0 z-20 border-b border-white/10 bg-crown-navy/92 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <button onClick={() => onViewChange("sales")} className="flex items-center gap-3 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-crown-gold text-crown-navy">
                <Network size={22} />
              </span>
              <span>
                <span className="block font-semibold text-white">Duplios</span>
                <span className="text-xs uppercase tracking-[0.16em] text-crown-mist">
                  Enterprise duplication OS
                </span>
              </span>
            </button>
            <button
              onClick={() => onViewChange("login")}
              className="h-10 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
            >
              {translate(language, "app.login")}
            </button>
          </div>
        </nav>
        <div className="pb-20 lg:pb-0">{children}</div>
        <LegalFooter
          onNavigate={(targetId) => {
            onViewChange(targetId ? `legal:${targetId}` : "legal");
          }}
        />
      </main>
    );
  }

  return (
    <main className={`app-theme-${theme} min-h-screen`}>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[208px] border-r lg:block">
        <div className="flex h-full flex-col px-3 py-4">
          <div className="mb-5 flex items-center justify-between gap-2 px-2">
            <button onClick={() => changeView("dashboard")} className="flex min-w-0 items-center gap-2">
              <span className="app-brand-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
                <Network size={18} />
              </span>
              <span className="app-strong truncate text-sm font-black tracking-tight">Duplios</span>
            </button>
            {profile ? (
              <button
                type="button"
                onClick={onSignOut}
                aria-label={translate(language, "app.signOut")}
                className="app-theme-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition hover:opacity-80"
              >
                <LogOut size={15} />
              </button>
            ) : null}
          </div>

          <nav className="space-y-7">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                <p className="app-muted mb-3 px-2 text-[10px] font-black uppercase tracking-[0.28em]">
                  {translate(language, group.label === "Start" ? "nav.start" : group.label === "Grow" ? "nav.grow" : "nav.scale")}
                </p>
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => changeView(item.id)}
                        className={`flex h-[42px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${
                          active
                            ? "app-nav-active"
                            : "app-nav-idle"
                        }`}
                      >
                        <Icon size={17} />
                        <span className="flex-1">{translate(language, item.labelKey)}</span>
                        {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="app-coach mt-auto rounded-2xl border p-3">
            {canAccessSuperadmin ? (
              <button
                onClick={() => changeView("superadmin")}
                className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-crown-gold px-3 text-xs font-black uppercase tracking-[0.1em] text-crown-navy transition hover:bg-crown-champagne"
              >
                <Network size={15} />
                Superadmin Portal
              </button>
            ) : null}
            <button
              onClick={onToggleTheme}
              className="app-theme-toggle mb-3 flex h-9 w-full items-center justify-between rounded-xl px-3 text-xs font-black uppercase tracking-[0.12em]"
            >
              <span>{translate(language, theme === "bright" ? "app.bright" : "app.dark")}</span>
              {theme === "bright" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="mb-2 flex items-center gap-2">
              <Bot size={16} className="app-accent-text" />
              <p className="app-accent-text text-xs font-black uppercase tracking-[0.16em]">{translate(language, "app.coach")}</p>
            </div>
            <p className="app-soft-text text-xs leading-5">
              {profile ? profile.displayName : "Login"} has 5 growth actions ready today.
            </p>
            {profile ? (
              <button
                onClick={onSignOut}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 text-xs font-black uppercase tracking-[0.12em] text-red-300 transition hover:bg-red-500/10"
              >
                <LogOut size={15} />
                {translate(language, "app.signOut")}
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="lg:pl-[208px]">
        <div className="app-mobilebar sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => changeView("dashboard")} className="flex min-w-0 items-center gap-2 font-black">
            <span className="app-brand-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
              <Network size={18} />
            </span>
            <span className="truncate">Duplios</span>
          </button>
          <div className="flex items-center gap-2">
            {profile ? (
              <button
                type="button"
                onClick={onSignOut}
                aria-label={translate(language, "app.signOut")}
                className="app-theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-lg border"
              >
                <LogOut size={16} />
              </button>
            ) : null}
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="app-theme-toggle inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span>{translate(language, "nav.menu")}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/35"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside
              id="mobile-navigation"
              className="app-sidebar absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col overflow-y-auto border-r px-4 py-4 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <button onClick={() => changeView("dashboard")} className="flex items-center gap-2">
                  <span className="app-brand-icon flex h-9 w-9 items-center justify-center rounded-lg text-white">
                    <Network size={18} />
                  </span>
                  <span className="app-strong text-sm font-black">Duplios</span>
                </button>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="app-theme-toggle flex h-10 w-10 items-center justify-center rounded-lg border"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {canAccessSuperadmin ? (
                <button
                  onClick={() => changeView("superadmin")}
                  className="mb-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-crown-gold px-3 text-sm font-black uppercase tracking-[0.1em] text-crown-navy transition hover:bg-crown-champagne"
                >
                  <Network size={16} />
                  Superadmin Portal
                </button>
              ) : null}

              <nav className="space-y-6">
                {visibleGroups.map((group) => (
                  <div key={group.label}>
                    <p className="app-muted mb-3 px-1 text-[10px] font-black uppercase tracking-[0.24em]">
                      {translate(language, group.label === "Start" ? "nav.start" : group.label === "Grow" ? "nav.grow" : "nav.scale")}
                    </p>
                    <div className="grid gap-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = activeView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => changeView(item.id)}
                            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition ${
                              active ? "app-nav-active" : "app-nav-idle"
                            }`}
                          >
                            <Icon size={18} />
                            <span className="flex-1">{translate(language, item.labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <button
                onClick={onToggleTheme}
                className="app-theme-toggle mt-6 flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-xs font-black uppercase tracking-[0.12em]"
              >
                <span>{translate(language, theme === "bright" ? "app.bright" : "app.dark")}</span>
                {theme === "bright" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {profile ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut?.();
                  }}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 text-sm font-black uppercase tracking-[0.12em] text-red-300 transition hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  {translate(language, "app.signOut")}
                </button>
              ) : null}
            </aside>
          </div>
        ) : null}

        {children}

        <nav className="app-mobilebar fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] lg:hidden">
          {(audienceMode === "leader"
            ? [
                { id: "dashboard", labelKey: "nav.home", icon: Home },
                { id: "duplication", labelKey: "nav.networkPv", icon: Library },
                { id: "team-metrics", labelKey: "nav.teamMetrics", icon: BarChart3 },
                { id: "settings", labelKey: "nav.settings", icon: Settings }
              ]
            : audienceMode === "growing"
              ? [
                  { id: "dashboard", labelKey: "nav.home", icon: Home },
                  { id: "growth-crm", labelKey: "nav.growthCrm", icon: Users },
                  { id: "resource-vault", labelKey: "nav.resourceVault", icon: BookOpen },
                  { id: "settings", labelKey: "nav.settings", icon: Settings }
                ]
              : [
                  { id: "dashboard", labelKey: "nav.today", icon: Home },
                  { id: "fast-start-os", labelKey: "nav.fastStart", icon: Flame },
                  { id: "playbook", labelKey: "nav.playbook", icon: Target },
                  { id: "settings", labelKey: "nav.settings", icon: Settings }
                ]).map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => changeView(item.id)}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black ${
                  active ? "app-nav-active" : "app-nav-idle"
                }`}
              >
                <Icon size={18} />
                {translate(language, item.labelKey as Parameters<typeof translate>[1])}
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
