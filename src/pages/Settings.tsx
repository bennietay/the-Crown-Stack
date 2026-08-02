import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { useAuthStore } from "@/src/store/authStore";
import { useSettingsStore, DEFAULT_BENNIE_SETTINGS } from "@/src/store/settingsStore";
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Building2,
  BadgeDollarSign,
  FormInput,
  Sliders,
  Plus,
  Trash2,
  Server,
  Globe,
  Clock,
  Target,
  Sparkles
} from "lucide-react";
import { SystemSettings } from "@/src/types";

type TabKey = "business" | "sales" | "leadGen" | "integrations";

export function Settings() {
  const user = useAuthStore(state => state.user);
  const workspace = useAuthStore(state => state.workspace);
  const { settings, loading, error, saveStatus, fetchSettings, saveSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<TabKey>("business");

  // Initialize immediately from store or default to ensure zero loading lag
  const defaultForCurrentWs = { ...DEFAULT_BENNIE_SETTINGS, workspaceId: workspace?.id || DEFAULT_BENNIE_SETTINGS.workspaceId };
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings || defaultForCurrentWs);

  useEffect(() => {
    if (workspace?.id) {
      fetchSettings(workspace.id);
    }
  }, [workspace?.id, fetchSettings]);

  useEffect(() => {
    if (settings) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    } else {
      setLocalSettings(defaultForCurrentWs);
    }
  }, [settings, workspace?.id]);

  const isAdmin = user?.role === "super_admin" || user?.role === "workspace_admin";

  if (!isAdmin) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">Only super administrators and workspace managers can modify operational settings.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (workspace?.id && localSettings) {
      saveSettings(workspace.id, localSettings);
    }
  };

  const updateBusiness = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, business: { ...prev.business, [key]: value } }));
  };

  const updateSales = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, sales: { ...prev.sales, [key]: value } }));
  };

  const updateLeadCapture = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, leadCapture: { ...prev.leadCapture, [key]: value } }));
  };

  const IntegrationStatus = ({ name, configured, subtitle }: { name: string, configured: boolean, subtitle?: string }) => (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
      <div>
        <span className="text-xs font-bold text-slate-900 block">{name}</span>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>
      {configured ? (
        <span className="flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300/60 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Active
        </span>
      ) : (
        <span className="flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-300/60 shadow-2xs">
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Standby
        </span>
      )}
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: any; description: string }[] = [
    { key: "business", label: "Business & Locale", icon: Building2, description: "Company profile & local targets" },
    { key: "sales", label: "Sales & Pricing", icon: BadgeDollarSign, description: "Tax rates, validity & SLAs" },
    { key: "leadGen", label: "Lead Capture & Cadence", icon: FormInput, description: "Public forms & follow-up tasks" },
    { key: "integrations", label: "Integrations", icon: Server, description: "Provider readiness & safe setup" },
  ];

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-slate-50/95 backdrop-blur-md z-20 pb-4 pt-2 -mt-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Settings Centre</h2>
            {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Business rules and conversion settings for <span className="font-semibold text-slate-800">{workspace?.name || 'Bennie OS'}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {saveStatus === 'saved' && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 flex items-center shadow-2xs">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600"/> Settings Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span title={error || undefined} className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200/80 flex items-center shadow-2xs">
              <AlertCircle className="w-4 h-4 mr-1.5 text-rose-600"/> {error || "Settings could not be saved"}
            </span>
          )}
          <Button onClick={handleSave} disabled={saveStatus === 'saving'} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs transition-all">
            {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}

      {/* TAB 1: BUSINESS & LOCALE */}
      {activeTab === "business" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Workspace Profile</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Business & Identity</CardTitle>
              <CardDescription className="text-xs">Primary organisation name and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['eyebrow', 'Hero eyebrow', 'Short category or positioning line'],
                  ['offerTitle', 'Form offer title', 'The specific value visitors request'],
                  ['ctaLabel', 'Primary button label', 'Use an outcome-focused action'],
                  ['responsePromise', 'Response promise', 'Set an honest response time'],
                ].map(([key, label, hint]) => (
                  <div className="space-y-1.5" key={key}>
                    <label className="text-xs font-bold text-slate-700">{label}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                      value={(localSettings.leadCapture as any)[key] || ''}
                      onChange={e => updateLeadCapture(key, e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Business / Hub Name</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.business.name} 
                  onChange={e => updateBusiness('name', e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">WhatsApp Contact Number</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.business.whatsappNumber || ''} 
                  onChange={e => updateBusiness('whatsappNumber', e.target.value)} 
                />
                <p className="text-[11px] text-slate-500">Default sender format for manual & automated notifications.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Monthly Target ({localSettings.business.currency})</span>
                  </label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.business.monthlyTarget} 
                    onChange={e => updateBusiness('monthlyTarget', Number(e.target.value))} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Lead SLA Response (Hours)</span>
                  </label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.business.leadSlaHours} 
                    onChange={e => updateBusiness('leadSlaHours', Number(e.target.value))} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Regional Settings</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Localization & Currency</CardTitle>
              <CardDescription className="text-xs">Financial currency symbol, language locale and timezone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Billing Currency</label>
                  <input 
                    type="text" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.business.currency} 
                    onChange={e => updateBusiness('currency', e.target.value)} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Locale Code</label>
                  <input 
                    type="text" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.business.locale} 
                    onChange={e => updateBusiness('locale', e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">System Timezone</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.business.timezone} 
                  onChange={e => updateBusiness('timezone', e.target.value)} 
                />
                <p className="text-[11px] text-slate-500">Controls scheduled automated cadence execution times.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Active Workspace Metadata</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  ID: <span className="font-mono bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-900">{workspace?.id}</span> | Type: <span className="font-semibold capitalize">{workspace?.type}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SALES & PRICING */}
      {activeTab === "sales" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <BadgeDollarSign className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Commercial Rules</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Tax & Proposal Validity</CardTitle>
              <CardDescription className="text-xs">Parameters for proposal generation and client billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">GST / Tax Rate (%)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.sales.taxRate} 
                    onChange={e => updateSales('taxRate', Number(e.target.value))} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Proposal Validity (Days)</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.sales.proposalValidityDays} 
                    onChange={e => updateSales('proposalValidityDays', Number(e.target.value))} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Default Proposal Owner ID</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all font-mono" 
                  value={localSettings.sales.defaultOwner || ''} 
                  onChange={e => updateSales('defaultOwner', e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Lead Scoring Thresholds</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Qualification Classification</CardTitle>
              <CardDescription className="text-xs">Scores determining Hot vs Warm lead tags.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Hot Score Threshold</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.sales.hotThreshold} 
                    onChange={e => updateSales('hotThreshold', Number(e.target.value))} 
                  />
                  <p className="text-[11px] text-slate-500">Leads with score ≥ this trigger high priority tasks.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Warm Score Threshold</label>
                  <input 
                    type="number" 
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.sales.warmThreshold} 
                    onChange={e => updateSales('warmThreshold', Number(e.target.value))} 
                  />
                  <p className="text-[11px] text-slate-500">Leads below this are flagged as Cold.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: LEAD CAPTURE & CADENCE */}
      {activeTab === "leadGen" && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <FormInput className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Public Intake Form</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Lead Capture Configuration</CardTitle>
              <CardDescription className="text-xs">Headlines, service offerings, and budget options for visitors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Form Main Headline</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.leadCapture.headline} 
                  onChange={e => updateLeadCapture('headline', e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Subheadline & Call To Action</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.leadCapture.subheadline} 
                  onChange={e => updateLeadCapture('subheadline', e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Submission Confirmation Message</label>
                <input 
                  type="text" 
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                  value={localSettings.leadCapture.successMessage} 
                  onChange={e => updateLeadCapture('successMessage', e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Benefit bullets (one per line)</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                    value={(localSettings.leadCapture.benefitBullets || []).join('\n')}
                    onChange={e => updateLeadCapture('benefitBullets', e.target.value.split('\n').map(item => item.trim()).filter(Boolean))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Privacy & trust note</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                    value={localSettings.leadCapture.trustNote || ''}
                    onChange={e => updateLeadCapture('trustNote', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Service Options (Comma separated)</label>
                  <textarea 
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.leadCapture.serviceOptions.join(", ")} 
                    onChange={e => updateLeadCapture('serviceOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Budget Tiers (Comma separated)</label>
                  <textarea 
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all" 
                    value={localSettings.leadCapture.budgetRanges.join(", ")} 
                    onChange={e => updateLeadCapture('budgetRanges', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Launch Timing Options (Comma separated)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                  value={(localSettings.leadCapture.timingOptions || []).join(", ")}
                  onChange={e => updateLeadCapture('timingOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['whatsappUrl', 'WhatsApp CTA URL', 'https://wa.me/60…'],
                  ['bookingUrl', '15-minute Booking URL', 'https://cal.com/…'],
                  ['privacyUrl', 'Privacy Policy URL', 'https://…/privacy'],
                  ['termsUrl', 'Terms URL', 'https://…/terms'],
                ].map(([key, label, placeholder]) => (
                  <div className="space-y-1.5" key={key}>
                    <label className="text-xs font-bold text-slate-700">{label}</label>
                    <input
                      type="url"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none transition-all"
                      placeholder={placeholder}
                      value={(localSettings.leadCapture as any)[key] || ''}
                      onChange={e => updateLeadCapture(key, e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">Leave blank to hide this public link.</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                {[
                  ['requireCompany', 'Require company'],
                  ['requirePhone', 'Require WhatsApp'],
                  ['requireCountry', 'Require country'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={(localSettings.leadCapture as any)[key] !== false}
                      onChange={e => updateLeadCapture(key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Standard Follow-Up Cadence</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Follow-up tasks created automatically when a new enquiry is captured.</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => setLocalSettings({...localSettings, cadence: [...localSettings.cadence, { day: 1, channel: 'email', title: 'Follow up task' }]})}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Step
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {localSettings.cadence.map((step, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    <div className="w-24 shrink-0">
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Day</label>
                      <input 
                        type="number" 
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900" 
                        value={step.day} 
                        onChange={e => {
                          const newCadence = [...localSettings.cadence];
                          newCadence[idx].day = Number(e.target.value);
                          setLocalSettings({...localSettings, cadence: newCadence});
                        }}
                      />
                    </div>
                    <div className="w-36 shrink-0">
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Channel</label>
                      <select 
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900" 
                        value={step.channel} 
                        onChange={e => {
                          const newCadence = [...localSettings.cadence];
                          newCadence[idx].channel = e.target.value as any;
                          setLocalSettings({...localSettings, cadence: newCadence});
                        }}
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="call">Call</option>
                        <option value="manual">Manual Task</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Task Description</label>
                      <input 
                        type="text" 
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900" 
                        value={step.title} 
                        onChange={e => {
                          const newCadence = [...localSettings.cadence];
                          newCadence[idx].title = e.target.value;
                          setLocalSettings({...localSettings, cadence: newCadence});
                        }}
                      />
                    </div>
                    <div className="sm:pt-5 shrink-0 flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-9 px-2.5" 
                        onClick={() => {
                          const newCadence = localSettings.cadence.filter((_, i) => i !== idx);
                          setLocalSettings({...localSettings, cadence: newCadence});
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: INTEGRATION READINESS */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <Card className="border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <Server className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Secure provider setup</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Integration readiness</CardTitle>
              <CardDescription className="text-xs">Secrets are configured in Vercel environment variables, never entered or stored in this browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-relaxed text-blue-950">
                Firebase Authentication and Firestore are required for launch. WhatsApp click-to-chat is free and recommended first. Online payments, email automation, and WhatsApp API are intentionally unavailable in this release.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <IntegrationStatus name="Firebase" configured={!!localSettings.integrations?.firebaseConfigured} subtitle="Authentication and durable CRM data" />
                <IntegrationStatus name="WhatsApp click-to-chat" configured={!!localSettings.leadCapture?.whatsappUrl} subtitle="Free manual conversations" />
                <IntegrationStatus name="Online payments" configured={false} subtitle="Not included in this release" />
                <IntegrationStatus name="Transactional email" configured={false} subtitle="Not included in this release" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <p className="font-bold text-slate-900">Deployment secret names</p>
                <p className="mt-1 font-mono text-[11px] break-words">FIREBASE_SERVICE_ACCOUNT_KEY</p>
                <p className="mt-2">Changing a secret later requires no code change—update the deployment environment and redeploy.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
