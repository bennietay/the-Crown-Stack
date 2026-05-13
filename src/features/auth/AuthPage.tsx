import { KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabaseConfigStatus } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { registerPublicAccount } from "../../lib/api";

interface AuthPageProps {
  initialMode?: "signin" | "create";
  onBack: () => void;
  onSignedIn?: (email: string) => void;
}

export function AuthPage({ initialMode = "signin", onBack, onSignedIn }: AuthPageProps) {
  const { signIn, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "create">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        await registerPublicAccount({
          email,
          password,
          displayName,
          tenantName: tenantName || undefined
        });
      }

      const message = await signIn(email, password);
      setError(message);
      if (!message) {
        onSignedIn?.(email.trim().toLowerCase());
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    setError(null);
    const message = await signInWithGoogle();
    setError(message);
    setLoading(false);
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
          Secure login
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-white sm:text-5xl">
          Enter the workspace built to scale duplication.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-crown-mist">
          Supabase Auth powers user sessions. Tenant access is controlled through profiles, RBAC,
          invite status, MFA flags, and subscription tier gates.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Tenant RBAC", ShieldCheck],
            ["Stripe-gated tiers", LockKeyhole],
            ["Invite onboarding", Mail]
          ].map(([label, Icon]) => (
            <div key={String(label)} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <Icon className="mb-3 text-crown-gold" size={20} />
              <p className="text-sm font-medium text-white">{String(label)}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-white/10 bg-crown-ink p-5 shadow-glow">
        {!isSupabaseConfigured ? (
          <div className="mb-4 rounded-lg border border-crown-rose/30 bg-crown-rose/10 p-4 text-sm leading-6 text-crown-rose">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before selling live access.
          </div>
        ) : null}
        {isSupabaseConfigured && (!supabaseConfigStatus.urlLooksValid || !supabaseConfigStatus.anonKeyLooksValid) ? (
          <div className="mb-4 rounded-lg border border-crown-rose/30 bg-crown-rose/10 p-4 text-sm leading-6 text-crown-rose">
            Supabase env vars look malformed. Use the Supabase project URL and the anon public key from Project Settings &gt; API, then redeploy.
          </div>
        ) : null}
        <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-crown-navy p-1">
          {[
            ["signin", "Sign in"],
            ["create", "Create account"]
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setMode(id as "signin" | "create");
                setError(null);
              }}
              className={`h-10 rounded-md text-sm font-semibold ${
                mode === id ? "bg-crown-gold text-crown-navy" : "text-crown-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-white">
          {mode === "create" ? "Create your trial workspace" : "Sign in"}
        </h2>
        <p className="mt-2 text-sm text-crown-mist">
          {mode === "create"
            ? "Start a 14-day Duplios trial. Stripe is only needed when you are ready to collect payment."
            : "Use a provisioned Supabase Auth user."}
        </p>
        <div className="mt-5 space-y-4">
          {mode === "signin" ? (
            <>
              <button
                type="button"
                onClick={googleLogin}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white px-4 font-semibold text-crown-navy disabled:opacity-60"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-crown-navy text-xs font-black text-white">
                  G
                </span>
                Continue with Google
              </button>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-crown-mist">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Your name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-crown-mist">Workspace name</span>
                <input
                  value={tenantName}
                  onChange={(event) => setTenantName(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="mb-2 block text-sm text-crown-mist">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-crown-mist">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              required
            />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm text-crown-rose">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 font-semibold text-crown-navy disabled:opacity-60"
        >
          <KeyRound size={18} />
          {mode === "create" ? (loading ? "Creating..." : "Create trial workspace") : loading ? "Signing in..." : "Sign in"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 h-10 w-full rounded-lg border border-white/10 text-sm font-semibold text-white"
        >
          Back to sales page
        </button>
      </form>
    </section>
  );
}
