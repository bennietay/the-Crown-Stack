import { CheckCircle2, GitBranch, KeyRound, Sparkles } from "lucide-react";
import { useState } from "react";
import { activateCheckout } from "../../lib/api";
import { useAuth } from "../../auth/AuthProvider";

interface ActivationPageProps {
  sessionId?: string | null;
  onActivated: () => void;
}

export function ActivationPage({ sessionId, onActivated }: ActivationPageProps) {
  const { signIn } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!sessionId) {
      setError("Missing Stripe checkout session. Return from the checkout success link.");
      return;
    }

    setLoading(true);

    try {
      const result = await activateCheckout(sessionId, displayName, password);
      setEmail(result.email);
      const signInError = await signIn(result.email, password);
      if (signInError) {
        setError(signInError);
      } else {
        onActivated();
      }
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Activation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-crown-gold/30 bg-crown-gold/10 px-3 py-1 text-sm text-crown-champagne">
          <Sparkles size={16} />
          Payment received
        </div>
        <h1 className="text-4xl font-semibold text-white sm:text-5xl">
          Create your owner account and launch your tenant.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-crown-mist">
          This step provisions Supabase Auth, activates the tenant, seeds your first sales page, and
          loads starter scripts so the workspace is useful immediately.
        </p>
        <div className="mt-6 space-y-3">
          {["Tenant activated", "Owner profile created", "Starter scripts installed"].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-crown-champagne">
              <CheckCircle2 size={18} className="text-crown-emerald" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-white/10 bg-crown-ink p-5 shadow-glow">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-crown-gold text-crown-navy">
          <GitBranch />
        </div>
        <h2 className="text-2xl font-semibold text-white">Owner setup</h2>
        <p className="mt-2 text-sm text-crown-mist">
          Use the same email from checkout. Stripe provides it securely through the session.
        </p>
        {email ? (
          <div className="mt-4 rounded-lg border border-crown-emerald/30 bg-crown-emerald/10 p-3 text-sm text-crown-emerald">
            Activated for {email}
          </div>
        ) : null}
        <div className="mt-5 space-y-4">
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
            <span className="mb-2 block text-sm text-crown-mist">Create password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
              minLength={8}
              required
            />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm text-crown-rose">{error}</p> : null}
        <button
          disabled={loading}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 font-semibold text-crown-navy disabled:opacity-60"
        >
          <KeyRound size={18} />
          {loading ? "Activating..." : "Activate workspace"}
        </button>
      </form>
    </section>
  );
}
