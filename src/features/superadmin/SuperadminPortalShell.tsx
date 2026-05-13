import { ArrowLeft, LogOut, Moon, Network, ShieldCheck, Sun } from "lucide-react";
import type { DupliosUserProfile } from "../../types/tenant";

export function SuperadminPortalShell({
  profile,
  theme,
  onToggleTheme,
  onBackToApp,
  onSignOut,
  children
}: {
  profile: DupliosUserProfile | null;
  theme: "bright" | "dark";
  onToggleTheme: () => void;
  onBackToApp: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className={`app-theme-${theme} min-h-screen`}>
      <nav className="app-mobilebar sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="app-brand-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Network size={22} />
            </span>
            <div className="min-w-0">
              <p className="app-strong truncate text-lg font-semibold">Duplios Superadmin</p>
              <p className="app-soft-text truncate text-xs uppercase tracking-[0.16em]">
                Platform control portal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="app-theme-toggle flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
              <ShieldCheck size={16} className="app-accent-text" />
              {profile?.email ?? "Superadmin"}
            </div>
            <button
              type="button"
              onClick={onBackToApp}
              className="app-theme-toggle inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition hover:opacity-85"
            >
              <ArrowLeft size={16} />
              User App
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              className="app-theme-toggle inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition hover:opacity-85"
            >
              {theme === "bright" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "bright" ? "Bright" : "Dark"}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-crown-gold px-3 text-sm font-semibold text-crown-navy transition hover:bg-crown-champagne"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>
      </nav>
      {children}
    </main>
  );
}
