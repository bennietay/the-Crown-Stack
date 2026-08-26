import { create } from 'zustand';
import { Lead, Opportunity, Customer, Ticket, FollowUpTask, Product, Proposal, DiamondProspect, DiamondCustomer, DiamondFollowUp, RevenueEvent, AffiliateRecord, EtsyRecord } from '../types';
import { supabase } from '../supabase';

interface DataState {
  leads: Lead[]; opportunities: Opportunity[]; customers: Customer[]; tickets: Ticket[]; products: Product[]; proposals: Proposal[]; tasks: FollowUpTask[];
  diamondProspects: DiamondProspect[]; diamondCustomers: DiamondCustomer[]; diamondFollowUps: DiamondFollowUp[];
  revenueEvents: RevenueEvent[]; affiliateRecords: AffiliateRecord[]; etsyRecords: EtsyRecord[];
  loading: boolean; activeWorkspaceId: string | null;
  initWorkspace: (workspaceId: string) => () => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>; deleteLead: (id: string) => Promise<void>;
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'createdAt'>) => Promise<string>; updateOpportunity: (id: string, updates: Partial<Opportunity>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt'>) => Promise<string>; updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>; deleteProposal: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  addTask: (task: Omit<FollowUpTask, 'id' | 'createdAt'>) => Promise<void>; updateTask: (id: string, updates: Partial<FollowUpTask>) => Promise<void>;
  addDiamondProspect: (prospect: Omit<DiamondProspect, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDiamondProspect: (id: string, updates: Partial<DiamondProspect>) => Promise<void>;
  addDiamondCustomer: (customer: Omit<DiamondCustomer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addDiamondFollowUp: (followUp: Omit<DiamondFollowUp, 'id' | 'createdAt'>) => Promise<void>;
  updateDiamondFollowUp: (id: string, updates: Partial<DiamondFollowUp>) => Promise<void>;
  addRevenueEvent: (event: Omit<RevenueEvent, 'id' | 'createdAt'>) => Promise<void>;
  addAffiliateRecord: (record: Omit<AffiliateRecord, 'id' | 'createdAt'>) => Promise<void>;
  addEtsyRecord: (record: Omit<EtsyRecord, 'id' | 'createdAt'>) => Promise<void>;
}

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const collectionState: Record<string, string> = { leads: 'leads', opportunities: 'opportunities', customers: 'customers', tickets: 'tickets', products: 'products', proposals: 'proposals', tasks: 'tasks', diamondProspects: 'diamond_prospects', diamondCustomers: 'diamond_customers', diamondFollowUps: 'diamond_followups', revenueEvents: 'revenue_events', affiliateRecords: 'affiliate_records', etsyRecords: 'etsy_records' };

async function listCollection(workspaceId: string, collectionName: string) {
  const { data, error } = await supabase.from('bos_records').select('record_id,data').eq('workspace_id', workspaceId).eq('collection_name', collectionName).eq('is_soft_deleted', false);
  if (error) throw error;
  return (data || []).map(row => ({ id: row.record_id, ...(row.data || {}) }));
}

async function writeRecord(workspaceId: string, collectionName: string, id: string, value: Record<string, unknown>) {
  const { error } = await supabase.from('bos_records').upsert({ workspace_id: workspaceId, collection_name: collectionName, record_id: id, data: value, is_soft_deleted: false, updated_at: now() }, { onConflict: 'workspace_id,collection_name,record_id' });
  if (error) throw error;
}

async function softDelete(workspaceId: string, collectionName: string, id: string) {
  const { error } = await supabase.from('bos_records').update({ is_soft_deleted: true, updated_at: now() }).match({ workspace_id: workspaceId, collection_name: collectionName, record_id: id });
  if (error) throw error;
}

export const useDataStore = create<DataState>((set, get) => ({
  leads: [], opportunities: [], customers: [], tickets: [], products: [], proposals: [], tasks: [], diamondProspects: [], diamondCustomers: [], diamondFollowUps: [], revenueEvents: [], affiliateRecords: [], etsyRecords: [], loading: false, activeWorkspaceId: null,

  initWorkspace: (workspaceId) => {
    set({ loading: true, activeWorkspaceId: workspaceId });
    let cancelled = false;
    void Promise.all(Object.keys(collectionState).map(async collectionName => {
      try {
        const rows = await listCollection(workspaceId, collectionName);
        if (!cancelled) set({ [collectionState[collectionName]]: rows } as Partial<DataState>);
      } catch (error) { console.error(`Error fetching ${collectionName}:`, error); }
    })).finally(() => { if (!cancelled) set({ loading: false }); });
    const channel = supabase.channel(`bos-records-${workspaceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bos_records', filter: `workspace_id=eq.${workspaceId}` }, () => {
      void get().initWorkspace(workspaceId)();
    }).subscribe();
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  },

  addLead: async (value) => { const id = makeId('lead'); const timestamp = now(); await writeRecord(value.workspaceId, 'leads', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); return id; },
  updateLead: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); const current = get().leads.find(row => row.id === id) || {}; await writeRecord(ws, 'leads', id, { ...current, ...updates, id, updatedAt: now() }); },
  deleteLead: async (id) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await softDelete(ws, 'leads', id); },
  addOpportunity: async (value) => { const id = makeId('opp'); await writeRecord(value.workspaceId, 'opportunities', id, { ...value, id, createdAt: now() }); return id; },
  updateOpportunity: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'opportunities', id, { ...(get().opportunities.find(row => row.id === id) || {}), ...updates, id }); },
  addProduct: async (value) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('prod'); await writeRecord(ws, 'products', id, { ...value, id }); },
  addProposal: async (value) => { const id = makeId('prop'); await writeRecord(value.workspaceId, 'proposals', id, { ...value, id, createdAt: now() }); return id; },
  updateProposal: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'proposals', id, { ...(get().proposals.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  deleteProposal: async (id) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await softDelete(ws, 'proposals', id); },
  addCustomer: async (value) => { const ws = get().activeWorkspaceId || value.workspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('cust'); const timestamp = now(); await writeRecord(ws, 'customers', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateCustomer: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'customers', id, { ...(get().customers.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addTicket: async (value) => { const ws = get().activeWorkspaceId || value.workspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('tick'); const timestamp = now(); await writeRecord(ws, 'tickets', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateTicket: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'tickets', id, { ...(get().tickets.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addTask: async (value) => { const ws = get().activeWorkspaceId || value.workspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('task'); await writeRecord(ws, 'tasks', id, { ...value, id, createdAt: now() }); },
  updateTask: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'tasks', id, { ...(get().tasks.find(row => row.id === id) || {}), ...updates, id }); },
  addDiamondProspect: async (value) => { const id = makeId('diamond-prospect'); const timestamp = now(); await writeRecord(value.workspaceId, 'diamond_prospects', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateDiamondProspect: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'diamond_prospects', id, { ...(get().diamondProspects.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addDiamondCustomer: async (value) => { const ws = get().activeWorkspaceId || value.workspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('diamond-customer'); const timestamp = now(); await writeRecord(ws, 'diamond_customers', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  addDiamondFollowUp: async (value) => { const id = makeId('diamond-followup'); await writeRecord(value.workspaceId, 'diamond_followups', id, { ...value, id, createdAt: now() }); },
  updateDiamondFollowUp: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'diamond_followups', id, { ...(get().diamondFollowUps.find(row => row.id === id) || {}), ...updates, id }); },
  addRevenueEvent: async (value) => { const id = makeId('revenue'); await writeRecord(value.workspaceId, 'revenue_events', id, { ...value, id, createdAt: now() }); },
  addAffiliateRecord: async (value) => { const id = makeId('affiliate'); await writeRecord(value.workspaceId, 'affiliate_records', id, { ...value, id, createdAt: now() }); },
  addEtsyRecord: async (value) => { const id = makeId('etsy'); await writeRecord(value.workspaceId, 'etsy_records', id, { ...value, id, createdAt: now() }); },
}));
