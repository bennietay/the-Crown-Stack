import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fallback from '../../supabase-applet-config.json';

export const supabaseServerUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || fallback.url;
export const supabaseServerKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallback.publishableKey;
export const supabaseWorkspaceId = process.env.SUPABASE_WORKSPACE_ID || process.env.VITE_SUPABASE_WORKSPACE_ID || fallback.workspaceId;

export const createSupabaseRequestClient = (accessToken?: string): SupabaseClient => createClient(supabaseServerUrl, supabaseServerKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
});

export const supabaseServer = createSupabaseRequestClient();
