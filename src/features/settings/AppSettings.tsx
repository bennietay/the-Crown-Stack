import {
  Bell,
  Bot,
  Database,
  Palette,
  Rocket,
  Save,
  Shield,
  User,
  Zap
} from "lucide-react";
import { useState } from "react";
import type { DupliosUserProfile } from "../../types/tenant";
import { languageOptions, translate, type LanguageCode } from "../../lib/i18n";
import { createBillingPortalSession } from "../../lib/api";

type SettingsTab = "profile" | "fields" | "style" | "account" | "notifications" | "ai" | "org" | "enterprise";

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key: string, value: unknown) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

const makeBusinessId = (seed: string) =>
  seed
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .padEnd(10, "0")
    .slice(0, 10);

const makeApiKey = () => {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return `dpl_live_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
  { id: "profile", label: "Profile", icon: User },
  { id: "fields", label: "Fields", icon: Database },
  { id: "style", label: "Style", icon: Palette },
  { id: "account", label: "Account", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Config", icon: Zap },
  { id: "org", label: "Org Setup", icon: Shield },
  { id: "enterprise", label: "Enterprise", icon: Rocket }
];

export function AppSettings({
  profile,
  theme,
  onToggleTheme,
  audienceMode,
  onAudienceModeChange,
  language,
  onLanguageChange,
  onNavigate
}: {
  profile: DupliosUserProfile;
  theme: "bright" | "dark";
  onToggleTheme: () => void;
  audienceMode: "new_joiner" | "growing" | "leader";
  onAudienceModeChange: (mode: "new_joiner" | "growing" | "leader") => void;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  onNavigate: (view: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-4 py-6 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="rounded-[30px] border border-[#dedfe4] bg-white p-7 shadow-sm">
          <h1 className="text-3xl font-black text-[#18191f]">{translate(language, "settings.title")}</h1>
          <p className="mt-1 text-sm text-[#626873]">{translate(language, "settings.subtitle")}</p>
        </header>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black ${
                  activeTab === tab.id ? "bg-white text-[#18191f] shadow-sm" : "text-[#394150]"
                }`}
              >
                <Icon size={15} />
                {translate(
                  language,
                  tab.id === "profile"
                    ? "settings.profile"
                    : tab.id === "fields"
                      ? "settings.fields"
                      : tab.id === "style"
                        ? "settings.style"
                        : tab.id === "account"
                          ? "settings.account"
                          : tab.id === "notifications"
                            ? "settings.notifications"
                            : tab.id === "ai"
                              ? "settings.ai"
                              : tab.id === "org"
                                ? "settings.org"
                                : "settings.enterprise"
                )}
              </button>
            );
          })}
        </nav>

        <main className="mt-4 rounded-[24px] border border-[#dedfe4] bg-white p-5 shadow-sm sm:p-8">
          {activeTab === "profile" ? (
            <ProfileTab
              profile={profile}
              audienceMode={audienceMode}
              onAudienceModeChange={onAudienceModeChange}
              language={language}
              onLanguageChange={onLanguageChange}
              onSave={save}
              saved={saved}
            />
          ) : null}
          {activeTab === "fields" ? <FieldsTab onSave={save} saved={saved} /> : null}
          {activeTab === "style" ? <StyleTab theme={theme} onToggleTheme={onToggleTheme} onSave={save} saved={saved} /> : null}
          {activeTab === "account" ? <AccountTab profile={profile} onSave={save} saved={saved} onNavigate={onNavigate} /> : null}
          {activeTab === "notifications" ? <NotificationsTab onSave={save} saved={saved} /> : null}
          {activeTab === "ai" ? <AIConfigTab onSave={save} saved={saved} /> : null}
          {activeTab === "org" ? <OrgSetupTab onSave={save} saved={saved} /> : null}
          {activeTab === "enterprise" ? <EnterpriseTab onSave={save} saved={saved} /> : null}
        </main>
      </section>
    </div>
  );
}

function ProfileTab({
  profile,
  audienceMode,
  onAudienceModeChange,
  language,
  onLanguageChange,
  onSave,
  saved
}: {
  profile: DupliosUserProfile;
  audienceMode: "new_joiner" | "growing" | "leader";
  onAudienceModeChange: (mode: "new_joiner" | "growing" | "leader") => void;
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  onSave: () => void;
  saved: boolean;
}) {
  const [profileDraft, setProfileDraft] = useState(() =>
    readStored(`duplios-profile-${profile.uid}`, {
      displayName: profile.displayName,
      bio: "",
      teamName: profile.displayName.split(" ")[0] || "My Team"
    })
  );
  const saveProfile = () => {
    writeStored(`duplios-profile-${profile.uid}`, profileDraft);
    onSave();
  };

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label={translate(language, "settings.displayName")} value={profileDraft.displayName} onChange={(value) => setProfileDraft((current) => ({ ...current, displayName: value }))} />
        <Field label={translate(language, "settings.bio")} value={profileDraft.bio} textarea placeholder="Tell your prospects about your mission..." onChange={(value) => setProfileDraft((current) => ({ ...current, bio: value }))} />
        <Field label={translate(language, "settings.teamName")} value={profileDraft.teamName} onChange={(value) => setProfileDraft((current) => ({ ...current, teamName: value }))} />
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">
            {translate(language, "settings.language")}
          </span>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.target.value as LanguageCode)}
            className="h-12 w-full rounded-xl border border-[#dedfe4] bg-[#f7f7f8] px-4 text-sm"
          >
            {languageOptions.map((option) => (
              <option key={option.code} value={option.code}>{option.label}</option>
            ))}
          </select>
          <span className="mt-2 block text-xs italic text-[#7d828c]">
            {translate(language, "settings.languageHelp")}
          </span>
        </label>
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">
            {translate(language, "settings.memberStage")}
          </span>
          <select
            value={audienceMode}
            onChange={(event) => onAudienceModeChange(event.target.value as "new_joiner" | "growing" | "leader")}
            className="h-12 w-full rounded-xl border border-[#dedfe4] bg-[#f7f7f8] px-4 text-sm"
          >
            <option value="new_joiner">{translate(language, "stage.newJoiner")}</option>
            <option value="growing">{translate(language, "stage.growing")}</option>
            <option value="leader">{translate(language, "stage.leader")}</option>
          </select>
          <span className="mt-2 block text-xs italic text-[#7d828c]">
            {translate(language, "settings.memberStageHelp")}
          </span>
        </label>
      </div>
      <SaveButton onSave={saveProfile} saved={saved} label={translate(language, "settings.save")} />
    </div>
  );
}

function FieldsTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [fields, setFields] = useState(() =>
    readStored("duplios-lead-fields", ["Lead Source", "Temperature", "Next Follow-up", "Product Interest"])
  );
  const saveFields = () => {
    writeStored("duplios-lead-fields", fields.filter((field) => field.trim()));
    onSave();
  };
  return (
    <div>
      <p className="text-xl font-black text-[#18191f]">Custom Lead Fields</p>
      <p className="mt-1 text-sm text-[#626873]">Control the CRM fields your team uses for prospect tracking.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {fields.map((field, index) => (
          <div key={index} className="flex gap-2">
            <input value={field} onChange={(event) => setFields((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="h-12 min-w-0 flex-1 rounded-xl border border-[#dedfe4] bg-[#f7f7f8] px-4 text-sm" />
            <button onClick={() => setFields((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-12 rounded-xl border border-[#dedfe4] px-3 text-sm font-black">Remove</button>
          </div>
        ))}
      </div>
      <button onClick={() => setFields((current) => [...current, "New Field"])} className="mt-5 h-11 rounded-xl border border-[#dedfe4] px-5 text-sm font-black">Add Field</button>
      <SaveButton onSave={saveFields} saved={saved} label="Save Fields" />
    </div>
  );
}

function StyleTab({ theme, onToggleTheme, onSave, saved }: { theme: "bright" | "dark"; onToggleTheme: () => void; onSave: () => void; saved: boolean }) {
  const [accent, setAccent] = useState(() => readStored("duplios-accent", "#2563eb"));
  const saveStyle = () => {
    writeStored("duplios-accent", accent);
    document.documentElement.style.setProperty("--duplios-accent", accent);
    onSave();
  };
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <p className="text-xl font-black text-[#18191f]">Interface Theme</p>
        <p className="mt-2 text-sm text-[#626873]">Choose your preferred visual style for the application.</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {["bright", "dark"].map((mode) => (
            <button key={mode} onClick={theme === mode ? undefined : onToggleTheme} className={`rounded-2xl border p-4 ${theme === mode ? "border-[#2563eb]" : "border-[#dedfe4]"}`}>
              <div className={`flex h-20 items-center justify-center rounded-xl ${mode === "dark" ? "bg-[#09090b] text-white" : "bg-white text-[#f59e0b] shadow-sm"}`}>
                {mode === "dark" ? "☾" : "☼"}
              </div>
              <p className="mt-3 text-sm font-black capitalize">{mode === "bright" ? "Light" : "Dark"} Mode</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xl font-black text-[#18191f]">Brand Identity</p>
        <p className="mt-2 text-sm text-[#626873]">Customize the primary accent color used throughout your CRM.</p>
        <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[#dedfe4] bg-[#f7f7f8] p-4">
          <span className="h-14 w-14 rounded-xl" style={{ background: accent }} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">Hex Code</p>
            <p className="font-black text-[#18191f]">{accent}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {["#111827", "#2563eb", "#35b779", "#f43f5e", "#8b5cf6", "#f59e0b", "#37b8cf"].map((color) => (
            <button key={color} onClick={() => setAccent(color)} className="h-9 w-9 rounded-xl border border-[#dedfe4]" style={{ background: color }} />
          ))}
        </div>
        <SaveButton onSave={saveStyle} saved={saved} label="Save Style" />
      </div>
    </div>
  );
}

function AccountTab({
  profile,
  onSave,
  saved,
  onNavigate
}: {
  profile: DupliosUserProfile;
  onSave: () => void;
  saved: boolean;
  onNavigate: (view: string) => void;
}) {
  const [businessId, setBusinessId] = useState(() => readStored(`duplios-business-id-${profile.uid}`, makeBusinessId(profile.uid)));
  const [leaderId, setLeaderId] = useState(() => readStored(`duplios-leader-id-${profile.uid}`, ""));
  const [emailAlerts, setEmailAlerts] = useState(() => readStored(`duplios-email-alerts-${profile.uid}`, true));
  const [sprintMode, setSprintMode] = useState(() => readStored(`duplios-sprint-mode-${profile.uid}`, false));
  const [billingStatus, setBillingStatus] = useState("Open the billing portal to update cards, invoices, cancellations, and plan changes.");
  const [linkStatus, setLinkStatus] = useState(() =>
    leaderId ? `Linked to leader Business ID ${leaderId}.` : "No leader link configured."
  );
  const saveAccount = () => {
    writeStored(`duplios-business-id-${profile.uid}`, businessId);
    writeStored(`duplios-leader-id-${profile.uid}`, leaderId);
    writeStored(`duplios-email-alerts-${profile.uid}`, emailAlerts);
    writeStored(`duplios-sprint-mode-${profile.uid}`, sprintMode);
    onSave();
  };
  const linkLeader = () => {
    if (!leaderId.trim()) {
      setLinkStatus("Enter a leader Business ID before linking.");
      return;
    }
    writeStored(`duplios-leader-id-${profile.uid}`, leaderId.trim().toUpperCase());
    setLeaderId(leaderId.trim().toUpperCase());
    setLinkStatus(`Linked to leader Business ID ${leaderId.trim().toUpperCase()}.`);
    onSave();
  };
  const toggleSprintMode = (value: boolean) => {
    setSprintMode(value);
    writeStored(`duplios-sprint-mode-${profile.uid}`, value);
    if (value) {
      onNavigate("sales-sprint");
    }
  };
  const openBillingPortal = async () => {
    try {
      setBillingStatus("Opening Stripe billing portal...");
      const { url } = await createBillingPortalSession(profile.tenantId);
      window.location.href = url;
    } catch (error) {
      setBillingStatus(error instanceof Error ? error.message : "Unable to open billing portal.");
    }
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <CardShell title="Your Business ID" body="Share this with your team members to link them.">
          <div className="mt-4 flex gap-3">
            <input value={businessId} onChange={(event) => setBusinessId(event.target.value)} className="h-12 flex-1 rounded-xl border border-[#dedfe4] px-4 text-center text-lg font-black tracking-[0.2em]" />
            <button onClick={() => void navigator.clipboard.writeText(businessId)} className="h-12 rounded-xl bg-[#9bb4ff] px-5 text-white">Copy</button>
          </div>
        </CardShell>
        <CardShell title="Link to Business Leader" body="Enter your leader's Business ID to connect.">
          <div className="mt-4 flex gap-3">
            <input value={leaderId} onChange={(event) => setLeaderId(event.target.value.toUpperCase())} placeholder="Enter Business ID" className="h-12 flex-1 rounded-xl border border-[#dedfe4] px-4 text-center text-sm font-black uppercase" />
            <button onClick={linkLeader} className="h-12 rounded-xl bg-[#9bb4ff] px-5 font-black text-white">Link</button>
          </div>
          <p className="mt-3 text-xs text-[#626873]">{linkStatus}</p>
        </CardShell>
      </div>
      <div className="rounded-2xl border border-[#bdd0ff] bg-[#f2f5ff] p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#18191f]">Subscription Infrastructure</p>
            <p className="mt-1 text-sm text-[#626873]">Current scale: {profile.tier === "empire" ? "Elite Sovereign" : profile.tier}</p>
          </div>
          <span className="rounded-full bg-[#2f62ed] px-3 py-1 text-xs font-black uppercase text-white">Elite</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <MetricPill label="Lead Usage" value="0" note="of 1,000,000" />
          <MetricPill label="Member Usage" value="0" note="of 1,000" />
          <MetricPill label="Trial Clock" value="--" note="days left" />
        </div>
        <button onClick={openBillingPortal} className="mt-4 h-11 w-full rounded-xl bg-[#2f62ed] text-sm font-black text-white">
          Open Billing Portal
        </button>
        <p className="mt-3 text-xs text-[#626873]">{billingStatus}</p>
      </div>
      <ToggleRow title="Sprint Mode" body="Focus on a 7-day sales sprint. Turning this on opens the Sales Sprint workspace and persists the setting." checked={sprintMode} onChange={toggleSprintMode} />
      <ToggleRow title="Email Notifications" body="Get notified when a new lead is captured." checked={emailAlerts} onChange={setEmailAlerts} />
      <SaveButton onSave={saveAccount} saved={saved} label="Save Account" />
    </div>
  );
}

function NotificationsTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [settings, setSettings] = useState(() => readStored("duplios-notification-settings", [true, true, true, true]));
  const saveNotifications = () => {
    writeStored("duplios-notification-settings", settings);
    onSave();
  };
  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]"><Bell /></span>
        <div>
          <p className="text-xl font-black text-[#18191f]">Notification Preferences</p>
          <p className="text-sm text-[#626873]">Control how and when you receive updates about your business.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {["Email Notifications", "Push Notifications", "Task Reminders", "New Lead Alerts"].map((label, index) => (
          <ToggleRow key={label} title={label} body="Receive timely alerts for immediate action." checked={settings[index]} onChange={(value) => setSettings((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} />
        ))}
      </div>
      <SaveButton onSave={saveNotifications} saved={saved} label="Save Preferences" />
    </div>
  );
}

function AIConfigTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [provider, setProvider] = useState(() => readStored("duplios-ai-provider", "Gemini"));
  const modelOptions =
    provider === "Gemini"
      ? ["gemini-3-flash-preview", "gemini-3-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"]
      : provider === "DeepSeek"
        ? ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"]
        : ["gpt-5.2", "gpt-5.2-pro", "gpt-5-mini", "gpt-5-nano"];
  const [model, setModel] = useState(() => readStored("duplios-ai-model", "gemini-3-flash-preview"));
  const saveAi = () => {
    writeStored("duplios-ai-provider", provider);
    writeStored("duplios-ai-model", model);
    onSave();
  };

  return (
    <CardShell title="AI Model Configuration" body="Select your preferred AI engine and version for scripts and coach.">
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
        {["Gemini", "DeepSeek", "OpenAI"].map((item) => <button key={item} onClick={() => {
          setProvider(item);
          setModel(item === "Gemini" ? "gemini-3-flash-preview" : item === "DeepSeek" ? "deepseek-v4-flash" : "gpt-5.2");
        }} className={`h-11 rounded-xl border text-sm font-black ${provider === item ? "border-[#2f62ed] text-[#2f62ed]" : "border-[#dedfe4]"}`}>{item}</button>)}
        <select value={model} onChange={(event) => setModel(event.target.value)} className="h-11 rounded-xl border border-[#dedfe4] px-4">
          {modelOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      <p className="mt-5 rounded-xl border border-[#bdd0ff] bg-[#f2f5ff] p-3 text-sm text-[#2f62ed]">
        {provider} is available for script generation. Add the provider key in Vercel or your local `.env`.
      </p>
      <SaveButton onSave={saveAi} saved={saved} label="Save Config" />
    </CardShell>
  );
}

function OrgSetupTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [transferId, setTransferId] = useState("");
  const [transferStatus, setTransferStatus] = useState("Leadership transfer has not been requested.");
  const requestTransfer = () => {
    if (!transferId.trim()) {
      setTransferStatus("Enter the new leader Business ID before requesting transfer.");
      return;
    }
    setTransferStatus(`Transfer request prepared for ${transferId.trim().toUpperCase()}. Confirm this in Superadmin access controls before applying.`);
    onSave();
  };
  return (
    <div className="space-y-6">
      <CardShell title="Organization Active" body="BZH0J6VKBTGXY2OZMO72">
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MetricPill label="Governance Role" value="Organization Super Admin" note="You have full authority." />
          <MetricPill label="Global Automation" value="Enabled" note="Lead routing is active." />
        </div>
        <SaveButton onSave={onSave} saved={saved} label="Manage Org" />
      </CardShell>
      <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5">
        <p className="text-xl font-black text-[#18191f]">Transfer Leadership?</p>
        <p className="mt-2 text-sm text-[#626873]">Enter a new leader Business ID. You will lose Super Admin access upon transfer.</p>
        <div className="mt-4 flex gap-3">
          <input value={transferId} onChange={(event) => setTransferId(event.target.value.toUpperCase())} placeholder="New leader Business ID" className="h-11 rounded-xl border border-[#dedfe4] px-4" />
          <button onClick={requestTransfer} className="h-11 rounded-xl bg-[#f59e0b] px-5 text-sm font-black text-white">{saved ? "Prepared" : "Prepare Transfer"}</button>
        </div>
        <p className="mt-3 text-xs text-[#626873]">{transferStatus}</p>
      </div>
    </div>
  );
}

function EnterpriseTab({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [apiVisible, setApiVisible] = useState(false);
  const [domain, setDomain] = useState(() => readStored("duplios-custom-domain", ""));
  const [domainStatus, setDomainStatus] = useState(() =>
    domain ? `Domain ${domain} saved. Add DNS CNAME to your Vercel deployment before going live.` : "No custom domain connected."
  );
  const [apiKey, setApiKey] = useState(() => readStored("duplios-platform-api-key", ""));
  const connectDomain = () => {
    const normalized = domain.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) {
      setDomainStatus("Enter a valid domain, for example app.yourdomain.com.");
      return;
    }
    writeStored("duplios-custom-domain", normalized);
    setDomain(normalized);
    setDomainStatus(`Domain ${normalized} saved. Add it in Vercel Domains and point DNS before launch.`);
    onSave();
  };
  const generateKey = () => {
    const key = makeApiKey();
    writeStored("duplios-platform-api-key", key);
    setApiKey(key);
    setApiVisible(true);
    onSave();
  };
  return (
    <CardShell title="Enterprise Infrastructure" body="Global scalability and integration tools for high-demand organizations.">
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <CardShell title="Custom Domains" body="Host recruitment landing pages on your own domain.">
          <input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="yourdomain.com" className="mt-4 h-12 w-full rounded-xl border border-[#dedfe4] px-4" />
          <button onClick={connectDomain} className="mt-3 h-11 w-full rounded-xl bg-[#2f62ed] text-sm font-black text-white">Save Domain</button>
          <p className="mt-3 text-xs text-[#626873]">{domainStatus}</p>
        </CardShell>
        <CardShell title="Platform API" body="Integrate your growth engine via secure API keys and webhooks.">
          <div className="mt-4 flex rounded-xl border border-[#dedfe4] bg-[#f7f7f8] px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{apiVisible && apiKey ? apiKey : apiKey ? "dpl_live_************************" : "No key generated"}</span>
            <button onClick={() => setApiVisible((visible) => !visible)} className="text-xs font-black text-[#2f62ed]">Reveal</button>
          </div>
          <button onClick={generateKey} className="mt-3 h-11 w-full rounded-xl border border-[#dedfe4] text-sm font-black">{apiKey ? "Rotate API Key" : "Generate API Key"}</button>
        </CardShell>
      </div>
      <div className="mt-6 rounded-2xl border border-[#dedfe4] p-5">
        <p className="text-xl font-black text-[#18191f]">Lifecycle & Retention</p>
        <p className="mt-2 text-sm text-[#626873]">Your current plan allows for <strong>3650 days</strong> of historical data audit.</p>
      </div>
    </CardShell>
  );
}

function Field({
  label,
  value,
  textarea = false,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  textarea?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className="min-h-32 w-full resize-none rounded-xl border border-[#dedfe4] bg-[#f7f7f8] p-4 text-sm" />
      ) : (
        <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} className="h-12 w-full rounded-xl border border-[#dedfe4] bg-[#f7f7f8] px-4 text-sm" />
      )}
    </label>
  );
}

function SaveButton({ onSave, saved, label }: { onSave: () => void; saved: boolean; label: string }) {
  return <button onClick={onSave} className="mt-6 ml-auto flex h-11 items-center gap-2 rounded-xl bg-[#2f62ed] px-6 text-sm font-black text-white"><Save size={16} />{saved ? "Saved" : label}</button>;
}

function CardShell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#dedfe4] bg-white p-5"><p className="text-lg font-black text-[#18191f]">{title}</p><p className="mt-1 text-sm text-[#626873]">{body}</p>{children}</section>;
}

function ToggleRow({ title, body, checked, onChange }: { title: string; body: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#dedfe4] bg-[#fbfcff] p-5"><div><p className="font-black text-[#18191f]">{title}</p><p className="mt-1 text-sm text-[#626873]">{body}</p></div><button onClick={() => onChange(!checked)} className={`h-6 w-11 rounded-full p-1 ${checked ? "bg-[#2f62ed]" : "bg-[#c7c9ce]"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} /></button></div>;
}

function MetricPill({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-xl border border-[#dedfe4] bg-white p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">{label}</p><p className="mt-1 text-2xl font-black text-[#18191f]">{value}</p><p className="mt-1 text-xs text-[#626873]">{note}</p></div>;
}
