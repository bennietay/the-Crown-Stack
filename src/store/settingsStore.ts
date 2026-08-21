import { create } from 'zustand';
import { supabase, supabaseWorkspaceId } from '../supabase';
import { SystemSettings } from '../types';

export const DEFAULT_BENNIE_SETTINGS: SystemSettings = {
  workspaceId: supabaseWorkspaceId,
  business: {
    name: 'Bennie Studio',
    currency: 'MYR',
    locale: 'en-MY',
    timezone: 'Asia/Kuala_Lumpur',
    whatsappNumber: '',
    leadSlaHours: 4,
    monthlyTarget: 15000,
  },
  sales: {
    taxRate: 9,
    proposalValidityDays: 14,
    hotThreshold: 70,
    warmThreshold: 40,
    defaultOwner: 'usr-bennie',
  },
  leadCapture: {
    eyebrow: 'Websites that turn attention into enquiries',
    headline: 'Get a clearer website plan, price and next step.',
    subheadline: 'Tell us what you need. Bennie will review it personally and recommend the fastest practical path to launch or improve your website.',
    offerTitle: 'Request your free project review',
    benefitBullets: ['A practical scope matched to your budget', 'Clear one-off and monthly options', 'No-obligation WhatsApp follow-up'],
    responsePromise: 'Personal reply within 4 business hours',
    trustNote: 'Your details stay private and are used only to respond to this enquiry.',
    ctaLabel: 'Get my project review',
    successMessage: 'Your request is safely recorded. Bennie will review it and contact you with the clearest next step.',
    serviceOptions: ['Launch Website', 'Growth Website + SEO', 'Care Plan', 'Custom Application'],
    budgetRanges: ['RM1,500 - RM3,000', 'RM3,000 - RM6,000', 'RM6,000 - RM12,000', 'RM12,000+'],
    timingOptions: ['ASAP', 'Within 2 weeks', 'Within 1 month', '1–3 months', 'Just exploring'],
    whatsappUrl: '',
    bookingUrl: '',
    privacyUrl: '',
    termsUrl: '',
    requireCompany: false,
    requirePhone: true,
    requireCountry: false,
  },
  cadence: [
    { day: 1, channel: 'email', title: 'Send Intro & Discovery Form' },
    { day: 3, channel: 'whatsapp', title: 'Follow-up on Proposal Review' },
    { day: 5, channel: 'call', title: 'Schedule Discovery Call' },
    { day: 7, channel: 'email', title: 'Send Case Studies & Testimonials' },
  ],
  integrations: {
    supabaseConfigured: false,
    whatsappConfigured: false,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'usr-bennie',
};

interface SettingsState {
  settings: SystemSettings;
  loading: boolean;
  error: string | null;
  loadedWorkspaceId: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  fetchSettings: (workspaceId: string) => Promise<void>;
  saveSettings: (workspaceId: string, updates: Partial<SystemSettings>) => Promise<void>;
  updateLocalSettingsStore: (newSettings: SystemSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_BENNIE_SETTINGS,
  loading: false,
  error: null,
  loadedWorkspaceId: null,
  saveStatus: 'idle',
  
  fetchSettings: async (workspaceId: string) => {
    const current = get().settings;
    const defaultForWs = { ...DEFAULT_BENNIE_SETTINGS, workspaceId };
    
    // Ensure instant rendering by populating fallback immediately if workspace changed
    if (!current || current.workspaceId !== workspaceId) {
      set({ settings: defaultForWs, loading: true, error: null, loadedWorkspaceId: null, saveStatus: 'idle' });
    } else {
      set({ loading: true, error: null, loadedWorkspaceId: null, saveStatus: 'idle' });
    }

    try {
      const { data, error } = await supabase.from('bos_records').select('data').match({ workspace_id: workspaceId, collection_name: 'settings', record_id: workspaceId, is_soft_deleted: false }).maybeSingle();
      if (error) throw error;
      const loaded = data?.data ? { ...defaultForWs, ...data.data, workspaceId } : defaultForWs;
      set({ settings: loaded, loading: false, error: null, loadedWorkspaceId: workspaceId });
    } catch (err: any) {
      set({
        loading: false,
        loadedWorkspaceId: null,
        error: err?.message || 'Settings could not be loaded. Retry before making changes.',
      });
    }
  },
  
  updateLocalSettingsStore: (newSettings: SystemSettings) => {
    set({ settings: newSettings });
  },

  saveSettings: async (workspaceId: string, updates: Partial<SystemSettings>) => {
    const state = get();
    if (state.loading || state.loadedWorkspaceId !== workspaceId || state.error) {
      set({ saveStatus: 'error', error: state.error || 'Settings must finish loading before they can be saved.' });
      return;
    }
    set({ saveStatus: 'saving', error: null });
    
    const previousSettings = get().settings;
    const updated = { ...previousSettings, ...updates };
    set({ settings: updated as SystemSettings });

    try {
      const { error } = await supabase.from('bos_records').upsert({ workspace_id: workspaceId, collection_name: 'settings', record_id: workspaceId, data: updated, is_soft_deleted: false, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id,collection_name,record_id' });
      if (error) throw error;
      
      set({ saveStatus: 'saved', error: null });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
    } catch (err: any) {
      console.error("Save settings failed:", err.message);
      // Revert optimistic update on failure!
      set({ settings: previousSettings, saveStatus: 'error', error: err.message || "Save operation failed" });
    }
  }
}));
