import { create } from 'zustand';
import { User, Workspace, Role } from '../types';
import { supabase, supabaseWorkspaceId } from '../supabase';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  workspaceRoles: Record<string, Role>;
  loading: boolean;
  error: string | null;
  initAuth: () => () => void;
  loginUser: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setWorkspace: (workspaceId: string) => void;
  clearError: () => void;
}

const normalizeRole = (rawRole?: string): Role => {
  const role = String(rawRole || 'customer').toLowerCase().trim().replaceAll(' ', '_');
  return ['super_admin', 'workspace_admin', 'sales', 'operations', 'support', 'customer'].includes(role) ? role as Role : 'customer';
};

const resolveUserRecord = async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
  const [{ data: profile }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from('bos_profiles').select('*').eq('id', authUser.id).maybeSingle(),
    supabase.from('bos_workspace_members').select('workspace_id,role,status').eq('user_id', authUser.id).eq('status', 'active'),
  ]);
  if (membershipError) throw membershipError;
  const activeMemberships = memberships || [];
  const workspaceIds = activeMemberships.length ? activeMemberships.map(m => m.workspace_id) : [supabaseWorkspaceId];
  const { data: workspaces, error: workspaceError } = await supabase.from('bos_workspaces').select('*').in('id', workspaceIds);
  if (workspaceError) throw workspaceError;
  if (!activeMemberships.length) throw new Error('This account has no active workspace membership.');

  // A valid membership is the source of authorization. If the workspace row
  // is briefly unavailable while the session/RLS policy settles, retain the
  // assigned workspace context instead of bouncing the user back to login.
  const visibleWorkspaces = workspaces || [];
  const resolvedWorkspaces = activeMemberships.map((membership) => {
    const visible = visibleWorkspaces.find((workspace) => workspace.id === membership.workspace_id);
    return visible || {
      id: membership.workspace_id,
      name: membership.workspace_id === supabaseWorkspaceId ? 'Bennie Studio' : membership.workspace_id,
      type: 'agency',
      created_at: new Date().toISOString(),
    };
  });

  const workspaceRoles: Record<string, Role> = {};
  activeMemberships.forEach(m => { workspaceRoles[m.workspace_id] = normalizeRole(m.role); });
  if (!workspaceRoles[supabaseWorkspaceId]) workspaceRoles[supabaseWorkspaceId] = 'workspace_admin';
  const rawRole = profile?.role || workspaceRoles[resolvedWorkspaces[0].id] || 'workspace_admin';
  const userObj: User = {
    id: authUser.id,
    uid: authUser.id,
    email: profile?.email || authUser.email || '',
    name: profile?.display_name || String(authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'),
    role: normalizeRole(rawRole),
    workspaceIds: resolvedWorkspaces.map(w => w.id),
    activeWorkspaceId: resolvedWorkspaces[0].id,
    createdAt: profile?.created_at,
    updatedAt: profile?.updated_at,
  };
  return {
    userObj,
    workspaces: resolvedWorkspaces.map(w => ({ id: w.id, name: w.name, type: 'agency', createdAt: w.created_at } as Workspace)),
    workspaceRoles,
  };
};

let authUnsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  workspace: null,
  workspaces: [],
  workspaceRoles: {},
  loading: true,
  error: null,
  clearError: () => set({ error: null }),

  initAuth: () => {
    authUnsubscribe?.();
    let settled = false;
    let hydrateVersion = 0;
    const timeout = window.setTimeout(() => {
      if (!settled) set({ loading: false, error: null });
    }, 8000);
    const hydrate = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null, source: 'initial' | 'event') => {
      const version = ++hydrateVersion;
      settled = true;
      window.clearTimeout(timeout);
      if (!sessionUser) {
        // The initial getSession call can resolve with a stale null snapshot
        // after a sign-in has already completed. Never let that snapshot
        // erase a user established by the sign-in event.
        if (source === 'initial' && get().user) return;
        if (version !== hydrateVersion) return;
        set({ user: null, workspace: null, workspaces: [], workspaceRoles: {}, loading: false, error: null });
        return;
      }
      try {
        const resolved = await resolveUserRecord(sessionUser);
        if (version !== hydrateVersion) return;
        set({ ...resolved, workspace: resolved.workspaces[0] || null, loading: false, error: null });
      } catch (error) {
        if (version !== hydrateVersion) return;
        // Keep the Supabase session intact on hydration failures. A transient
        // RLS/network error should be retryable instead of forcing a logout.
        set({ user: null, workspace: null, workspaces: [], workspaceRoles: {}, loading: false, error: error instanceof Error ? error.message : 'Account access denied' });
      }
    };
    supabase.auth.getSession().then(({ data }) => void hydrate(data.session?.user || null, 'initial'));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => void hydrate(session?.user || null, 'event'));
    authUnsubscribe = () => data.subscription.unsubscribe();
    return () => { window.clearTimeout(timeout); authUnsubscribe?.(); authUnsubscribe = null; };
  },

  loginUser: async (email, pass) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase().trim(), password: pass });
    if (error || !data.user) {
      const message = error?.message?.toLowerCase().includes('invalid') ? 'Invalid email or password.' : (error?.message || 'Authentication failed.');
      set({ loading: false, error: message });
      throw new Error(message);
    }
    const resolved = await resolveUserRecord(data.user);
    set({ ...resolved, workspace: resolved.workspaces[0] || null, loading: false, error: null });
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) { set({ loading: false, error: error.message }); throw error; }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, workspace: null, workspaces: [], workspaceRoles: {}, loading: false });
  },

  setWorkspace: (workspaceId) => {
    const workspace = get().workspaces.find(w => w.id === workspaceId);
    if (workspace) set({ workspace });
  },
}));
