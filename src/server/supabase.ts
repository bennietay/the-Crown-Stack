import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fallback from '../../supabase-applet-config.json';

export const supabaseServerUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fallback.url;
export const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallback.publishableKey;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const hasSupabaseServiceRole = Boolean(supabaseServiceRoleKey);
export const supabaseWorkspaceId = process.env.SUPABASE_WORKSPACE_ID || process.env.VITE_SUPABASE_WORKSPACE_ID || fallback.workspaceId;

export const createSupabaseRequestClient = (accessToken?: string): SupabaseClient => createClient(supabaseServerUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
});

// Privileged server operations (webhooks, OAuth tokens and public proposal
// checkout) must never rely on the browser publishable key. RLS remains the
// boundary for all request-scoped clients above.
export const supabaseServer = createClient(supabaseServerUrl, supabaseServiceRoleKey || supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
