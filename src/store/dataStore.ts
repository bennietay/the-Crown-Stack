import { create } from 'zustand';
import { Lead, Opportunity, Customer, Ticket, FollowUpTask, Product, Proposal } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
} from 'firebase/firestore';

interface DataState {
  leads: Lead[];
  opportunities: Opportunity[];
  customers: Customer[];
  tickets: Ticket[];
  products: Product[];
  proposals: Proposal[];
  tasks: FollowUpTask[];
  
  loading: boolean;
  activeWorkspaceId: string | null;

  initWorkspace: (workspaceId: string) => () => void; // returns unsubscribe function
  
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'createdAt'>) => Promise<string>;
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => Promise<void>;

  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt'>) => Promise<string>;
  updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;

  addTask: (task: Omit<FollowUpTask, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<FollowUpTask>) => Promise<void>;

}

export const useDataStore = create<DataState>((set, get) => ({
  leads: [],
  opportunities: [],
  customers: [],
  tickets: [],
  products: [],
  proposals: [],
  tasks: [],
  
  loading: false,
  activeWorkspaceId: null,

  initWorkspace: (workspaceId: string) => {
    set({ loading: true, activeWorkspaceId: workspaceId });
    if (!db) {
      console.warn("Firestore not initialized");
      return () => {};
    }

    const unsubs: (() => void)[] = [];
    const collections = [
      { name: 'leads', stateKey: 'leads' },
      { name: 'opportunities', stateKey: 'opportunities' },
      { name: 'customers', stateKey: 'customers' },
      { name: 'tickets', stateKey: 'tickets' },
      { name: 'products', stateKey: 'products' },
      { name: 'proposals', stateKey: 'proposals' },
      { name: 'tasks', stateKey: 'tasks' },
    ];

    for (const c of collections) {
      const q = query(collection(db, c.name), where('workspaceId', '==', workspaceId));
      const unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        set({ [c.stateKey]: data });
      }, (error) => {
         console.error(`Error fetching ${c.name}:`, error);
      });
      unsubs.push(unsub);
    }
    
    set({ loading: false });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  },

  addLead: async (leadData) => {
    if (!db) return;
    const id = `l-${crypto.randomUUID()}`;
    const docRef = doc(db, 'leads', id);
    await setDoc(docRef, { ...leadData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  },
  
  updateLead: async (id, updates) => {
    if (!db) return;
    const docRef = doc(db, 'leads', id);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
  },
  
  deleteLead: async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'leads', id));
  },

  addOpportunity: async (oppData) => {
    if (!db) throw new Error("Database is not configured");
    const id = `opp-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'opportunities', id), { ...oppData, id, createdAt: new Date().toISOString() });
    return id;
  },

  updateOpportunity: async (id, updates) => {
    if (!db) return;
    await updateDoc(doc(db, 'opportunities', id), { ...updates });
  },

  addProduct: async (product) => {
    if (!db) return;
    const id = `prod-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'products', id), { ...product, id });
  },

  addProposal: async (proposal) => {
    if (!db) throw new Error("Database is not configured");
    const id = `prop-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'proposals', id), { ...proposal, id, createdAt: new Date().toISOString() });
    return id;
  },

  updateProposal: async (id, updates) => {
    if (!db) return;
    await updateDoc(doc(db, 'proposals', id), { ...updates });
  },

  addCustomer: async (customer) => {
    if (!db) return;
    const id = `cust-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'customers', id), { ...customer, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  },

  updateCustomer: async (id, updates) => {
    if (!db) return;
    await updateDoc(doc(db, 'customers', id), { ...updates, updatedAt: new Date().toISOString() });
  },

  addTicket: async (ticket) => {
    if (!db) return;
    const id = `tick-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'tickets', id), { ...ticket, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  },

  updateTicket: async (id, updates) => {
    if (!db) return;
    await updateDoc(doc(db, 'tickets', id), { ...updates, updatedAt: new Date().toISOString() });
  },

  addTask: async (task) => {
    if (!db) return;
    const id = `task-${crypto.randomUUID()}`;
    await setDoc(doc(db, 'tasks', id), { ...task, id, createdAt: new Date().toISOString() });
  },

  updateTask: async (id, updates) => {
    if (!db) return;
    await updateDoc(doc(db, 'tasks', id), { ...updates });
  }
}));
