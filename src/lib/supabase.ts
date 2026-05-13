import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabaseConfigStatus = {
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
  urlLooksValid: /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(supabaseUrl ?? "")),
  anonKeyLooksValid: String(supabaseAnonKey ?? "").startsWith("eyJ")
};

export function explainSupabaseError(message?: string | null) {
  const normalized = String(message ?? "").toLowerCase();

  if (normalized.includes("invalid api key") || normalized.includes("api key")) {
    return "Supabase rejected VITE_SUPABASE_ANON_KEY. In Vercel, replace it with the Project Settings > API > anon public key from the same Supabase project as VITE_SUPABASE_URL, then redeploy.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password. Confirm the user exists in Supabase Auth and has a matching row in the profiles table.";
  }

  return message ?? null;
}

export const supabase = createClient(
  supabaseUrl || "http://127.0.0.1:54321",
  supabaseAnonKey || "missing-supabase-anon-key"
);

export const tenantStoragePath = (tenantId: string, path: string) =>
  `tenants/${tenantId}/${path.replace(/^\/+/, "")}`;
