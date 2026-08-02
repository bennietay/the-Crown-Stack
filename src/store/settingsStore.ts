import { create } from 'zustand';
import { auth } from '../firebase';
import { SystemSettings } from '../types';

export const DEFAULT_BENNIE_SETTINGS: SystemSettings = {
  workspaceId: 'ws-bennie',
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
    firebaseConfigured: false,
    whatsappConfigured: false,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'usr-bennie',
};

interface SettingsState {
  settings: SystemSettings;
  loading: boolean;
  error: string | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  fetchSettings: (workspaceId: string) => Promise<void>;
  saveSettings: (workspaceId: string, updates: Partial<SystemSettings>) => Promise<void>;
  updateLocalSettingsStore: (newSettings: SystemSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_BENNIE_SETTINGS,
  loading: false,
  error: null,
  saveStatus: 'idle',
  
  fetchSettings: async (workspaceId: string) => {
    const current = get().settings;
    const defaultForWs = { ...DEFAULT_BENNIE_SETTINGS, workspaceId };
    
    // Ensure instant rendering by populating fallback immediately if workspace changed
    if (!current || current.workspaceId !== workspaceId) {
      set({ settings: defaultForWs, loading: true, error: null });
    } else {
      set({ loading: true, error: null });
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        set({ loading: false });
        return;
      }
      const token = await user.getIdToken();
      
      const res = await fetch(`/api/settings/${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = await res.json();
      set({ settings: data, loading: false });
    } catch (err: any) {
      // Graceful fallback to default settings without blocking UI
      set({ loading: false, error: null });
    }
  },
  
  updateLocalSettingsStore: (newSettings: SystemSettings) => {
    set({ settings: newSettings });
  },

  saveSettings: async (workspaceId: string, updates: Partial<SystemSettings>) => {
    set({ saveStatus: 'saving', error: null });
    
    const previousSettings = get().settings;
    const updated = { ...previousSettings, ...updates };
    set({ settings: updated as SystemSettings });

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Authentication required to update settings");
      }
      
      const token = await user.getIdToken();
      const res = await fetch(`/api/settings/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to update settings" }));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      
      set({ saveStatus: 'saved', error: null });
      setTimeout(() => set({ saveStatus: 'idle' }), 3000);
    } catch (err: any) {
      console.error("Save settings failed:", err.message);
      // Revert optimistic update on failure!
      set({ settings: previousSettings, saveStatus: 'error', error: err.message || "Save operation failed" });
    }
  }
}));
