import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { explainSupabaseError, isSupabaseConfigured, supabase } from "../lib/supabase";
import type { DupliosUserProfile } from "../types/tenant";

interface AuthContextValue {
  session: Session | null;
  profile: DupliosUserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DupliosUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    supabase
      .from("profiles")
      .select("id,display_name,email,tenant_id,tier,role,is_superadmin,leader_uid")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setProfile({
          uid: data.id,
          displayName: data.display_name,
          email: data.email ?? session.user.email ?? "",
          tenantId: data.tenant_id,
          tier: data.tier,
          role: data.role,
          isSuperadmin: Boolean(data.is_superadmin),
          leaderUid: data.leader_uid ?? undefined
        });
      });
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) {
          return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return explainSupabaseError(error?.message);
      },
      signInWithGoogle: async () => {
        if (!isSupabaseConfigured) {
          return "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/?view=dashboard`
          }
        });

        return explainSupabaseError(error?.message);
      },
      signOut: async () => {
        setProfile(null);
        setSession(null);
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
      }
    }),
    [loading, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
