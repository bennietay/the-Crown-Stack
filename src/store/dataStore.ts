import { create } from 'zustand';
import { Lead, Opportunity, Customer, Ticket, FollowUpTask, Product, Proposal, DiamondProspect, DiamondCustomer, DiamondFollowUp, RevenueEvent, AffiliateRecord, EtsyRecord, RevenueGoal, MoneyTask, NotificationRecord, AutomationDefinition, ActivityRecord, DiamondProduct, DiamondPurchase, DiamondScript, PrintifyRecord, EtsyProduct, WaasPlan, WaasDeal, WaasTemplate, WaasOrder, WaasOnboarding, WaasWebsite, WaasDeployment, WaasDeploymentStep, WaasSupportTicket, WaasTicketMessage, WaasUpdateUsage, WaasActivity } from '../types';
import { supabase } from '../supabase';

interface DataState {
  leads: Lead[]; opportunities: Opportunity[]; customers: Customer[]; tickets: Ticket[]; products: Product[]; proposals: Proposal[]; tasks: FollowUpTask[];
  diamondProspects: DiamondProspect[]; diamondCustomers: DiamondCustomer[]; diamondFollowUps: DiamondFollowUp[];
  diamondProducts: DiamondProduct[]; diamondPurchases: DiamondPurchase[]; diamondScripts: DiamondScript[];
  revenueEvents: RevenueEvent[]; affiliateRecords: AffiliateRecord[]; etsyRecords: EtsyRecord[];
  printifyRecords: PrintifyRecord[];
  etsyProducts: EtsyProduct[];
  revenueGoals: RevenueGoal[]; moneyTasks: MoneyTask[]; notifications: NotificationRecord[]; automations: AutomationDefinition[]; activityRecords: ActivityRecord[];
  waasPlans: WaasPlan[]; waasDeals: WaasDeal[]; waasTemplates: WaasTemplate[]; waasOrders: WaasOrder[]; waasOnboardings: WaasOnboarding[]; waasWebsites: WaasWebsite[]; waasDeployments: WaasDeployment[]; waasDeploymentSteps: WaasDeploymentStep[]; waasSupportTickets: WaasSupportTicket[]; waasTicketMessages: WaasTicketMessage[]; waasUpdateUsage: WaasUpdateUsage[]; waasActivities: WaasActivity[];
  loading: boolean; activeWorkspaceId: string | null;
  initWorkspace: (workspaceId: string) => () => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>; deleteLead: (id: string) => Promise<void>;
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'createdAt'>) => Promise<string>; updateOpportunity: (id: string, updates: Partial<Opportunity>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  addProposal: (proposal: Omit<Proposal, 'id' | 'createdAt'>) => Promise<string>; updateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>; deleteProposal: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>; updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
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
  addEtsyProduct: (product: Omit<EtsyProduct, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEtsyProduct: (id: string, updates: Partial<EtsyProduct>) => Promise<void>;
  addRevenueGoal: (goal: Omit<RevenueGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRevenueGoal: (id: string, updates: Partial<RevenueGoal>) => Promise<void>;
  addMoneyTask: (task: Omit<MoneyTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMoneyTask: (id: string, updates: Partial<MoneyTask>) => Promise<void>;
  addNotification: (notification: Omit<NotificationRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNotification: (id: string, updates: Partial<NotificationRecord>) => Promise<void>;
  addAutomation: (automation: Omit<AutomationDefinition, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAutomation: (id: string, updates: Partial<AutomationDefinition>) => Promise<void>;
  addActivity: (activity: Omit<ActivityRecord, 'id' | 'createdAt'>) => Promise<void>;
  addWaasPlan: (value: Omit<WaasPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>; updateWaasPlan: (id: string, updates: Partial<WaasPlan>) => Promise<void>;
  addWaasDeal: (value: Omit<WaasDeal, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>; updateWaasDeal: (id: string, updates: Partial<WaasDeal>) => Promise<void>;
  addWaasTemplate: (value: Omit<WaasTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>; updateWaasTemplate: (id: string, updates: Partial<WaasTemplate>) => Promise<void>;
  addWaasOrder: (value: Omit<WaasOrder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; updateWaasOrder: (id: string, updates: Partial<WaasOrder>) => Promise<void>;
  addWaasOnboarding: (value: Omit<WaasOnboarding, 'id' | 'updatedAt'>) => Promise<void>; updateWaasOnboarding: (id: string, updates: Partial<WaasOnboarding>) => Promise<void>;
  addWaasWebsite: (value: Omit<WaasWebsite, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; updateWaasWebsite: (id: string, updates: Partial<WaasWebsite>) => Promise<void>;
  addWaasDeployment: (value: Omit<WaasDeployment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>; updateWaasDeployment: (id: string, updates: Partial<WaasDeployment>) => Promise<void>;
  addWaasDeploymentStep: (value: WaasDeploymentStep) => Promise<void>; updateWaasDeploymentStep: (id: string, updates: Partial<WaasDeploymentStep>) => Promise<void>;
  addWaasTicket: (value: Omit<WaasSupportTicket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>; updateWaasTicket: (id: string, updates: Partial<WaasSupportTicket>) => Promise<void>;
  addWaasTicketMessage: (value: Omit<WaasTicketMessage, 'id' | 'createdAt'>) => Promise<void>;
  addWaasUpdateUsage: (value: Omit<WaasUpdateUsage, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
// Affiliate/Etsy records remain in Supabase for historical retention, but are no
// longer loaded into the active operating dashboard.
const collectionState: Record<string, string> = { leads: 'leads', opportunities: 'opportunities', customers: 'customers', tickets: 'tickets', products: 'products', proposals: 'proposals', tasks: 'tasks', diamondProspects: 'diamond_prospects', diamondCustomers: 'diamond_customers', diamondFollowUps: 'diamond_followups', diamondProducts: 'diamond_products', diamondPurchases: 'diamond_purchases', diamondScripts: 'diamond_scripts', revenueEvents: 'revenue_events', revenueGoals: 'revenue_goals', moneyTasks: 'money_tasks', notifications: 'notifications', automations: 'automations', activityRecords: 'activity_records', waasPlans: 'waas_plans', waasDeals: 'waas_deals', waasTemplates: 'waas_templates', waasOrders: 'waas_orders', waasOnboardings: 'waas_onboardings', waasWebsites: 'waas_websites', waasDeployments: 'waas_deployments', waasDeploymentSteps: 'waas_deployment_steps', waasSupportTickets: 'waas_support_tickets', waasTicketMessages: 'waas_ticket_messages', waasUpdateUsage: 'waas_update_usage', waasActivities: 'waas_activities' };

async function listCollection(workspaceId: string, collectionName: string) {
  const { data, error } = await supabase.from('bos_records').select('record_id,data').eq('workspace_id', workspaceId).eq('collection_name', collectionName).eq('is_soft_deleted', false).order('updated_at', { ascending: false }).range(0, 1999);
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
  leads: [], opportunities: [], customers: [], tickets: [], products: [], proposals: [], tasks: [], diamondProspects: [], diamondCustomers: [], diamondFollowUps: [], diamondProducts: [], diamondPurchases: [], diamondScripts: [], revenueEvents: [], affiliateRecords: [], etsyRecords: [], etsyProducts: [], printifyRecords: [], revenueGoals: [], moneyTasks: [], notifications: [], automations: [], activityRecords: [], waasPlans: [], waasDeals: [], waasTemplates: [], waasOrders: [], waasOnboardings: [], waasWebsites: [], waasDeployments: [], waasDeploymentSteps: [], waasSupportTickets: [], waasTicketMessages: [], waasUpdateUsage: [], waasActivities: [], loading: false, activeWorkspaceId: null,

  initWorkspace: (workspaceId) => {
    set({ loading: true, activeWorkspaceId: workspaceId });
    let cancelled = false;
    const loadCollections = async () => {
      await Promise.all(Object.entries(collectionState).map(async ([stateKey, collectionName]) => {
        try {
          const rows = await listCollection(workspaceId, collectionName);
          if (!cancelled) set({ [stateKey]: rows } as Partial<DataState>);
        } catch (error) { console.error(`Error fetching ${collectionName}:`, error); }
      }));
      if (!cancelled) set({ loading: false });
    };
    void loadCollections();
    const channel = supabase.channel(`bos-records-${workspaceId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bos_records', filter: `workspace_id=eq.${workspaceId}` }, () => {
      void loadCollections();
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
  addCustomer: async (value) => { const ws = get().activeWorkspaceId || value.workspaceId; if (!ws) throw new Error('Workspace is not selected'); const id = makeId('cust'); const timestamp = now(); await writeRecord(ws, 'customers', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); return id; },
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
  addEtsyProduct: async (value) => { const id = makeId('etsy-product'); const timestamp = now(); await writeRecord(value.workspaceId, 'etsy_products', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateEtsyProduct: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'etsy_products', id, { ...(get().etsyProducts.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addRevenueGoal: async (value) => { const id = makeId('goal'); const timestamp = now(); await writeRecord(value.workspaceId, 'revenue_goals', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateRevenueGoal: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'revenue_goals', id, { ...(get().revenueGoals.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addMoneyTask: async (value) => { const id = makeId('money-task'); const timestamp = now(); await writeRecord(value.workspaceId, 'money_tasks', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateMoneyTask: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'money_tasks', id, { ...(get().moneyTasks.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addNotification: async (value) => { const id = makeId('notification'); const timestamp = now(); await writeRecord(value.workspaceId, 'notifications', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateNotification: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'notifications', id, { ...(get().notifications.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addAutomation: async (value) => { const id = makeId('automation'); const timestamp = now(); await writeRecord(value.workspaceId, 'automations', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateAutomation: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'automations', id, { ...(get().automations.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addActivity: async (value) => { const id = makeId('activity'); await writeRecord(value.workspaceId, 'activity_records', id, { ...value, id, createdAt: now() }); },
  addWaasPlan: async (value) => { const id = value.id || makeId('waas-plan'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_plans', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateWaasPlan: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_plans', id, { ...(get().waasPlans.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasDeal: async (value) => { const id = value.id || makeId('waas-deal'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_deals', id, { ...value, id, code: value.code.trim().toUpperCase(), redemptions: value.redemptions || 0, createdAt: timestamp, updatedAt: timestamp }); },
  updateWaasDeal: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_deals', id, { ...(get().waasDeals.find(row => row.id === id) || {}), ...updates, ...(updates.code ? { code: updates.code.trim().toUpperCase() } : {}), id, updatedAt: now() }); },
  addWaasTemplate: async (value) => { const id = value.id || makeId('waas-template'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_templates', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateWaasTemplate: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_templates', id, { ...(get().waasTemplates.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasOrder: async (value) => { const id = makeId('waas-order'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_orders', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateWaasOrder: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_orders', id, { ...(get().waasOrders.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasOnboarding: async (value) => { const id = makeId('waas-onboarding'); await writeRecord(value.workspaceId, 'waas_onboardings', id, { ...value, id, updatedAt: now() }); },
  updateWaasOnboarding: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_onboardings', id, { ...(get().waasOnboardings.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasWebsite: async (value) => { const id = makeId('waas-site'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_websites', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
  updateWaasWebsite: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_websites', id, { ...(get().waasWebsites.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasDeployment: async (value) => { const id = makeId('waas-deployment'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_deployments', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); return id; },
  updateWaasDeployment: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_deployments', id, { ...(get().waasDeployments.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasDeploymentStep: async (value) => { await writeRecord(value.workspaceId, 'waas_deployment_steps', value.id, { ...value }); },
  updateWaasDeploymentStep: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_deployment_steps', id, { ...(get().waasDeploymentSteps.find(row => row.id === id) || {}), ...updates, id }); },
  addWaasTicket: async (value) => { const id = makeId('waas-ticket'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_support_tickets', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); const hours: Record<string, [number, number]> = { critical: [1, 4], high: [4, 24], normal: [8, 72], request: [24, 120] }; const [responseHours, resolutionHours] = hours[value.priority] || hours.normal; const responseDue = new Date(Date.parse(timestamp) + responseHours * 3600000).toISOString(); const resolutionDue = new Date(Date.parse(timestamp) + resolutionHours * 3600000).toISOString(); const { error } = await supabase.from('waas_ticket_sla').upsert({ id: `sla-${id}`, workspace_id: value.workspaceId, ticket_id: id, priority: value.priority, response_due_at: responseDue, resolution_due_at: resolutionDue, updated_at: timestamp }, { onConflict: 'workspace_id,ticket_id' }); if (error) { await softDelete(value.workspaceId, 'waas_support_tickets', id); throw error; } },
  updateWaasTicket: async (id, updates) => { const ws = get().activeWorkspaceId; if (!ws) throw new Error('Workspace is not selected'); await writeRecord(ws, 'waas_support_tickets', id, { ...(get().waasSupportTickets.find(row => row.id === id) || {}), ...updates, id, updatedAt: now() }); },
  addWaasTicketMessage: async (value) => { const id = makeId('waas-message'); await writeRecord(value.workspaceId, 'waas_ticket_messages', id, { ...value, id, createdAt: now() }); },
  addWaasUpdateUsage: async (value) => { const id = makeId('waas-usage'); const timestamp = now(); await writeRecord(value.workspaceId, 'waas_update_usage', id, { ...value, id, createdAt: timestamp, updatedAt: timestamp }); },
}));
