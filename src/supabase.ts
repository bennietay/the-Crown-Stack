import { createClient } from '@supabase/supabase-js';
import fallback from '../supabase-applet-config.json';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallback.url;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallback.publishableKey;
export const supabaseWorkspaceId = import.meta.env.VITE_SUPABASE_WORKSPACE_ID || fallback.workspaceId;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
