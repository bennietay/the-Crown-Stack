import { create } from 'zustand';
import { User, Workspace, Role } from '../types';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider,
  signInWithPopup 
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
  if (!rawRole) return "customer";
  const lower = rawRole.toLowerCase().trim();
  if (lower === "super_admin" || lower === "super admin") return "super_admin";
  if (lower === "workspace_admin" || lower === "workspace admin" || lower === "admin") return "workspace_admin";
  if (lower === "sales" || lower === "sales user") return "sales";
  if (lower === "operations" || lower === "operations user" || lower === "ops") return "operations";
  if (lower === "support" || lower === "support user") return "support";
  if (lower === "customer" || lower === "client") return "customer";
  return "customer";
};

let authUnsubscribe: (() => void) | null = null;

const bootstrapFirstAdministrator = async (firebaseUser: any) => {
  const token = await firebaseUser.getIdToken();
  const response = await fetch('/api/bootstrap', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok || response.status === 409) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || 'This account has not been provisioned for Bennie Business OS.');
};

const resolveUserRecord = async (firebaseUser: any): Promise<{ userObj: User, workspaces: Workspace[], workspaceRoles: Record<string, Role> }> => {
  if (!db) throw new Error("Firestore not initialized");

  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await bootstrapFirstAdministrator(firebaseUser);
  }

  const provisionedUserSnap = userSnap.exists() ? userSnap : await getDoc(userRef);
  if (!provisionedUserSnap.exists()) throw new Error("This account has not been provisioned for Bennie Business OS.");

  const raw = provisionedUserSnap.data();
  const userObj = {
    ...raw,
    id: firebaseUser.uid,
    email: raw.email || firebaseUser.email || '',
    name: raw.name || firebaseUser.displayName || 'User',
    role: normalizeRole(raw.role),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  } as User;

  // Fetch workspace memberships for this user
  const wuQuery = query(collection(db, 'workspaceUsers'), where('userId', '==', firebaseUser.uid));
  const wuSnap = await getDocs(wuQuery);
  
  const workspaceRoles: Record<string, Role> = {};
  const workspaceIds: string[] = [];
  wuSnap.forEach(doc => {
    const data = doc.data();
    if (data.status === 'active' || !data.status) {
      const canonicalRole = normalizeRole(data.role);
      workspaceRoles[data.workspaceId] = canonicalRole;
      workspaceIds.push(data.workspaceId);
    }
  });

  let workspaces: Workspace[] = [];
  if (userObj.role === 'super_admin') {
    const allWs = await getDocs(collection(db, 'workspaces'));
    allWs.forEach(doc => {
       workspaces.push(doc.data() as Workspace);
       if (!workspaceRoles[doc.id]) workspaceRoles[doc.id] = 'super_admin';
    });
  } else if (workspaceIds.length > 0) {
    const wsQuery = query(collection(db, 'workspaces'), where('id', 'in', workspaceIds));
    const wsSnap = await getDocs(wsQuery);
    wsSnap.forEach(doc => {
       workspaces.push(doc.data() as Workspace);
    });
  }

  if (workspaces.length === 0) {
    throw new Error("This account has no active workspace membership.");
  }

  return { userObj, workspaces, workspaceRoles };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  workspace: null,
  workspaces: [],
  workspaceRoles: {},
  loading: true,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: () => {
    try {
      if (auth) {
        authUnsubscribe?.();
        authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const { userObj, workspaces, workspaceRoles } = await resolveUserRecord(firebaseUser);
              
              set({
                user: userObj,
                workspaces,
                workspaceRoles,
                workspace: workspaces[0] || null,
                loading: false,
                error: null
              });
            } catch (err) {
              console.error("Error setting firebase user", err);
              await signOut(auth).catch(() => undefined);
              set({ user: null, workspace: null, workspaces: [], workspaceRoles: {}, loading: false, error: err instanceof Error ? err.message : "Account access denied" });
            }
          } else {
            set({ user: null, workspace: null, workspaces: [], workspaceRoles: {}, loading: false });
          }
        });
        return () => {
          authUnsubscribe?.();
          authUnsubscribe = null;
        };
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ loading: false });
    }
    return () => undefined;
  },

  loginUser: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    const cleanEmail = email.toLowerCase().trim();

    try {
      if (!auth) throw new Error("Firebase Auth is not configured");
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const { userObj, workspaces, workspaceRoles } = await resolveUserRecord(cred.user);
      
      set({
        user: userObj,
        workspaces,
        workspaceRoles,
        workspace: workspaces[0] || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      if (auth.currentUser) await signOut(auth).catch(() => undefined);
      let friendlyError = "Authentication failed. Please check your email and password.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        friendlyError = "Invalid email or password.";
      } else if (err.code === "auth/invalid-email") {
        friendlyError = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests") {
        friendlyError = "Too many failed attempts. Please try again in a few minutes.";
      } else if (err.message) {
        friendlyError = err.message;
      }
      set({ loading: false, error: friendlyError });
      throw new Error(friendlyError);
    }
  },

  loginWithGoogle: async () => {
    set({ loading: true, error: null });
    try {
      if (!auth) throw new Error("Firebase Auth is offline");
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const { userObj, workspaces, workspaceRoles } = await resolveUserRecord(cred.user);

      set({
        user: userObj,
        workspaces,
        workspaceRoles,
        workspace: workspaces[0] || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      if (auth.currentUser) await signOut(auth).catch(() => undefined);
      const friendlyError = err.message || "Google Authentication failed or was closed.";
      set({ loading: false, error: friendlyError });
      throw new Error(friendlyError);
    }
  },

  logout: async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        // ignore
      }
    }
    set({ user: null, workspace: null, workspaces: [], workspaceRoles: {} });
  },

  setWorkspace: (workspaceId: string) => {
    const ws = get().workspaces.find(w => w.id === workspaceId);
    if (ws) set({ workspace: ws });
  }
}));
