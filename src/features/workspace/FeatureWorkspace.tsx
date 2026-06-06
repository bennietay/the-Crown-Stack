import {
  Cloud,
  Clock,
  Copy as CopyIcon,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  CheckSquare,
  HeartHandshake,
  Library,
  MessageSquare,
  Network,
  Play,
  Plus,
  Rocket,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trash2,
  Video,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import type {
  AutomationSequence,
  FastStartPlan,
  FollowUpStep,
  LeadRecord,
  OutreachTask,
  ScriptAsset,
  TeamMemberNode
} from "../../types/tenant";
import { createCustomerProfile, listCustomerProfiles, logCustomerPurchase, updateCustomerProfile, generateAiScript } from "../../lib/api";
import { trackDupliosEvent } from "../../lib/tracking";

interface FeatureWorkspaceProps {
  feature: "growth-crm" | "playbook" | "sales-sprint" | "resource-vault" | "tasks" | "events" | "ai-scripts" | "linkedin" | "team-metrics" | "team-hub" | "automation";
  leads: LeadRecord[];
  scripts: ScriptAsset[];
  outreachTasks: OutreachTask[];
  teamNodes: TeamMemberNode[];
  automationSequences: AutomationSequence[];
  fastStartPlan: FastStartPlan[];
}

const featureMeta = {
  "growth-crm": {
    title: "Growth CRM",
    eyebrow: "Relationship pipeline",
    icon: Users,
    body: "Track every relationship, trust note, next care touch, source, temperature, and follow-up date."
  },
  playbook: {
    title: "Playbook",
    eyebrow: "Training system",
    icon: BookOpen,
    body: "Give builders a simple operating manual for invites, follow-up, demos, and duplication."
  },
  "sales-sprint": {
    title: "Sales Sprint",
    eyebrow: "7-day push",
    icon: Zap,
    body: "Run a short campaign around adding leads, sending invites, booking overviews, and follow-up."
  },
  "resource-vault": {
    title: "Resource Vault",
    eyebrow: "Assets",
    icon: Library,
    body: "Centralize scripts, videos, images, proof assets, and approved share links."
  },
  tasks: {
    title: "Tasks",
    eyebrow: "Execution",
    icon: CheckSquare,
    body: "Turn the business into daily checkboxes that a new joiner can complete without guessing."
  },
  events: {
    title: "Events",
    eyebrow: "Zooms, webinars, presentations",
    icon: Play,
    body: "Create events, invite leads, track no-shows, and generate follow-up lists after every presentation."
  },
  "ai-scripts": {
    title: "AI Scripts",
    eyebrow: "Message support",
    icon: Bot,
    body: "Draft compliant invite, follow-up, and objection-handling scripts from proven templates."
  },
  linkedin: {
    title: "Social Outreach",
    eyebrow: "Multi-platform outreach",
    icon: Network,
    body: "Plan, copy, track, and complete LinkedIn, Instagram, Facebook, WhatsApp, and SMS outreach touches."
  },
  "team-metrics": {
    title: "Team Metrics",
    eyebrow: "Performance",
    icon: BarChart3,
    body: "Track PV, team volume, rank readiness, active builders, and duplication score."
  },
  "team-hub": {
    title: "Team Hub",
    eyebrow: "Leadership",
    icon: Users,
    body: "Coordinate sponsor check-ins, frontline support, and fast-start coaching."
  },
  automation: {
    title: "Automation",
    eyebrow: "Sequences",
    icon: MessageSquare,
    body: "Automate the repeatable follow-up and onboarding flows that keep momentum alive."
  }
};

export function FeatureWorkspace({
  feature,
  leads,
  scripts,
  outreachTasks,
  teamNodes,
  automationSequences,
  fastStartPlan
}: FeatureWorkspaceProps) {
  const meta = featureMeta[feature];
  const Icon = meta.icon;
  const [crmCreateSignal, setCrmCreateSignal] = useState(0);
  const canAddAction = feature === "growth-crm" || feature === "linkedin";
  const handleAddAction = () => {
    if (feature === "growth-crm") {
      setCrmCreateSignal((current) => current + 1);
      return;
    }

    if (feature === "linkedin") {
      document.getElementById("social-outreach-queue")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>("[data-social-target-input='true']")?.focus();
      }, 250);
      return;
    }
  };

  if (feature === "resource-vault") {
    return <ResourceVault />;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-8 xl:px-10">
      <section className="rounded-[22px] border border-[#dedfe4] bg-white p-4 shadow-[0_4px_14px_rgba(19,25,38,0.08)] sm:rounded-[30px] sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f62ed] text-white">
              <Icon size={23} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2f62ed]">{meta.eyebrow}</p>
              <h1 className="text-3xl font-black text-[#18191f]">{meta.title}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#626873]">{meta.body}</p>
            </div>
          </div>
          {canAddAction ? (
            <button
              onClick={handleAddAction}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white sm:w-auto"
            >
              Add Action
            </button>
          ) : null}
        </div>

        <FeatureContent
          feature={feature}
          leads={leads}
          scripts={scripts}
          outreachTasks={outreachTasks}
          teamNodes={teamNodes}
          automationSequences={automationSequences}
          fastStartPlan={fastStartPlan}
          crmCreateSignal={crmCreateSignal}
        />
      </section>
    </div>
  );
}

type ResourceCategory = "all" | "training" | "marketing" | "scripts" | "book-summaries" | "legal";

interface VaultResource {
  id: string;
  title: string;
  description: string;
  category: Exclude<ResourceCategory, "all">;
  type: "script" | "training" | "summary" | "marketing" | "legal";
  views: number;
  audience: "B" | "G" | "P";
  featured?: boolean;
  content: string;
  externalUrl?: string;
}

const resourceCategories: Array<{ id: ResourceCategory; label: string; icon: React.ElementType }> = [
  { id: "all", label: "All Resources", icon: BookOpen },
  { id: "training", label: "Training", icon: Play },
  { id: "marketing", label: "Marketing", icon: FileText },
  { id: "scripts", label: "Scripts", icon: Edit3 },
  { id: "book-summaries", label: "Book Summaries", icon: Library },
  { id: "legal", label: "Legal", icon: Shield }
];

const defaultResources: VaultResource[] = [
  {
    id: "busy-rebuttal",
    title: "The 'I'm Just Too Busy' Rebuttal",
    description: "Exactly what to say when someone uses the time objection.",
    category: "scripts",
    type: "script",
    views: 0,
    audience: "B",
    content:
      "A short objection script that validates their schedule, reframes the ask as a 60-second overview, and moves the prospect toward a simple yes/no next step."
  },
  {
    id: "fortune-follow-up",
    title: "The Fortune is in the Follow-Up",
    description: "A system for staying top-of-mind without being annoying.",
    category: "training",
    type: "training",
    views: 0,
    audience: "G",
    content:
      "Train new joiners to follow up with value, context, and permission. Includes day 1, day 3, day 7, and day 14 message angles.",
    externalUrl: "https://www.youtube.com/results?search_query=network+marketing+follow+up+training"
  },
  {
    id: "warm-market-opener",
    title: "Warm Market Opener",
    description: "A low-pressure invite for people who already know and trust you.",
    category: "scripts",
    type: "script",
    views: 14,
    audience: "B",
    content:
      "Hey, I thought of you because I am testing a simple wellness reset with a few people this week. Want me to send the short overview?"
  },
  {
    id: "not-now-follow-up",
    title: "'Not Right Now' Follow-Up",
    description: "A respectful follow-up that keeps the relationship open.",
    category: "scripts",
    type: "script",
    views: 8,
    audience: "B",
    content:
      "Totally understand. I will not push. Would it be okay if I checked back in a couple of weeks and sent one helpful note in the meantime?"
  },
  {
    id: "presentation-confirmation",
    title: "Presentation Confirmation Script",
    description: "Confirm the appointment and reduce no-shows before the overview.",
    category: "scripts",
    type: "script",
    views: 11,
    audience: "G",
    content:
      "Looking forward to our quick overview tomorrow. I will keep it simple: what it is, who it is for, and whether the product or business side fits you better."
  },
  {
    id: "referral-request",
    title: "Referral Request Script",
    description: "Ask happy prospects and customers for names without pressure.",
    category: "scripts",
    type: "script",
    views: 6,
    audience: "G",
    content:
      "Who do you know who might appreciate a simple reset like this? I can send them a short note only if you feel comfortable introducing us."
  },
  {
    id: "leader-reactivation",
    title: "Inactive Builder Reactivation",
    description: "A sponsor message to help inactive builders take one small action.",
    category: "scripts",
    type: "script",
    views: 5,
    audience: "P",
    content:
      "No guilt at all. Let us restart small today: add three names and send one approved invite. Reply done and I will help with the next step."
  },
  {
    id: "scale-platinum",
    title: "Scale to Platinum: Comp Plan Deep Dive",
    description: "Unlock the secrets of the compensation structure to maximize your profit.",
    category: "training",
    type: "training",
    views: 0,
    audience: "P",
    featured: true,
    content:
      "A leader training asset for volume mechanics, frontline depth, rank path milestones, and duplication behaviors that drive team growth.",
    externalUrl: "https://www.youtube.com/results?search_query=network+marketing+compensation+plan+training"
  },
  {
    id: "atomic-habits",
    title: "Book Summary: Atomic Habits",
    description: "Tiny behavior design lessons for consistent daily prospecting.",
    category: "book-summaries",
    type: "summary",
    views: 12,
    audience: "B",
    content:
      "Key takeaway: make the desired action obvious, attractive, easy, and satisfying. For duplication, reduce each day to one lead, one follow-up, one training touch, and one logged result.",
    externalUrl: "https://jamesclear.com/atomic-habits-summary"
  },
  {
    id: "go-giver",
    title: "Book Summary: The Go-Giver",
    description: "A relationship-first model for referrals, trust, and long-term influence.",
    category: "book-summaries",
    type: "summary",
    views: 9,
    audience: "G",
    content:
      "Key takeaway: value precedes compensation. Teach builders to lead with useful help, clear invitations, and genuine follow-through rather than pressure.",
    externalUrl: "https://thegogiver.com/"
  },
  {
    id: "compound-effect",
    title: "Book Summary: The Compound Effect",
    description: "How small daily actions create outsized business momentum.",
    category: "book-summaries",
    type: "summary",
    views: 7,
    audience: "B",
    content:
      "Key takeaway: success comes from repeated small choices. A new joiner does not need a perfect pitch; they need a repeatable daily rhythm and tracking.",
    externalUrl: "https://www.thecompoundeffect.com/"
  },
  {
    id: "never-split-difference",
    title: "Book Summary: Never Split the Difference",
    description: "Conversation tools for listening, labeling, and handling objections.",
    category: "book-summaries",
    type: "summary",
    views: 10,
    audience: "G",
    content:
      "Key takeaway: people feel safer when they feel heard. Use labels like 'sounds like timing matters' before asking a calibrated next-step question.",
    externalUrl: "https://www.blackswanltd.com/never-split-the-difference"
  },
  {
    id: "building-storybrand",
    title: "Book Summary: Building a StoryBrand",
    description: "Clarify messaging so prospects understand the offer fast.",
    category: "book-summaries",
    type: "summary",
    views: 13,
    audience: "P",
    content:
      "Key takeaway: the prospect is the hero, not the company. Position the product, plan, or business as the guide that helps them solve a clear problem.",
    externalUrl: "https://storybrand.com/"
  },
  {
    id: "story-proof",
    title: "Instagram Story Proof Pack",
    description: "Reusable compliant story prompts for curiosity and replies.",
    category: "marketing",
    type: "marketing",
    views: 18,
    audience: "G",
    content:
      "Includes curiosity poll angles, before/after-safe framing, lifestyle proof, and CTA patterns that invite private conversations."
  },
  {
    id: "linkedin-authority-posts",
    title: "LinkedIn Authority Post Pack",
    description: "Professional post prompts for health, leadership, and lifestyle conversations.",
    category: "marketing",
    type: "marketing",
    views: 15,
    audience: "G",
    content:
      "Includes problem-aware posts, lesson posts, soft CTAs, and comment prompts designed to start conversations without hype."
  },
  {
    id: "customer-proof-carousel",
    title: "Customer Proof Carousel Outline",
    description: "A compliant carousel structure for customer stories and product education.",
    category: "marketing",
    type: "marketing",
    views: 16,
    audience: "G",
    content:
      "Slides: problem, simple routine, customer context, what changed, disclaimer, invitation to ask for the private overview."
  },
  {
    id: "seven-day-challenge",
    title: "7-Day Wellness Challenge Campaign",
    description: "A short campaign framework for generating new conversations.",
    category: "marketing",
    type: "marketing",
    views: 21,
    audience: "P",
    content:
      "Use daily prompts, check-in stories, simple tracking, and a final invitation to learn the product or builder path."
  },
  {
    id: "lead-magnet-checklist",
    title: "Lead Magnet: Daily Reset Checklist",
    description: "A simple downloadable checklist concept for sales pages and DMs.",
    category: "marketing",
    type: "marketing",
    views: 12,
    audience: "B",
    content:
      "A one-page routine checklist with morning, midday, and evening reset habits plus a CTA to request the private overview."
  },
  {
    id: "income-disclaimer",
    title: "Income Claim Safety Checklist",
    description: "A quick compliance review before posting earnings or rank content.",
    category: "legal",
    type: "legal",
    views: 4,
    audience: "P",
    content:
      "Avoid guarantees, show typicality disclosures, keep claims substantiated, and route sensitive content through leader or compliance review before publishing."
  }
];

function ResourceVault() {
  const [resources, setResources] = useState(defaultResources);
  const [activeCategory, setActiveCategory] = useState<ResourceCategory>("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"latest" | "trends">("latest");
  const [driveRestricted, setDriveRestricted] = useState(true);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = resources.filter((resource) => {
      const matchesCategory = activeCategory === "all" || resource.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${resource.title} ${resource.description} ${resource.content} ${resource.externalUrl ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });

    return [...filtered].sort((first, second) =>
      sortMode === "trends" ? second.views - first.views : resources.indexOf(first) - resources.indexOf(second)
    );
  }, [activeCategory, query, resources, sortMode]);

  const addResource = () => {
    const nextResource: VaultResource = {
      id: `resource-${resources.length + 1}`,
      title: "New Training Resource",
      description: "Add a short description for the team.",
      category: "training",
      type: "training",
      views: 0,
      audience: "B",
      content: "Add the training notes, context, or instructions here.",
      externalUrl: ""
    };

    setResources((current) => [nextResource, ...current]);
    setActiveCategory("all");
    setEditingResourceId(nextResource.id);
  };

  const updateResource = (id: string, patch: Partial<VaultResource>) => {
    setResources((current) =>
      current.map((resource) => (resource.id === id ? { ...resource, ...patch } : resource))
    );
  };

  const copyResource = async (resource: VaultResource) => {
    await navigator.clipboard.writeText(`${resource.title}\n\n${resource.description}\n\n${resource.content}${resource.externalUrl ? `\n\nOpen: ${resource.externalUrl}` : ""}`);
    setNotice(`Copied ${resource.title}`);
    window.setTimeout(() => setNotice(null), 1800);
  };

  const openResource = (resource: VaultResource) => {
    if (!resource.externalUrl) {
      setNotice(`Add a public link before opening ${resource.title}`);
      window.setTimeout(() => setNotice(null), 1800);
      return;
    }

    window.open(resource.externalUrl, "_blank", "noopener,noreferrer");
    setResources((current) =>
      current.map((item) => (item.id === resource.id ? { ...item, views: item.views + 1 } : item))
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] px-3 py-4 sm:px-6 sm:py-6 xl:px-10">
      <section className="mb-5 rounded-[18px] border border-[#bdd0ff] bg-[#f0f4ff] p-4 shadow-[0_2px_8px_rgba(47,98,237,0.08)] sm:mb-6 sm:rounded-[22px] sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dfe7ff] text-[#2f62ed]">
              <Cloud size={24} />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#18191f]">
                Google Drive Integration
              </p>
              <p className="mt-1 text-sm text-[#4d535f]">
                Add public resource URLs for Google Drive files, websites, YouTube videos, Canva assets, or training pages.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDriveRestricted((current) => !current)}
            className="h-9 rounded-lg border border-[#d8dce6] bg-white px-4 text-[11px] font-black uppercase tracking-[0.08em] text-[#4a5060] shadow-sm"
          >
            {driveRestricted ? "Public Share Links Only" : "All Drive Links Allowed"}
          </button>
        </div>
      </section>

      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#18191f] sm:text-3xl">Resource Vault</h1>
          <p className="mt-1 text-base text-[#565c68]">Training, scripts, book summaries, and marketing assets with public links when available.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697080]" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources..."
              className="h-11 w-full rounded-xl border border-[#dfe2e8] bg-white pl-10 pr-4 text-sm text-[#18191f] outline-none ring-[#2f62ed]/20 focus:ring-4 sm:w-72"
            />
          </label>
          <button
            onClick={addResource}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white shadow-[0_10px_22px_rgba(47,98,237,0.22)]"
          >
            <Plus size={18} />
            Add Resource
          </button>
        </div>
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-[#bdd0ff] bg-[#f0f4ff] px-4 py-3 text-sm font-bold text-[#2f62ed]">
          {notice}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {resourceCategories.map((category) => {
            const CategoryIcon = category.icon;
            const isActive = activeCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-black transition ${
                  isActive
                    ? "border-[#2f62ed] bg-[#2f62ed] text-white shadow-[0_8px_18px_rgba(47,98,237,0.2)]"
                    : "border-[#dfe2e8] bg-white text-[#3e4450] shadow-sm hover:border-[#b9c8f8]"
                }`}
              >
                <CategoryIcon size={16} />
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4c5260]">Sort:</span>
          <button
            onClick={() => setSortMode("latest")}
            className={`h-9 rounded-xl px-4 text-xs font-black ${
              sortMode === "latest" ? "bg-[#2f62ed] text-white" : "border border-[#dfe2e8] bg-white text-[#4c5260]"
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setSortMode("trends")}
            className={`h-9 rounded-xl px-4 text-xs font-black ${
              sortMode === "trends" ? "bg-[#2f62ed] text-white" : "border border-[#dfe2e8] bg-white text-[#4c5260]"
            }`}
          >
            Trends
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleResources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onDelete={() => setResources((current) => current.filter((item) => item.id !== resource.id))}
            onEdit={() => setEditingResourceId((current) => (current === resource.id ? null : resource.id))}
            onCopy={() => void copyResource(resource)}
            onOpen={() => openResource(resource)}
            isEditing={editingResourceId === resource.id}
            onChange={(patch) => updateResource(resource.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  onDelete,
  onEdit,
  onCopy,
  onOpen,
  isEditing,
  onChange
}: {
  resource: VaultResource;
  onDelete: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onOpen: () => void;
  isEditing: boolean;
  onChange: (patch: Partial<VaultResource>) => void;
}) {
  const iconMap: Record<VaultResource["type"], React.ElementType> = {
    script: Edit3,
    training: Play,
    summary: Library,
    marketing: FileText,
    legal: Shield
  };
  const ResourceIcon = iconMap[resource.type];

  return (
    <article
      className={`relative min-h-[190px] rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(20,26,38,0.08)] sm:min-h-[206px] sm:p-5 ${
        resource.featured ? "border-[#2f62ed] ring-1 ring-[#2f62ed]" : "border-[#dfe2e8]"
      }`}
    >
      {resource.featured ? (
        <span className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f62ed] text-white shadow-lg">
          <Sparkles size={17} />
        </span>
      ) : null}

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${resource.type === "script" ? "bg-[#fff3df] text-[#fb9b19]" : "bg-[#fff0f2] text-[#ff5464]"}`}>
          <ResourceIcon size={19} />
        </div>
        <div className="flex items-center gap-3 text-[#4d535f]">
          <button title="Edit resource" onClick={onEdit} className="transition hover:text-[#2f62ed]">
            <Edit3 size={16} />
          </button>
          <button title="Delete resource" onClick={onDelete} className="transition hover:text-[#e25563]">
            <Trash2 size={16} />
          </button>
          <button title="Copy public share content" onClick={onCopy} className="transition hover:text-[#2f62ed]">
            <CopyIcon size={16} />
          </button>
          <button title="Open resource in new tab" onClick={onOpen} className="transition hover:text-[#2f62ed]">
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#bdd0ff] bg-[#f0f4ff] p-3 text-xs font-bold leading-5 text-[#2f62ed]">
            Add a public resource URL if this file lives in Google Drive, YouTube, Canva, a website, or any external training library.
          </div>
          <input
            value={resource.title}
            onChange={(event) => onChange({ title: event.target.value })}
            className="w-full rounded-xl border border-[#dfe2e8] bg-white px-3 py-2 text-sm font-black text-[#18191f] outline-none"
          />
          <input
            value={resource.description}
            onChange={(event) => onChange({ description: event.target.value })}
            className="w-full rounded-xl border border-[#dfe2e8] bg-white px-3 py-2 text-sm text-[#4f5662] outline-none"
          />
          <textarea
            value={resource.content}
            onChange={(event) => onChange({ content: event.target.value })}
            className="min-h-24 w-full resize-none rounded-xl border border-[#dfe2e8] bg-white px-3 py-2 text-xs leading-5 text-[#4f5662] outline-none"
          />
          <input
            value={resource.externalUrl ?? ""}
            onChange={(event) => onChange({ externalUrl: event.target.value })}
            placeholder="Public Resource URL: https://drive.google.com/... or YouTube / website link"
            className="w-full rounded-xl border border-[#dfe2e8] bg-white px-3 py-2 text-sm text-[#4f5662] outline-none"
          />
          <button onClick={onEdit} className="h-9 rounded-xl bg-[#2f62ed] px-4 text-xs font-black text-white">
            Save Resource
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-base font-black leading-6 text-[#18191f]">{resource.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
              resource.externalUrl ? "bg-[#eafaf3] text-[#16a36a]" : "bg-[#f3f4f6] text-[#7a808b]"
            }`}>
              {resource.externalUrl ? "Public URL available" : "No public URL"}
            </span>
            {resource.externalUrl ? (
              <span className="max-w-full truncate rounded-full bg-[#edf2ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#2f62ed]">
                {getResourceHost(resource.externalUrl)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 min-h-10 text-sm leading-5 text-[#4f5662]">{resource.description}</p>
          <p className="mt-4 line-clamp-2 text-xs leading-5 text-[#7a808b]">{resource.content}</p>
          {resource.externalUrl ? (
            <button
              type="button"
              onClick={onOpen}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase tracking-[0.1em] text-white"
            >
              <ExternalLink size={15} />
              Open Public Resource
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe2e8] px-4 text-xs font-black uppercase tracking-[0.1em] text-[#4f5662]"
            >
              Add Link
            </button>
          )}
        </>
      )}

      <div className="mt-6 border-t border-[#e5e7ec] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#a1a6af]">
            <span className="inline-flex items-center gap-1">
              <Eye size={13} />
              {resource.views}
            </span>
            <span>{resource.category.replace("-", " ")}</span>
          </div>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fb9b19] px-1.5 text-[10px] font-black text-white">
            {resource.audience}
          </span>
        </div>
      </div>
    </article>
  );
}

function getResourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "external link";
  }
}

function FeatureContent({
  feature,
  leads,
  scripts,
  outreachTasks,
  teamNodes,
  automationSequences,
  fastStartPlan,
  crmCreateSignal = 0
}: Omit<FeatureWorkspaceProps, "feature"> & { feature: FeatureWorkspaceProps["feature"]; crmCreateSignal?: number }) {
  if (feature === "growth-crm") {
    return <GrowthCRM leads={leads} createSignal={crmCreateSignal} />;
  }
  if (feature === "linkedin") {
    return <LinkedInEngine tasks={outreachTasks} />;
  }
  if (feature === "events") {
    return <EventWebinarEngine leads={leads} />;
  }
  if (feature === "automation") {
    return <AutomationStudio sequences={automationSequences} />;
  }
  if (feature === "team-metrics") {
    return <TeamMetricsGrid teamNodes={teamNodes} />;
  }
  if (feature === "team-hub") {
    return <TeamHubGrid teamNodes={teamNodes} />;
  }
  if (feature === "ai-scripts") {
    return <AIScriptGenerator scripts={scripts} />;
  }
  if (feature === "playbook") {
    return <PlaybookGrid plan={fastStartPlan} scripts={scripts} />;
  }
  if (feature === "sales-sprint") {
    return <SalesSprintGrid leads={leads} outreachTasks={outreachTasks} />;
  }
  return <TaskBoard plan={fastStartPlan} leads={leads} />;
}

function LeadGrid({ leads }: { leads: LeadRecord[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {leads.map((lead) => (
        <Card key={lead.id} title={lead.name} tag={`${lead.source} · ${lead.temperature}`}>
          <p>{lead.nextAction}</p>
          <p className="mt-3 text-xs text-[#7d828c]">{new Date(lead.nextFollowUpAt).toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
}

type EventLeadStatus = "invited" | "registered" | "reminder_sent" | "attended" | "no_show" | "followed_up" | "converted" | "not_interested";
type WebinarEvent = {
  id: string;
  title: string;
  type: "Zoom" | "Webinar" | "Presentation" | "Home event";
  status: "scheduled" | "live" | "completed";
  scheduledAt: string;
  durationMinutes: number;
  host: string;
  audience: string;
  maxSeats: number;
  goal: string;
  description: string;
  replayUrl: string;
  brandColor: string;
  template: "classic" | "dark" | "modal" | "reverse";
  subdomain: string;
  hostAvatarUrl: string;
  heroImageUrl?: string;
  logoUrl?: string;
  landingHeadline?: string;
  landingSubheadline?: string;
  hostBio?: string;
  funnelMode?: string;
  whatsappNumber?: string;
  complianceDisclaimer?: string;
  replaySummary?: string;
  replayTakeaways?: string[];
  successMessage?: string;
  bookingUrl: string;
  curriculum: string[];
  faqs: Array<{ question: string; answer: string }>;
  attendees: Array<{ leadId: string; name: string; status: EventLeadStatus; lastAction: string }>;
};

function EventWebinarEngine({ leads }: { leads: LeadRecord[] }) {
  const [tab, setTab] = useState<"events" | "sequences">("events");
  const [events, setEvents] = useState<WebinarEvent[]>([
    {
      id: "wellness-discovery",
      title: "Wellness & Lifestyle Product Discovery",
      type: "Webinar",
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      durationMinutes: 45,
      host: "Wellness Consultant",
      audience: "Product-curious prospects",
      maxSeats: 100,
      goal: "Help product prospects understand the problem, product fit, and next conversation.",
      description: "Explore premium wellness, lifestyle routines, and simple next steps for interested prospects.",
      replayUrl: "",
      brandColor: "#2f62ed",
      template: "classic",
      subdomain: "wellness",
      hostAvatarUrl: "",
      heroImageUrl: "",
      logoUrl: "",
      landingHeadline: "Experience High-Performance Healthy Living",
      landingSubheadline: "A guided tour through premium wellness, lifestyle routines, and personal care solutions.",
      hostBio: "A relationship-first wellness consultant helping prospects understand fit before deciding.",
      funnelMode: "Product Discovery",
      whatsappNumber: "",
      complianceDisclaimer: "This session is educational. Results vary based on individual effort and no income or health outcome is guaranteed.",
      replaySummary: "A concise recap of the product discovery session, key questions, and the recommended next step.",
      replayTakeaways: ["Beginner path", "Product ecosystem", "Support system", "Fit check"],
      successMessage: "Follow the steps below to confirm your access details and prepare for the session.",
      bookingUrl: "",
      curriculum: ["Understand the problem and product fit", "See how a simple routine works", "Choose the right next step"],
      faqs: [
        { question: "Is this a sales presentation?", answer: "It is an educational overview with optional follow-up." },
        { question: "Can I bring a friend?", answer: "Yes, share the registration page so they can reserve their own seat." }
      ],
      attendees: leads.slice(0, 6).map((lead, index) => ({
        leadId: lead.id,
        name: lead.name,
        status: index === 0 ? "registered" : index === 1 ? "attended" : index === 2 ? "no_show" : "invited",
        lastAction: index === 2 ? "Send no-show recovery today" : "Send reminder or post-webinar follow-up"
      }))
    },
    {
      id: "business-preview",
      title: "Modern Entrepreneurship Preview",
      type: "Zoom",
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      durationMinutes: 60,
      host: "Team Leader",
      audience: "Business prospects",
      maxSeats: 100,
      goal: "Move business prospects into sponsor handoff or next private conversation.",
      description: "A clean business overview focused on education, fit, support, and next questions.",
      replayUrl: "",
      brandColor: "#111827",
      template: "dark",
      subdomain: "business",
      hostAvatarUrl: "",
      heroImageUrl: "",
      logoUrl: "",
      landingHeadline: "Experience a Clean Business Preview",
      landingSubheadline: "Understand the business model, support system, and whether a private follow-up is relevant.",
      hostBio: "Team leader focused on education, fit, support, and compliant next steps.",
      funnelMode: "Business Opportunity",
      whatsappNumber: "",
      complianceDisclaimer: "This session is educational. Results vary based on individual effort and no income is guaranteed.",
      replaySummary: "A business preview replay focused on social selling systems, product distribution, rewards overview, and support.",
      replayTakeaways: ["Social selling framework", "Product distribution model", "Rewards plan overview", "Support and onboarding"],
      successMessage: "Follow the steps below to confirm your access details and prepare for the session.",
      bookingUrl: "",
      curriculum: ["Learn the business model at a high level", "Understand support and onboarding", "Decide whether a private follow-up is useful"],
      faqs: [
        { question: "Is income guaranteed?", answer: "No. Results depend on many factors and are never guaranteed." },
        { question: "Do I need experience?", answer: "No experience is required to attend and learn." }
      ],
      attendees: leads.slice(0, 5).map((lead, index) => ({
        leadId: lead.id,
        name: lead.name,
        status: index === 0 ? "registered" : index === 1 ? "reminder_sent" : index === 2 ? "attended" : "invited",
        lastAction: index === 2 ? "Book follow-up call" : "Send invite or reminder"
      }))
    }
  ]);
  const [draft, setDraft] = useState({
    title: "",
    type: "Webinar" as WebinarEvent["type"],
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    durationMinutes: 45,
    host: "",
    audience: "",
    maxSeats: 100,
    goal: "",
    description: "",
    replayUrl: "",
    brandColor: "#2f62ed",
    template: "classic" as WebinarEvent["template"],
    subdomain: "",
    hostAvatarUrl: "",
    bookingUrl: "",
    curriculum: "What this webinar helps them understand\nThe common mistake to avoid\nThe best next step after the session",
    faqs: "Is this live? | Yes, unless the host has enabled replay mode.\nCan I ask questions? | Yes, reply to your host after the session."
  });
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<EventLeadStatus | "all">("all");
  const [actionNotice, setActionNotice] = useState("");
  const [cmsEventId, setCmsEventId] = useState<string | null>(null);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const cmsEvent = events.find((event) => event.id === cmsEventId) ?? null;
  const allAttendees = events.flatMap((event) => event.attendees.map((attendee) => ({ ...attendee, eventTitle: event.title })));
  const noShows = allAttendees.filter((attendee) => attendee.status === "no_show");
  const registeredCount = allAttendees.filter((attendee) => attendee.status === "registered").length;
  const attended = allAttendees.filter((attendee) => ["attended", "followed_up", "converted"].includes(attendee.status)).length;
  const converted = allAttendees.filter((attendee) => attendee.status === "converted").length;
  const conversionRate = Math.round((converted / Math.max(attended, 1)) * 100);
  const filteredAttendees = selectedEvent
    ? selectedEvent.attendees.filter((attendee) => statusFilter === "all" || attendee.status === statusFilter)
    : [];

  useEffect(() => {
    try {
      window.localStorage.setItem("duplios-webinar-funnels", JSON.stringify(events));
    } catch {
      // Webinar pages still use defaults when local persistence is unavailable.
    }
  }, [events]);

  const createEvent = () => {
    if (!draft.title.trim()) return;
    const event: WebinarEvent = {
      id: `webinar-${Date.now()}`,
      title: draft.title.trim(),
      type: draft.type,
      status: "scheduled",
      scheduledAt: new Date(draft.scheduledAt).toISOString().slice(0, 16),
      durationMinutes: Math.max(15, Number(draft.durationMinutes) || 45),
      host: draft.host.trim() || "Webinar Presenter",
      audience: draft.audience.trim() || "Warm prospects",
      maxSeats: Math.max(1, Number(draft.maxSeats) || 100),
      goal: draft.goal.trim() || "Invite, educate, follow up, and recover no-shows.",
      description: draft.description.trim() || "A relationship-first presentation with a clear next step.",
      replayUrl: draft.replayUrl.trim(),
      brandColor: draft.brandColor.trim() || "#2f62ed",
      template: draft.template,
      subdomain: draft.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
      hostAvatarUrl: draft.hostAvatarUrl.trim(),
      heroImageUrl: "",
      logoUrl: "",
      landingHeadline: draft.title.trim(),
      landingSubheadline: draft.description.trim() || "A guided session to help prospects understand fit before deciding.",
      hostBio: "",
      funnelMode: draft.type === "Zoom" ? "Business Opportunity" : "Product Discovery",
      whatsappNumber: "",
      complianceDisclaimer: "This session is educational. Results vary based on individual effort and no income, rank, health, or business outcome is guaranteed.",
      replaySummary: "A focused replay recap with key takeaways and one clear follow-up action.",
      replayTakeaways: draft.curriculum.split("\n").map((item) => item.trim()).filter(Boolean),
      successMessage: "Follow the steps below to confirm your access details and prepare for the session.",
      bookingUrl: draft.bookingUrl.trim(),
      curriculum: draft.curriculum.split("\n").map((item) => item.trim()).filter(Boolean),
      faqs: draft.faqs
        .split("\n")
        .map((line) => {
          const [question, answer] = line.split("|").map((item) => item.trim());
          return question && answer ? { question, answer } : null;
        })
        .filter((item): item is { question: string; answer: string } => Boolean(item)),
      attendees: leads.slice(0, 5).map((lead) => ({
        leadId: lead.id,
        name: lead.name,
        status: "invited",
        lastAction: "Send webinar invite"
      }))
    };
    setEvents((current) => [event, ...current]);
    setSelectedEventId(event.id);
    setDraft((current) => ({ ...current, title: "", host: "", audience: "", goal: "", description: "", replayUrl: "", subdomain: "", hostAvatarUrl: "", bookingUrl: "" }));
    trackDupliosEvent("event_created", { eventId: event.id, eventType: event.type, surface: "webinar_module" });
  };

  const openCms = (event: WebinarEvent) => {
    setSelectedEventId(event.id);
    setCmsEventId(event.id);
  };

  const saveCmsEvent = (updated: WebinarEvent) => {
    setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
    setSelectedEventId(updated.id);
    setActionNotice("Masterclass CMS changes saved and synced to live funnel pages.");
    window.setTimeout(() => setActionNotice(""), 2500);
  };

  const updateAttendee = (leadId: string, status: EventLeadStatus) => {
    if (!selectedEvent) return;
    setEvents((current) =>
      current.map((event) =>
        event.id === selectedEvent.id
          ? {
              ...event,
              attendees: event.attendees.map((attendee) =>
                attendee.leadId === leadId
                  ? {
                      ...attendee,
                      status,
                      lastAction:
                        status === "registered"
                          ? "Send reminder before webinar"
                          : status === "no_show"
                            ? "Send no-show recovery"
                            : status === "attended"
                              ? "Send after-webinar follow-up"
                              : status === "converted"
                                ? "Start customer/team onboarding"
                                : "Continue webinar follow-up"
                    }
                  : attendee
              )
            }
          : event
      )
    );
    if (status === "no_show") {
      trackDupliosEvent("no_show_recovery_action", { eventId: selectedEvent.id, leadId });
    }
  };

  const copyScript = (kind: "invite" | "reminder" | "replay" | "recovery", name = "{{name}}") => {
    if (!selectedEvent) return;
    const replayLink = selectedEvent.replayUrl || makeFunnelUrl(selectedEvent, "webinar-replay");
    const scriptsByKind = {
      invite: `Hi ${name}, I am hosting ${selectedEvent.title} for ${selectedEvent.audience}. It is a short ${selectedEvent.durationMinutes}-minute session with practical next steps. Want me to save you a seat?`,
      reminder: `Hi ${name}, quick reminder that ${selectedEvent.title} is coming up on ${new Date(selectedEvent.scheduledAt).toLocaleString()}. Are you still good to join?`,
      replay: `Hi ${name}, here is the replay for ${selectedEvent.title}: ${replayLink}. Watch the short overview and tell me what stood out or if it is not relevant right now.`,
      recovery: `Hi ${name}, no worries about missing ${selectedEvent.title}. I saved the short recap for you. Want the replay, or should I send the 3 main points here?`
    };
    void copyText(scriptsByKind[kind], `${kind === "invite" ? "Invite" : kind === "replay" ? "Replay CTA" : kind === "reminder" ? "Reminder" : "Recovery"} script copied.`);
    if (kind === "recovery") {
      trackDupliosEvent("no_show_recovery_action", { eventId: selectedEvent.id, scriptCopied: true });
    }
  };

  const buildCalendarUrl = (event: WebinarEvent) => {
    const start = new Date(event.scheduledAt);
    const end = new Date(start.getTime() + event.durationMinutes * 60 * 1000);
    const format = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title);
    url.searchParams.set("dates", `${format(start)}/${format(end)}`);
    url.searchParams.set("details", `${event.description}\n\nGoal: ${event.goal}`);
    return url.toString();
  };

  const openCalendarLink = (event: WebinarEvent) => {
    const url = buildCalendarUrl(event);
    setActionNotice(`Opening calendar for ${event.title}.`);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
  };

  const copyFunnelLink = (event: WebinarEvent, view: "webinar-register" | "webinar-thank-you" | "webinar-replay") => {
    const labels = {
      "webinar-register": "Registration page link copied.",
      "webinar-thank-you": "Thank-you page link copied.",
      "webinar-replay": "Replay page link copied."
    };
    void copyText(makeFunnelUrl(event, view), labels[view]);
  };

  const openFunnelLink = (event: WebinarEvent, view: "webinar-register" | "webinar-thank-you" | "webinar-replay") => {
    const labels = {
      "webinar-register": "Opening registration page.",
      "webinar-thank-you": "Opening thank-you page.",
      "webinar-replay": "Opening replay page."
    };
    setActionNotice(labels[view]);
    const opened = window.open(makeFunnelUrl(event, view), "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = makeFunnelUrl(event, view);
    }
  };

  const copyFollowUpList = () => {
    if (!selectedEvent) return;
    void copyText(
      selectedEvent.attendees
        .map((item) => `${item.name} | ${item.status.replace("_", " ")} | ${item.lastAction}`)
        .join("\n"),
      "Follow-up list copied."
    );
  };

  const copyText = async (text: string, notice: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setActionNotice(notice);
    window.setTimeout(() => setActionNotice(""), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f62ed]">Webinar OS</p>
          <h2 className="mt-1 text-3xl font-black text-[#18191f]">Webinar Events</h2>
          <p className="mt-1 text-sm leading-6 text-[#626873]">Create, schedule, invite, remind, mark attendance, recover no-shows, and organize replay follow-up.</p>
        </div>
        <div className="inline-flex rounded-2xl border border-[#dfe2e8] bg-white p-1">
          {([
            ["events", "Webinar Events"],
            ["sequences", "Sequences & Automations"]
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.12em] ${tab === id ? "bg-[#2f62ed] text-white" : "text-[#394150]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "events" ? (
        <>
          {actionNotice ? (
            <div className="rounded-2xl border border-[#bdd0ff] bg-[#f2f5ff] px-4 py-3 text-sm font-black text-[#2f62ed]">
              {actionNotice}
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-4">
            <MetricBox label="Webinars" value={String(events.length)} />
            <MetricBox label="Registered" value={String(registeredCount)} />
            <MetricBox label="No-Shows" value={String(noShows.length)} />
            <MetricBox label="Conversion" value={`${conversionRate}%`} />
          </div>

          <div className="rounded-[24px] border border-[#bdd0ff] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xl font-black text-[#18191f]">New Webinar</p>
                <p className="text-sm text-[#626873]">Build the webinar schedule, capacity, audience, replay path, and follow-up goal in one place.</p>
              </div>
              <button onClick={createEvent} className="h-11 rounded-xl bg-[#111827] px-5 text-sm font-black text-white">
                + New Webinar
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <CrmInput label="Webinar title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Type</span>
                <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as WebinarEvent["type"] }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                  <option>Webinar</option>
                  <option>Zoom</option>
                  <option>Presentation</option>
                  <option>Home event</option>
                </select>
              </label>
              <CrmInput label="Scheduled" type="datetime-local" value={draft.scheduledAt} onChange={(value) => setDraft((current) => ({ ...current, scheduledAt: value }))} />
              <CrmInput label="Host / presenter" value={draft.host} onChange={(value) => setDraft((current) => ({ ...current, host: value }))} />
              <CrmInput label="Audience" value={draft.audience} onChange={(value) => setDraft((current) => ({ ...current, audience: value }))} />
              <CrmInput label="Max seats" type="number" value={String(draft.maxSeats)} onChange={(value) => setDraft((current) => ({ ...current, maxSeats: Number(value) }))} />
              <CrmInput label="Duration minutes" type="number" value={String(draft.durationMinutes)} onChange={(value) => setDraft((current) => ({ ...current, durationMinutes: Number(value) }))} />
              <CrmInput label="Replay URL" value={draft.replayUrl} onChange={(value) => setDraft((current) => ({ ...current, replayUrl: value }))} />
              <CrmInput label="Booking URL" value={draft.bookingUrl} onChange={(value) => setDraft((current) => ({ ...current, bookingUrl: value }))} />
              <CrmInput label="Brand color" value={draft.brandColor} onChange={(value) => setDraft((current) => ({ ...current, brandColor: value }))} />
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Template</span>
                <select value={draft.template} onChange={(event) => setDraft((current) => ({ ...current, template: event.target.value as WebinarEvent["template"] }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                  <option value="classic">Classic Long Form</option>
                  <option value="dark">Dark Mode Minimalist</option>
                  <option value="modal">Two-Step Modal</option>
                  <option value="reverse">Reverse Squeeze</option>
                </select>
              </label>
              <CrmInput label="Subdomain slug" value={draft.subdomain} onChange={(value) => setDraft((current) => ({ ...current, subdomain: value }))} />
              <CrmInput label="Host avatar URL" value={draft.hostAvatarUrl} onChange={(value) => setDraft((current) => ({ ...current, hostAvatarUrl: value }))} />
              <CrmInput label="Goal" value={draft.goal} onChange={(value) => setDraft((current) => ({ ...current, goal: value }))} className="xl:col-span-2" />
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Description / promise</span>
                <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm outline-none" placeholder="What people will learn, who it is for, and what next step they can choose." />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Curriculum points</span>
                <textarea value={draft.curriculum} onChange={(event) => setDraft((current) => ({ ...current, curriculum: event.target.value }))} className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm outline-none" placeholder="One curriculum point per line" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">FAQs</span>
                <textarea value={draft.faqs} onChange={(event) => setDraft((current) => ({ ...current, faqs: event.target.value }))} className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm outline-none" placeholder="Question | Answer, one per line" />
              </label>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {events.map((event) => {
              const invited = event.attendees.filter((item) => item.status === "invited").length;
              const registered = event.attendees.filter((item) => item.status === "registered").length;
              const attendeeCount = event.attendees.filter((item) => ["attended", "followed_up", "converted"].includes(item.status)).length;
              const noShowCount = event.attendees.filter((item) => item.status === "no_show").length;
              const convertedCount = event.attendees.filter((item) => item.status === "converted").length;
              const eventConversion = Math.round((convertedCount / Math.max(attendeeCount, 1)) * 100);
              return (
                <div
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEventId(event.id)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                      setSelectedEventId(event.id);
                    }
                  }}
                  className={`grid min-h-[280px] cursor-pointer gap-4 rounded-[24px] border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 lg:grid-cols-[1fr_154px] ${selectedEvent?.id === event.id ? "border-[#2f62ed]" : "border-[#dfe2e8]"}`}
                >
                  <div>
                    <span className="rounded-full bg-[#eafbf3] px-2 py-1 text-[10px] font-black uppercase text-[#047857]">{event.status}</span>
                    <p className="mt-4 text-lg font-black text-[#18191f]">{event.title}</p>
                    <div className="mt-4 grid gap-3 text-xs font-semibold text-[#626873] sm:grid-cols-2">
                      <span>{new Date(event.scheduledAt).toLocaleDateString()}</span>
                      <span>{new Date(event.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span>{event.host}</span>
                      <span>Max {event.maxSeats}</span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-4 border-y border-[#eef1f5] py-4 sm:grid-cols-4">
                      <EventMetric label="Invited -> Reg" value={`${invited} -> ${registered}`} />
                      <EventMetric label="Attended" value={`${attendeeCount} (${Math.round((attendeeCount / Math.max(registered, 1)) * 100)}%)`} />
                      <EventMetric label="No-show" value={String(noShowCount)} />
                      <EventMetric label="Conv. Rate" value={`${eventConversion}%`} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={(click) => { click.stopPropagation(); openCalendarLink(event); }} className="h-9 rounded-lg bg-[#edf2ff] px-4 text-xs font-black uppercase text-[#2f62ed]">Add to Calendar</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); setSelectedEventId(event.id); copyScript("invite"); }} className="h-9 rounded-lg bg-[#eafbf3] px-4 text-xs font-black uppercase text-[#047857]">Copy Invite</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); setSelectedEventId(event.id); copyScript("replay"); }} className="h-9 rounded-lg border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]">Replay CTA</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); openFunnelLink(event, "webinar-register"); }} onContextMenu={(click) => { click.preventDefault(); click.stopPropagation(); copyFunnelLink(event, "webinar-register"); }} className="h-9 rounded-lg border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]">Reg Page</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); openFunnelLink(event, "webinar-thank-you"); }} onContextMenu={(click) => { click.preventDefault(); click.stopPropagation(); copyFunnelLink(event, "webinar-thank-you"); }} className="h-9 rounded-lg border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]">Thank You</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); openFunnelLink(event, "webinar-replay"); }} onContextMenu={(click) => { click.preventDefault(); click.stopPropagation(); copyFunnelLink(event, "webinar-replay"); }} className="h-9 rounded-lg border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]">Replay Page</button>
                      <button type="button" onClick={(click) => { click.stopPropagation(); openCms(event); }} className="h-9 rounded-lg bg-[#111827] px-4 text-xs font-black uppercase text-white">Masterclass CMS</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center rounded-2xl bg-[#f2f4f8] p-4 text-center text-xs font-semibold italic leading-5 text-[#8c94a3]">
                    {event.description}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#dfe2e8] bg-white p-5">
            {selectedEvent ? (
              <>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#18191f]">{selectedEvent.title}</p>
                    <p className="mt-1 text-sm text-[#626873]">{selectedEvent.goal}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copyFollowUpList} className="h-10 rounded-xl border border-[#dfe2e8] px-4 text-xs font-black uppercase">Copy Follow-Up List</button>
                    <button onClick={() => copyScript("reminder")} className="h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white">Copy Reminder</button>
                    <button onClick={() => copyScript("recovery")} className="h-10 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white">Copy Recovery</button>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(["all", "invited", "registered", "reminder_sent", "attended", "no_show", "followed_up", "converted"] as Array<EventLeadStatus | "all">).map((status) => (
                    <button key={status} onClick={() => setStatusFilter(status)} className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${statusFilter === status ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-[#dfe2e8]">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-[#f7f9ff] text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">
                      <tr>
                        <th className="px-4 py-3">Lead</th>
                        <th>Status</th>
                        <th>Next Action</th>
                        <th>Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendees.map((attendee) => (
                        <tr key={attendee.leadId} className="border-t border-[#edf0f4]">
                          <td className="px-4 py-3 font-black text-[#18191f]">{attendee.name}</td>
                          <td className="capitalize text-[#394150]">{attendee.status.replace("_", " ")}</td>
                          <td className="text-[#626873]">{attendee.lastAction}</td>
                          <td>
                            <div className="flex flex-wrap gap-2 py-2">
                              {(["registered", "reminder_sent", "attended", "no_show", "followed_up", "converted"] as EventLeadStatus[]).map((status) => (
                                <button key={status} onClick={() => updateAttendee(attendee.leadId, status)} className="h-8 rounded-lg border border-[#dfe2e8] px-2 text-[10px] font-black uppercase text-[#394150]">
                                  {status.replace("_", " ")}
                                </button>
                              ))}
                              <button onClick={() => copyScript("recovery", attendee.name)} className="h-8 rounded-lg bg-[#111827] px-2 text-[10px] font-black uppercase text-white">
                                Recovery
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-6 text-center text-sm font-semibold text-[#626873]">
                Create your first webinar to track invites, attendance, no-shows, replay CTA, and follow-up.
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            ["Invite Sequence", "D-3 invite, D-1 reminder, 2-hour reminder, 10-minute reminder", "Copy Invite"],
            ["Replay Sequence", "Replay CTA, personal takeaway question, next conversation prompt", "Copy Replay CTA"],
            ["No-Show Recovery", "Soft recovery, short recap, replay offer, new session invite", "Copy Recovery"]
          ].map(([title, body, action], index) => (
            <div key={title} className="rounded-2xl border border-[#dfe2e8] bg-white p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]">
                <MessageSquare size={18} />
              </div>
              <p className="font-black text-[#18191f]">{title}</p>
              <p className="mt-2 min-h-16 text-sm leading-6 text-[#626873]">{body}</p>
              <button onClick={() => copyScript(index === 0 ? "invite" : index === 1 ? "replay" : "recovery")} className="mt-4 h-10 w-full rounded-xl bg-[#2f62ed] text-xs font-black uppercase tracking-[0.12em] text-white">
                {action}
              </button>
            </div>
          ))}
        </div>
      )}
      {cmsEvent ? (
        <MasterclassCmsModal
          event={cmsEvent}
          onClose={() => setCmsEventId(null)}
          onSave={(updated) => {
            saveCmsEvent(updated);
            setCmsEventId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EventMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8b95a7]">{label}</p>
      <p className="mt-1 font-black text-[#18191f]">{value}</p>
    </div>
  );
}

type CmsTab = "session" | "template" | "mode" | "landing" | "replay" | "success" | "education";

function MasterclassCmsModal({ event, onClose, onSave }: { event: WebinarEvent; onClose: () => void; onSave: (event: WebinarEvent) => void }) {
  const [tab, setTab] = useState<CmsTab>("session");
  const [draft, setDraft] = useState({
    ...event,
    curriculumText: event.curriculum.join("\n"),
    faqText: event.faqs.map((faq) => `${faq.question} | ${faq.answer}`).join("\n"),
    replayTakeawaysText: (event.replayTakeaways ?? event.curriculum).join("\n")
  });

  const tabs: Array<{ id: CmsTab; label: string; icon: React.ElementType }> = [
    { id: "session", label: "Session", icon: Video },
    { id: "template", label: "Template", icon: FileText },
    { id: "mode", label: "Funnel Mode", icon: Globe2 },
    { id: "landing", label: "Landing Page", icon: FileText },
    { id: "replay", label: "Replay Hub", icon: Play },
    { id: "success", label: "Registration Success", icon: CheckCircle2 },
    { id: "education", label: "Education Content", icon: Sparkles }
  ];

  const save = () => {
    onSave({
      ...event,
      ...draft,
      durationMinutes: Math.max(15, Number(draft.durationMinutes) || 45),
      maxSeats: Math.max(1, Number(draft.maxSeats) || 100),
      subdomain: draft.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
      curriculum: draft.curriculumText.split("\n").map((item) => item.trim()).filter(Boolean),
      replayTakeaways: draft.replayTakeawaysText.split("\n").map((item) => item.trim()).filter(Boolean),
      faqs: draft.faqText
        .split("\n")
        .map((line) => {
          const [question, answer] = line.split("|").map((item) => item.trim());
          return question && answer ? { question, answer } : null;
        })
        .filter((item): item is { question: string; answer: string } => Boolean(item))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020617]/55 p-3 backdrop-blur-sm">
      <div className="my-6 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] bg-white shadow-[0_28px_100px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-5 border-b border-[#eef1f5] p-5 lg:flex-row lg:items-center">
          <div className="min-w-32">
            <p className="text-2xl font-black italic leading-7 text-[#111827]">Masterclass<br />CMS</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8b95a7]">Global content management</p>
          </div>
          <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex h-12 min-w-[118px] items-center justify-center gap-2 rounded-xl px-4 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                    tab === item.id ? "bg-[#111827] text-white shadow-lg" : "bg-[#f5f7fa] text-[#94a3b8]"
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#111827] hover:bg-[#f3f4f6]">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === "session" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CmsInput label="Masterclass title" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <CmsInput label="Speaker / presenter name" value={draft.host} onChange={(value) => setDraft((current) => ({ ...current, host: value }))} />
              <CmsSelect label="Webinar type" value={draft.type} onChange={(value) => setDraft((current) => ({ ...current, type: value as WebinarEvent["type"] }))} options={["Webinar", "Zoom", "Presentation", "Home event"]} />
              <CmsInput label="Max capacity" type="number" value={String(draft.maxSeats)} onChange={(value) => setDraft((current) => ({ ...current, maxSeats: Number(value) }))} />
              <CmsInput label="Date & time" type="datetime-local" value={draft.scheduledAt} onChange={(value) => setDraft((current) => ({ ...current, scheduledAt: value }))} />
              <CmsInput label="Live meeting link" value={draft.replayUrl} onChange={(value) => setDraft((current) => ({ ...current, replayUrl: value }))} />
              <CmsInput label="Booking / calendar link" value={draft.bookingUrl ?? ""} onChange={(value) => setDraft((current) => ({ ...current, bookingUrl: value }))} />
            </div>
          ) : null}

          {tab === "template" ? (
            <div>
              <h3 className="text-2xl font-black text-[#111827]">Select Funnel Architecture</h3>
              <p className="mt-2 text-sm text-[#64748b]">Choose a proven webinar layout designed to maximize clean, compliant conversion.</p>
              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {([
                  ["classic", "Classic Form", "Long-form education with the registration card visible in the hero."],
                  ["modal", "Two-Step Popup", "A focused CTA opens a lightweight registration modal."],
                  ["dark", "Premium Dark", "A sleek dark experience for premium replay and business sessions."],
                  ["reverse", "Reverse Squeeze", "Give value first, then ask for the opt-in after education."]
                ] as const).map(([id, title, body]) => (
                  <button
                    key={id}
                    onClick={() => setDraft((current) => ({ ...current, template: id }))}
                    className={`rounded-[28px] border p-4 text-left transition hover:-translate-y-0.5 ${draft.template === id ? "border-[#4f46e5] shadow-[0_18px_45px_rgba(79,70,229,0.18)]" : "border-[#dfe2e8] shadow-sm"}`}
                  >
                    <div className={`h-36 rounded-2xl border ${id === "dark" ? "border-[#111827] bg-[#111827]" : "border-[#dfe2e8] bg-[#f8fafc]"} p-4`}>
                      <div className={`h-3 w-24 rounded-full ${id === "dark" ? "bg-white/70" : "bg-[#cbd5e1]"}`} />
                      <div className={`mt-4 h-20 rounded-xl ${id === "dark" ? "bg-white/10" : "bg-white"} shadow-sm`} />
                      <div className={`mt-3 h-3 rounded-full ${id === "classic" || id === "reverse" ? "bg-[#ef2b2d]" : id === "modal" ? "bg-[#4f46e5]" : "bg-[#7c3aed]"}`} />
                    </div>
                    <p className="mt-4 text-center text-lg font-black text-[#111827]">{title}</p>
                    <p className="mt-2 text-center text-xs leading-5 text-[#64748b]">{body}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "mode" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CmsInput label="Primary funnel mode" value={draft.funnelMode ?? ""} onChange={(value) => setDraft((current) => ({ ...current, funnelMode: value }))} />
              <CmsInput label="WhatsApp follow-up number" value={draft.whatsappNumber ?? ""} onChange={(value) => setDraft((current) => ({ ...current, whatsappNumber: value }))} />
              <label className="lg:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">Compliance disclaimer</span>
                <textarea value={draft.complianceDisclaimer ?? ""} onChange={(event) => setDraft((current) => ({ ...current, complianceDisclaimer: event.target.value }))} className="min-h-28 w-full rounded-2xl border-0 bg-[#f5f7fa] p-5 text-sm text-[#111827] outline-none" />
              </label>
              <div className="lg:col-span-2 border-t border-[#eef1f5] pt-6">
                <p className="text-lg font-black text-[#111827]">Domain Configuration</p>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_180px]">
                  <CmsInput label="Subdomain name" value={draft.subdomain} onChange={(value) => setDraft((current) => ({ ...current, subdomain: value }))} />
                  <div className="rounded-2xl bg-[#eef2f7] px-5 py-8 text-center text-sm font-black text-[#64748b]">.duplios.com</div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "landing" ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-5">
                <CmsTextarea label="Landing page headline" value={draft.landingHeadline ?? ""} onChange={(value) => setDraft((current) => ({ ...current, landingHeadline: value }))} />
                <CmsTextarea label="Landing page subheadline" value={draft.landingSubheadline ?? ""} onChange={(value) => setDraft((current) => ({ ...current, landingSubheadline: value }))} />
                <CmsTextarea label="Webinar full description" value={draft.description} onChange={(value) => setDraft((current) => ({ ...current, description: value }))} rows={5} />
              </div>
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <CmsInput label="Hero image URL" value={draft.heroImageUrl ?? ""} onChange={(value) => setDraft((current) => ({ ...current, heroImageUrl: value }))} />
                  <CmsInput label="Host image URL" value={draft.hostAvatarUrl} onChange={(value) => setDraft((current) => ({ ...current, hostAvatarUrl: value }))} />
                </div>
                <CmsTextarea label="Host bio" value={draft.hostBio ?? ""} onChange={(value) => setDraft((current) => ({ ...current, hostBio: value }))} rows={4} />
                <div className="border-t border-[#eef1f5] pt-5">
                  <p className="text-sm font-black uppercase tracking-[0.08em] text-[#111827]">Custom funnel branding & logo override</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <CmsInput label="Hex color picker code" value={draft.brandColor} onChange={(value) => setDraft((current) => ({ ...current, brandColor: value }))} />
                    <CmsInput label="Brand logo URL override" value={draft.logoUrl ?? ""} onChange={(value) => setDraft((current) => ({ ...current, logoUrl: value }))} />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "replay" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CmsInput label="Replay video URL" value={draft.replayUrl} onChange={(value) => setDraft((current) => ({ ...current, replayUrl: value }))} />
              <CmsTextarea label="Key takeaways (list)" value={draft.replayTakeawaysText} onChange={(value) => setDraft((current) => ({ ...current, replayTakeawaysText: value }))} rows={8} />
              <CmsTextarea label="Session summary (rich text)" value={draft.replaySummary ?? ""} onChange={(value) => setDraft((current) => ({ ...current, replaySummary: value }))} rows={8} />
            </div>
          ) : null}

          {tab === "success" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CmsTextarea label="Registration success message" value={draft.successMessage ?? ""} onChange={(value) => setDraft((current) => ({ ...current, successMessage: value }))} rows={7} />
              <CmsInput label="Business fit / booking CTA URL" value={draft.bookingUrl ?? ""} onChange={(value) => setDraft((current) => ({ ...current, bookingUrl: value }))} />
              <CmsInput label="WhatsApp confirmation number" value={draft.whatsappNumber ?? ""} onChange={(value) => setDraft((current) => ({ ...current, whatsappNumber: value }))} />
            </div>
          ) : null}

          {tab === "education" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <CmsTextarea label="Curriculum roadmap" value={draft.curriculumText} onChange={(value) => setDraft((current) => ({ ...current, curriculumText: value }))} rows={8} />
              <CmsTextarea label="Common questions (FAQs)" value={draft.faqText} onChange={(value) => setDraft((current) => ({ ...current, faqText: value }))} rows={8} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eef1f5] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">Changes sync automatically to live content after save.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="h-12 rounded-2xl px-8 text-xs font-black uppercase tracking-[0.12em] text-[#94a3b8]">Discard</button>
            <button onClick={save} className="h-12 rounded-2xl bg-[#111827] px-10 text-xs font-black uppercase tracking-[0.12em] text-white">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CmsInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-14 w-full rounded-2xl border-0 bg-[#f5f7fa] px-5 text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#2f62ed]" />
    </label>
  );
}

function CmsSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-14 w-full rounded-2xl border-0 bg-[#f5f7fa] px-5 text-sm font-bold text-[#111827] outline-none focus:ring-2 focus:ring-[#2f62ed]">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function CmsTextarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border-0 bg-[#f5f7fa] p-5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2f62ed]" />
    </label>
  );
}

function makeFunnelUrl(event: WebinarEvent, view: "webinar-register" | "webinar-thank-you" | "webinar-replay") {
  return `${window.location.origin}${window.location.pathname}?view=${view}&webinar=${encodeURIComponent(event.id)}`;
}

function GrowthCRM({ leads, createSignal = 0 }: { leads: LeadRecord[]; createSignal?: number }) {
  type PurchaseRecord = { id: string; product: string; purchasedAt: string; quantity: number; note: string };
  type CustomerProfile = {
    remoteId?: string;
    leadId: string;
    interests: string;
    productFocus: string;
    purchaseCadenceDays: number;
    nextPurchaseAt: string;
    reminderNote: string;
    purchases: PurchaseRecord[];
  };
  const makeDefaultProfile = (lead: LeadRecord): CustomerProfile => ({
    leadId: lead.id,
    interests: lead.notes || "Add their goals, preferences, objections, and personal context.",
    productFocus: lead.stage === "customer" ? "Current reorder product" : "Starter product or sample kit",
    purchaseCadenceDays: 30,
    nextPurchaseAt: lead.stage === "customer"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : new Date(lead.nextFollowUpAt).toISOString().slice(0, 10),
    reminderNote: lead.stage === "customer"
      ? "Check usage, ask how the product fits their routine, then remind them before the next reorder window."
      : lead.nextAction,
    purchases: []
  });
  const profileStorageKey = "duplios-customer-profiles";
  const readProfiles = () => {
    try {
      const stored = window.localStorage.getItem(profileStorageKey);
      const parsed = stored ? JSON.parse(stored) as CustomerProfile[] : [];
      const valid = Array.isArray(parsed) ? parsed : [];
      return leads.map((lead) => valid.find((profile) => profile.leadId === lead.id) ?? makeDefaultProfile(lead));
    } catch {
      return leads.map(makeDefaultProfile);
    }
  };
  const [tab, setTab] = useState<"overview" | "all" | "profiles">("overview");
  const [localLeads, setLocalLeads] = useState(leads);
  const [profiles, setProfiles] = useState<CustomerProfile[]>(readProfiles);
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id ?? "");
  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [leadDraft, setLeadDraft] = useState({
    name: "",
    phone: "",
    email: "",
    source: "manual" as LeadRecord["source"],
    stage: "new" as LeadRecord["stage"],
    temperature: "warm" as LeadRecord["temperature"],
    interestType: "product" as NonNullable<LeadRecord["interestType"]>,
    relationshipContext: "",
    nextAction: "Send a warm first-contact message",
    nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    assignedSponsor: "",
    tags: "",
    notes: ""
  });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<"all" | "due" | "reorder" | "customers" | "hot" | "inactive">("due");
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [purchaseDraft, setPurchaseDraft] = useState({ product: "", purchasedAt: new Date().toISOString().slice(0, 10), quantity: 1, note: "" });
  const [syncStatus, setSyncStatus] = useState("Customer profiles save locally until you sync them to Supabase.");
  const { profile: authProfile } = useAuth();
  const captureLink = `${window.location.origin}/capture/duplios`;
  const inProgress = localLeads.filter((lead) => ["contacted", "qualified", "invited", "event_registered", "attended", "follow_up", "appointment", "interested", "business_prospect"].includes(lead.stage)).length;
  const won = localLeads.filter((lead) => ["customer", "builder", "team_member"].includes(lead.stage)).length;
  const conversion = Math.round((won / Math.max(localLeads.length, 1)) * 100);
  const staleLeads = localLeads.filter((lead) => {
    if (!lead.lastTouchAt) return false;
    return new Date(lead.lastTouchAt).getTime() < Date.now() - 5 * 24 * 60 * 60 * 1000;
  }).length;
  const contactedLeads = localLeads.filter((lead) => lead.stage === "contacted").length;
  const hotLeads = localLeads.filter((lead) => lead.temperature === "hot").length;
  const purchaseReminderCount = profiles.filter((profile) => new Date(profile.nextPurchaseAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000).length;
  const selectedLead = localLeads.find((lead) => lead.id === selectedLeadId) ?? localLeads[0];
  const selectedProfile = selectedLead ? profiles.find((profile) => profile.leadId === selectedLead.id) ?? makeDefaultProfile(selectedLead) : null;
  const customersWithProfiles = localLeads.map((lead) => ({
    lead,
    profile: profiles.find((profile) => profile.leadId === lead.id) ?? makeDefaultProfile(lead)
  }));
  const customerRows = customersWithProfiles.filter(({ lead, profile }) => {
    const dueSoon = new Date(profile.nextPurchaseAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
    const inactive = lead.lastTouchAt ? new Date(lead.lastTouchAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000 : false;
    const matchesFilter =
      customerFilter === "all" ||
      (customerFilter === "due" && new Date(lead.nextFollowUpAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000) ||
      (customerFilter === "reorder" && dueSoon) ||
      (customerFilter === "customers" && lead.stage === "customer") ||
      (customerFilter === "hot" && lead.temperature === "hot") ||
      (customerFilter === "inactive" && inactive);
    const search = customerQuery.trim().toLowerCase();
    const matchesQuery =
      !search ||
      `${lead.name} ${lead.source} ${lead.stage} ${lead.temperature} ${lead.notes} ${profile.interests} ${profile.productFocus} ${profile.reminderNote}`.toLowerCase().includes(search);
    return matchesFilter && matchesQuery;
  });
  const totalPages = Math.max(1, Math.ceil(customerRows.length / pageSize));
  const visibleCustomerRows = customerRows.slice((Math.min(page, totalPages) - 1) * pageSize, Math.min(page, totalPages) * pageSize);
  const setPriorityFilter = (filter: typeof customerFilter) => {
    setCustomerFilter(filter);
    setPage(1);
  };
  const persistProfiles = (next: CustomerProfile[]) => {
    setProfiles(next);
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(next));
    } catch {
      // Profiles still work in-memory when storage is unavailable.
    }
  };
  useEffect(() => {
    if (createSignal > 0) {
      setLeadFormOpen(true);
      setTab("all");
    }
  }, [createSignal]);

  const createLeadFromDraft = () => {
    const cleanName = leadDraft.name.trim();

    if (!cleanName) {
      setSyncStatus("Add a lead name before creating the record.");
      return;
    }

    const newLead: LeadRecord = {
      id: `lead-${Date.now()}`,
      name: cleanName,
      source: leadDraft.source,
      stage: leadDraft.stage,
      temperature: leadDraft.temperature,
      ownerId: authProfile?.uid ?? "current-user",
      nextAction: leadDraft.nextAction.trim() || "Send a warm first-contact message",
      nextFollowUpAt: new Date(leadDraft.nextFollowUpAt).toISOString(),
      lastTouchAt: new Date().toISOString(),
      phone: leadDraft.phone.trim(),
      email: leadDraft.email.trim(),
      interestType: leadDraft.interestType,
      relationshipContext: leadDraft.relationshipContext.trim(),
      tags: leadDraft.tags.split(",").map((item) => item.trim()).filter(Boolean),
      assignedSponsor: leadDraft.assignedSponsor.trim(),
      relationshipScore: leadDraft.temperature === "hot" ? 85 : leadDraft.temperature === "warm" ? 60 : 35,
      notes: [
        leadDraft.notes.trim(),
        leadDraft.phone.trim() ? `WhatsApp: ${leadDraft.phone.trim()}` : "",
        leadDraft.email.trim() ? `Email: ${leadDraft.email.trim()}` : "",
        leadDraft.interestType ? `Interest: ${leadDraft.interestType}` : "",
        leadDraft.relationshipContext.trim() ? `Relationship: ${leadDraft.relationshipContext.trim()}` : "",
        leadDraft.assignedSponsor.trim() ? `Sponsor/closer: ${leadDraft.assignedSponsor.trim()}` : "",
        leadDraft.tags.trim() ? `Tags: ${leadDraft.tags.trim()}` : ""
      ].filter(Boolean).join("\n")
    };
    const newProfile = {
      ...makeDefaultProfile(newLead),
      interests: [leadDraft.interestType, leadDraft.tags, leadDraft.relationshipContext]
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ") || "Add interests and context.",
      reminderNote: newLead.nextAction
    };

    setLocalLeads((current) => [newLead, ...current]);
    persistProfiles([newProfile, ...profiles]);
    setSelectedLeadId(newLead.id);
    setLeadFormOpen(false);
    setSyncStatus(`Created lead: ${newLead.name}. Use Customer Profiles to add purchase reminders or sync to Supabase.`);
    trackDupliosEvent("lead_created", { leadId: newLead.id, source: newLead.source, stage: newLead.stage });
    setLeadDraft((current) => ({
      ...current,
      name: "",
      phone: "",
      email: "",
      stage: "new",
      temperature: "warm",
      interestType: "product" as NonNullable<LeadRecord["interestType"]>,
      relationshipContext: "",
      nextAction: "Send a warm first-contact message",
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      assignedSponsor: "",
      tags: "",
      notes: ""
    }));
  };
  const updateProfile = (leadId: string, patch: Partial<CustomerProfile>) => {
    persistProfiles(profiles.map((profile) => profile.leadId === leadId ? { ...profile, ...patch } : profile));
  };
  const syncSelectedProfile = async () => {
    if (!selectedLead || !selectedProfile || !authProfile) {
      setSyncStatus("Sign in and select a customer before syncing.");
      return;
    }

    try {
      setSyncStatus("Syncing customer profile to Supabase...");
      const input = {
        name: selectedLead.name,
        source: selectedLead.source,
        stage: selectedLead.stage,
        interests: selectedProfile.interests.split(",").map((item) => item.trim()).filter(Boolean),
        productFocus: selectedProfile.productFocus,
        purchaseCadenceDays: selectedProfile.purchaseCadenceDays,
        nextFollowUpAt: selectedLead.nextFollowUpAt,
        notes: selectedProfile.reminderNote
      };
      const result = selectedProfile.remoteId
        ? await updateCustomerProfile(authProfile.tenantId, selectedProfile.remoteId, input)
        : await createCustomerProfile(authProfile.tenantId, input);
      const remoteCustomer = result.customer as { id?: string };

      if (remoteCustomer.id) {
        updateProfile(selectedProfile.leadId, { remoteId: remoteCustomer.id });
      }

      setSyncStatus("Customer profile synced to Supabase.");
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Unable to sync customer profile.");
    }
  };
  const loadSavedCustomers = async () => {
    if (!authProfile) {
      setSyncStatus("Sign in before loading saved customers.");
      return;
    }

    try {
      setSyncStatus("Loading saved customer profiles...");
      const result = await listCustomerProfiles(authProfile.tenantId, { q: customerQuery });
      setSyncStatus(`${result.customers.length} saved customer profiles found in Supabase.`);
    } catch (error) {
      setSyncStatus(error instanceof Error ? error.message : "Unable to load saved customers.");
    }
  };
  const addPurchase = () => {
    if (!selectedProfile || !purchaseDraft.product.trim()) return;
    const purchase: PurchaseRecord = {
      id: `purchase-${Date.now()}`,
      product: purchaseDraft.product.trim(),
      purchasedAt: purchaseDraft.purchasedAt,
      quantity: Math.max(1, Number(purchaseDraft.quantity) || 1),
      note: purchaseDraft.note.trim()
    };
    const nextPurchaseAt = new Date(new Date(purchase.purchasedAt).getTime() + selectedProfile.purchaseCadenceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    updateProfile(selectedProfile.leadId, {
      productFocus: purchase.product,
      nextPurchaseAt,
      purchases: [purchase, ...selectedProfile.purchases]
    });
    setLocalLeads((current) => current.map((lead) => lead.id === selectedProfile.leadId ? {
      ...lead,
      stage: "customer",
      nextAction: `Follow up for next ${purchase.product} purchase`,
      nextFollowUpAt: new Date(nextPurchaseAt).toISOString()
    } : lead));
    if (authProfile && selectedProfile.remoteId) {
      void logCustomerPurchase(authProfile.tenantId, selectedProfile.remoteId, {
        product: purchase.product,
        amount: purchase.quantity,
        currency: "USD",
        purchasedAt: purchase.purchasedAt,
        note: purchase.note
      })
        .then(() => setSyncStatus("Purchase logged to Supabase."))
        .catch((error) => setSyncStatus(error instanceof Error ? error.message : "Unable to sync purchase."));
    } else {
      setSyncStatus("Purchase logged locally. Sync the customer profile before cloud purchase logging.");
    }
    setPurchaseDraft({ product: "", purchasedAt: new Date().toISOString().slice(0, 10), quantity: 1, note: "" });
  };
  const copyCustomerReminder = () => {
    if (!selectedLead || !selectedProfile) return;
    const message = `Hi ${selectedLead.name}, quick check-in. Last time you were interested in ${selectedProfile.interests}. How is ${selectedProfile.productFocus} fitting into your routine? Your next purchase window is around ${selectedProfile.nextPurchaseAt}.`;
    void navigator.clipboard.writeText(message);
  };
  const addAutoLead = () => {
    const newLead: LeadRecord = {
      id: `lead-${Date.now()}`,
      name: `New Lead ${localLeads.length + 1}`,
      source: "manual",
      stage: "new",
      temperature: "warm",
      ownerId: "current-user",
      nextAction: "Send a warm opener",
      nextFollowUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "Created from Smart Autopilot."
    };
    setLocalLeads((current) => [
      newLead,
      ...current
    ]);
    persistProfiles([makeDefaultProfile(newLead), ...profiles]);
    setSelectedLeadId(newLead.id);
  };
  const autopilotSuggestions = [
    staleLeads > 0
      ? ["Follow-up Required", `${staleLeads} leads have not been contacted in 5+ days.`, "Auto-generate DMs", addAutoLead]
      : null,
    localLeads.length > 0 && contactedLeads > won
      ? ["Low Conversion Alert", "Your contacted stage is slowing down.", "Try New Scripts", addAutoLead]
      : null,
    hotLeads > 0
      ? ["Smart Lead Scoring", `${hotLeads} hot leads are ready for priority follow-up.`, "Prioritize Leads", addAutoLead]
      : null
  ].filter(Boolean) as Array<[string, string, string, () => void]>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black text-[#18191f]">Growth CRM</h2>
          <p className="text-sm text-[#626873]">Create prospects, remember context, schedule follow-up, and recover missed opportunities.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setLeadFormOpen((open) => !open)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white"
          >
            <Plus size={18} />
            {leadFormOpen ? "Close Lead Form" : "Add Lead"}
          </button>
          <button
            onClick={() => void navigator.clipboard.writeText(captureLink)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dfe2e8] bg-white px-5 text-sm font-black text-[#18191f]"
          >
            <CopyIcon />
            Copy Form Link
          </button>
        </div>
      </div>
      {leadFormOpen ? (
        <div className="rounded-[24px] border border-[#bdd0ff] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-black text-[#18191f]">Add Prospect Or Customer</p>
              <p className="text-sm text-[#626873]">Capture relationship context now so follow-up feels personal later.</p>
            </div>
            <button
              onClick={() => setLeadFormOpen(false)}
              className="h-9 rounded-xl border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]"
            >
              Cancel
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CrmInput label="Name" value={leadDraft.name} onChange={(value) => setLeadDraft((current) => ({ ...current, name: value }))} required />
            <CrmInput label="Phone / WhatsApp" value={leadDraft.phone} onChange={(value) => setLeadDraft((current) => ({ ...current, phone: value }))} />
            <CrmInput label="Email" value={leadDraft.email} onChange={(value) => setLeadDraft((current) => ({ ...current, email: value }))} />
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Source</span>
              <select value={leadDraft.source} onChange={(event) => setLeadDraft((current) => ({ ...current, source: event.target.value as LeadRecord["source"] }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                <option value="manual">Manual</option>
                <option value="referral">Referral</option>
                <option value="event">Event</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Stage</span>
              <select value={leadDraft.stage} onChange={(event) => setLeadDraft((current) => ({ ...current, stage: event.target.value as LeadRecord["stage"] }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                <option value="new">New Lead</option>
                <option value="qualified">Qualified</option>
                <option value="invited">Invited</option>
                <option value="event_registered">Event Registered</option>
                <option value="attended">Attended</option>
                <option value="follow_up">Follow-Up Needed</option>
                <option value="interested">Interested</option>
                <option value="customer">Customer</option>
                <option value="business_prospect">Business Prospect</option>
                <option value="team_member">Team Member</option>
                <option value="not_now">Not Now</option>
                <option value="lost">Lost / Unresponsive</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Temperature</span>
              <select value={leadDraft.temperature} onChange={(event) => setLeadDraft((current) => ({ ...current, temperature: event.target.value as LeadRecord["temperature"] }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="hot">Hot</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Interest Type</span>
              <select value={leadDraft.interestType} onChange={(event) => setLeadDraft((current) => ({ ...current, interestType: event.target.value as NonNullable<LeadRecord["interestType"]> }))} className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none">
                <option value="product">Product</option>
                <option value="business">Business</option>
                <option value="event">Event</option>
                <option value="customer">Customer</option>
                <option value="team">Team</option>
              </select>
            </label>
            <CrmInput label="Next Follow-Up" type="datetime-local" value={leadDraft.nextFollowUpAt} onChange={(value) => setLeadDraft((current) => ({ ...current, nextFollowUpAt: value }))} />
            <CrmInput label="Assigned Sponsor / Closer" value={leadDraft.assignedSponsor} onChange={(value) => setLeadDraft((current) => ({ ...current, assignedSponsor: value }))} />
            <CrmInput label="Tags" value={leadDraft.tags} onChange={(value) => setLeadDraft((current) => ({ ...current, tags: value }))} />
            <CrmInput label="Next Action" value={leadDraft.nextAction} onChange={(value) => setLeadDraft((current) => ({ ...current, nextAction: value }))} className="xl:col-span-2" />
            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Relationship Context</span>
              <textarea value={leadDraft.relationshipContext} onChange={(event) => setLeadDraft((current) => ({ ...current, relationshipContext: event.target.value }))} className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm outline-none" placeholder="How you know them, family/context, what matters to them..." />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Notes</span>
              <textarea value={leadDraft.notes} onChange={(event) => setLeadDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm outline-none" placeholder="Positive replies, objection, event promise, reorder detail..." />
            </label>
          </div>
          <button
            onClick={createLeadFromDraft}
            className="mt-4 h-11 rounded-xl bg-[#111827] px-5 text-sm font-black text-white"
          >
            Create Lead And Schedule Follow-Up
          </button>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-5">
        <MetricBox label="Total Leads" value={String(localLeads.length)} />
        <MetricBox label="New Leads" value={String(localLeads.filter((lead) => lead.stage === "new").length)} />
        <MetricBox label="In Progress" value={String(inProgress)} />
        <MetricBox label="Closed Won" value={String(won)} />
        <MetricBox label="Purchase Reminders" value={String(purchaseReminderCount)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {[
          ["Relationship Notes", "Remember family, goals, timing, objections, and what they said last time."],
          ["Next Care Touch", "Schedule a helpful check-in before asking for a decision."],
          ["Sponsor Handoff", "Invite your leader when trust is high or the question needs experience."],
          ["No-Pressure Promise", "Keep every message personal, permission-based, and easy to say no to."]
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-[#dfe2e8] bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7e8] text-[#f59e0b]">
              <HeartHandshake size={18} />
            </div>
            <p className="font-black text-[#18191f]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#626873]">{body}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[24px] border border-[#bdd0ff] bg-[#f2f5ff] p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f62ed] text-white"><Zap size={19} /></span>
          <p className="text-xl font-black text-[#18191f]">Smart Autopilot Suggestions</p>
          <span className="rounded-full bg-[#52c59a] px-2 py-1 text-[10px] font-black uppercase text-white">Running</span>
        </div>
        {autopilotSuggestions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {autopilotSuggestions.map(([title, body, action, handler]) => (
            <div key={String(title)} className="rounded-2xl border border-[#dfe2e8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]">
                <MessageSquare size={18} />
              </div>
              <p className="font-black text-[#18191f]">{String(title)}</p>
              <p className="mt-2 min-h-10 text-sm text-[#626873]">{String(body)}</p>
              <button onClick={handler as () => void} className="mt-5 h-10 w-full rounded-xl bg-[#2f62ed] text-xs font-black uppercase tracking-[0.12em] text-white">
                {String(action)}
              </button>
            </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#bdd0ff] bg-white p-6 text-sm font-semibold text-[#626873]">
            No lead suggestions yet. New leads and follow-up activity will appear here when there is real workspace data.
          </div>
        )}
      </div>
      <div className="inline-flex rounded-xl border border-[#dfe2e8] bg-white p-1">
        {(["overview", "all", "profiles"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`h-9 rounded-lg px-5 text-xs font-black uppercase ${tab === item ? "bg-[#2f62ed] text-white" : "text-[#394150]"}`}>
            {item === "all" ? "All Leads" : item === "profiles" ? "Customer Profiles" : "Overview"}
          </button>
        ))}
      </div>
      {tab === "all" ? <LeadGrid leads={localLeads} /> : null}
      {tab === "profiles" && selectedLead && selectedProfile ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xl font-black text-[#18191f]">Customer Table</p>
                <p className="text-sm text-[#626873]">{customerRows.length} matching records · showing {visibleCustomerRows.length}</p>
              </div>
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-10 rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none">
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <input value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Search name, product, interest, note, stage, source..." />
              <div className="flex gap-2">
                <button onClick={loadSavedCustomers} className="h-11 rounded-xl border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#18191f]">Load Cloud</button>
                <button onClick={() => void navigator.clipboard.writeText(customerRows.map(({ lead, profile }) => [lead.name, lead.stage, profile.productFocus, profile.nextPurchaseAt, lead.nextFollowUpAt, profile.interests].join(",")).join("\n"))} className="h-11 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white">Export View</button>
              </div>
            </div>
            <p className="mt-3 rounded-xl border border-[#dfe2e8] bg-[#fbfcff] px-3 py-2 text-xs font-semibold text-[#626873]">{syncStatus}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["due", "Due Today"],
                ["reorder", "Reorder Soon"],
                ["customers", "Customers"],
                ["hot", "Hot"],
                ["inactive", "Inactive"],
                ["all", "All"]
              ].map(([id, label]) => (
                <button key={id} onClick={() => setPriorityFilter(id as typeof customerFilter)} className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] ${customerFilter === id ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>{label}</button>
              ))}
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#dfe2e8]">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#f7f9ff] text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th>Stage</th>
                    <th>Product</th>
                    <th>Last Purchase</th>
                    <th>Next Purchase</th>
                    <th>Follow-Up</th>
                    <th>Interest Tags</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomerRows.map(({ lead, profile }) => {
                    const lastPurchase = profile.purchases[0];
                    const dueSoon = new Date(profile.nextPurchaseAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={`cursor-pointer border-t border-[#edf0f4] ${selectedLead.id === lead.id ? "bg-[#f0f4ff]" : "bg-white hover:bg-[#fbfcff]"}`}>
                        <td className="px-4 py-3"><p className="font-black text-[#18191f]">{lead.name}</p><p className="text-xs text-[#626873]">{lead.source} · {lead.temperature}</p></td>
                        <td className="capitalize text-[#394150]">{lead.stage.replace("_", " ")}</td>
                        <td className="font-bold text-[#18191f]">{profile.productFocus}</td>
                        <td className="text-[#626873]">{lastPurchase?.purchasedAt ?? "-"}</td>
                        <td className="font-bold text-[#2f62ed]">{profile.nextPurchaseAt}</td>
                        <td className="text-[#626873]">{new Date(lead.nextFollowUpAt).toLocaleDateString()}</td>
                        <td className="max-w-[220px] truncate text-[#626873]" title={profile.interests}>{profile.interests}</td>
                        <td>{dueSoon ? <span className="rounded-full bg-[#fff7ea] px-2 py-1 text-[10px] font-black uppercase text-[#9a5a00]">Reorder</span> : <span className="rounded-full bg-[#eafbf3] px-2 py-1 text-[10px] font-black uppercase text-[#047857]">Ok</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleCustomerRows.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-[#626873]">No customers match this view.</div> : null}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#626873]">
              <button onClick={() => setPage((current) => Math.max(1, current - 1))} className="h-9 rounded-lg border border-[#dfe2e8] px-3 disabled:opacity-40" disabled={page <= 1}>Previous</button>
              <span>Page {Math.min(page, totalPages)} of {totalPages}</span>
              <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="h-9 rounded-lg border border-[#dfe2e8] px-3 disabled:opacity-40" disabled={page >= totalPages}>Next</button>
            </div>
          </div>
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-2xl font-black text-[#18191f]">{selectedLead.name}</p>
                <p className="mt-1 text-sm text-[#626873]">{selectedLead.source} · {selectedLead.stage} · next follow-up {new Date(selectedLead.nextFollowUpAt).toLocaleDateString()}</p>
              </div>
              <button onClick={copyCustomerReminder} className="h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white">Copy Reminder</button>
              <button onClick={syncSelectedProfile} className="h-10 rounded-xl border border-[#2f62ed] px-4 text-xs font-black uppercase text-[#2f62ed]">Sync Profile</button>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Interests</span>
                <textarea value={selectedProfile.interests} onChange={(event) => updateProfile(selectedProfile.leadId, { interests: event.target.value })} className="min-h-28 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none" />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Reminder Note</span>
                <textarea value={selectedProfile.reminderNote} onChange={(event) => updateProfile(selectedProfile.leadId, { reminderNote: event.target.value })} className="min-h-28 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none" />
              </label>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr]">
              <input value={selectedProfile.productFocus} onChange={(event) => updateProfile(selectedProfile.leadId, { productFocus: event.target.value })} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Product focus" />
              <input type="date" value={selectedProfile.nextPurchaseAt} onChange={(event) => updateProfile(selectedProfile.leadId, { nextPurchaseAt: event.target.value })} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" />
              <input type="number" value={selectedProfile.purchaseCadenceDays} onChange={(event) => updateProfile(selectedProfile.leadId, { purchaseCadenceDays: Number(event.target.value) || 30 })} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Cadence days" />
            </div>
            <div className="mt-6 rounded-2xl bg-[#f7f9ff] p-4">
              <p className="font-black text-[#18191f]">Log Product Purchase</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.7fr_0.5fr]">
                <input value={purchaseDraft.product} onChange={(event) => setPurchaseDraft((current) => ({ ...current, product: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Product purchased" />
                <input type="date" value={purchaseDraft.purchasedAt} onChange={(event) => setPurchaseDraft((current) => ({ ...current, purchasedAt: event.target.value }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" />
                <input type="number" value={purchaseDraft.quantity} onChange={(event) => setPurchaseDraft((current) => ({ ...current, quantity: Number(event.target.value) }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" />
              </div>
              <input value={purchaseDraft.note} onChange={(event) => setPurchaseDraft((current) => ({ ...current, note: event.target.value }))} className="mt-3 h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Purchase note or reaction" />
              <button onClick={addPurchase} disabled={!purchaseDraft.product.trim()} className="mt-3 h-10 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white disabled:bg-[#9ca3af]">Log Purchase</button>
            </div>
            <div className="mt-5 space-y-3">
              <p className="font-black text-[#18191f]">Purchase History</p>
              {selectedProfile.purchases.length > 0 ? selectedProfile.purchases.map((purchase) => (
                <div key={purchase.id} className="rounded-xl border border-[#dfe2e8] p-4">
                  <p className="font-black text-[#18191f]">{purchase.product} x{purchase.quantity}</p>
                  <p className="mt-1 text-sm text-[#626873]">{purchase.purchasedAt} · {purchase.note || "No note"}</p>
                </div>
              )) : <div className="rounded-xl border border-dashed border-[#bdd0ff] bg-white p-4 text-sm font-semibold text-[#626873]">No purchases logged yet.</div>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OutreachGrid({ tasks }: { tasks: OutreachTask[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.id} title={task.target} tag={`${task.platform} · ${task.action}`}>
          <p>{task.script}</p>
          <p className="mt-3 text-xs font-black uppercase text-[#2f62ed]">{task.status}</p>
        </Card>
      ))}
    </div>
  );
}

function LinkedInEngine({ tasks }: { tasks: OutreachTask[] }) {
  const storageKey = "duplios-social-outreach-tasks";
  const platformOptions: OutreachTask["platform"][] = ["linkedin", "instagram", "facebook", "whatsapp", "sms"];
  const actionOptions: OutreachTask["action"][] = ["connect", "message", "comment", "follow_up", "invite"];
  const templates: Array<Pick<OutreachTask, "platform" | "action" | "script"> & { title: string }> = [
    {
      title: "LinkedIn connection",
      platform: "linkedin",
      action: "connect",
      script: "Hi {{first_name}}, I noticed your work around {{topic}}. Open to connecting?"
    },
    {
      title: "Instagram warm DM",
      platform: "instagram",
      action: "message",
      script: "Hey {{first_name}}, your post on {{topic}} stood out. I have a quick resource that may help. Want me to send it?"
    },
    {
      title: "Facebook community follow-up",
      platform: "facebook",
      action: "follow_up",
      script: "Hi {{first_name}}, following up from the group conversation. Is {{outcome}} still something you want to work on this month?"
    },
    {
      title: "WhatsApp invitation",
      platform: "whatsapp",
      action: "invite",
      script: "Hi {{first_name}}, I thought of you because you mentioned {{goal}}. Open to a quick 10-minute overview this week?"
    },
    {
      title: "SMS reminder",
      platform: "sms",
      action: "follow_up",
      script: "Hi {{first_name}}, quick reminder about the overview. Does today or tomorrow work better?"
    }
  ];
  const makeTaskId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `outreach-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };
  const readStoredTasks = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return tasks;
      const parsed = JSON.parse(stored) as OutreachTask[];
      return Array.isArray(parsed) ? parsed : tasks;
    } catch {
      return tasks;
    }
  };
  const [localTasks, setLocalTasks] = useState<OutreachTask[]>(readStoredTasks);
  const [statusFilter, setStatusFilter] = useState<"all" | OutreachTask["status"]>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | OutreachTask["platform"]>("all");
  const [query, setQuery] = useState("");
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [draft, setDraft] = useState<Omit<OutreachTask, "id" | "status">>({
    platform: "linkedin",
    action: "connect",
    target: "",
    script: ""
  });
  const linkedinClientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID as string | undefined;
  const queuedCount = localTasks.filter((task) => task.status === "queued").length;
  const doneCount = localTasks.filter((task) => task.status === "done").length;
  const skippedCount = localTasks.filter((task) => task.status === "skipped").length;
  const filtered = localTasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || task.platform === platformFilter;
    const matchesQuery =
      !query.trim() ||
      `${task.target} ${task.script} ${task.action} ${task.platform}`.toLowerCase().includes(query.trim().toLowerCase());

    return matchesStatus && matchesPlatform && matchesQuery;
  });
  const persistTasks = (next: OutreachTask[]) => {
    setLocalTasks(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Local storage can be unavailable in restricted browsers; the in-memory queue still works.
    }
  };
  const addTask = () => {
    if (!draft.target.trim() || !draft.script.trim()) return;
    persistTasks([
      {
        id: makeTaskId(),
        platform: draft.platform,
        action: draft.action,
        target: draft.target.trim(),
        script: draft.script.trim(),
        status: "queued"
      },
      ...localTasks
    ]);
    setDraft((current) => ({ ...current, target: "", script: "" }));
  };
  const importBulkTasks = () => {
    const imported = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line): OutreachTask => {
        const [platformValue, targetValue, ...scriptParts] = line.split(",").map((part) => part.trim());
        const platform = platformOptions.includes(platformValue as OutreachTask["platform"])
          ? (platformValue as OutreachTask["platform"])
          : draft.platform;
        const target = platform === platformValue ? targetValue : platformValue;
        const script = platform === platformValue ? scriptParts.join(", ") : [targetValue, ...scriptParts].filter(Boolean).join(", ");

        return {
          id: makeTaskId(),
          platform,
          action: draft.action,
          target: target || "Unnamed prospect",
          script: script || draft.script || "Personalize this message before sending.",
          status: "queued"
        };
      });

    if (!imported.length) return;
    persistTasks([...imported, ...localTasks]);
    setBulkText("");
  };
  const updateTaskStatus = (id: string, status: OutreachTask["status"]) => {
    persistTasks(localTasks.map((task) => (task.id === id ? { ...task, status } : task)));
  };
  const deleteTask = (id: string) => {
    persistTasks(localTasks.filter((task) => task.id !== id));
  };
  const copyScript = (task: OutreachTask) => {
    void navigator.clipboard.writeText(task.script);
    setCopiedTaskId(task.id);
    window.setTimeout(() => setCopiedTaskId(null), 1400);
  };
  const openPlatform = (task: OutreachTask) => {
    const encodedTarget = encodeURIComponent(task.target);
    const encodedScript = encodeURIComponent(task.script);
    const destinations: Record<OutreachTask["platform"], string> = {
      linkedin: `https://www.linkedin.com/search/results/people/?keywords=${encodedTarget}`,
      instagram: "https://www.instagram.com/",
      facebook: `https://www.facebook.com/search/top?q=${encodedTarget}`,
      whatsapp: `https://wa.me/?text=${encodedScript}`,
      sms: `sms:?&body=${encodedScript}`
    };
    window.open(destinations[task.platform], "_blank", "noopener,noreferrer");
  };
  const connectLinkedIn = () => {
    if (!linkedinClientId) return;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: linkedinClientId,
      redirect_uri: `${window.location.origin}/linkedin/callback`,
      scope: "openid profile email",
      state: makeTaskId()
    });

    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
      <div className="space-y-4">
        <div id="social-outreach-queue" className="rounded-2xl border border-[#dedfe4] bg-white p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">Outreach command</p>
          <div className="mt-4 space-y-4">
            <StatRow label="Queued" value={queuedCount} />
            <StatRow label="Completed" value={doneCount} />
            <StatRow label="Skipped" value={skippedCount} />
            <StatRow label="Platforms" value={new Set(localTasks.map((task) => task.platform)).size} />
          </div>
          <div className="mt-5 rounded-xl border border-[#bdd0ff] bg-[#f0f4ff] p-3 text-xs font-bold leading-5 text-[#2f62ed]">
            Manual mode is active. Users can create outreach, copy scripts, open the matching platform, and track completion without a paid social API.
          </div>
          {linkedinClientId ? (
            <button
              onClick={connectLinkedIn}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2f62ed] text-xs font-black uppercase text-white"
            >
              <ExternalLink size={14} />
              Connect LinkedIn OAuth
            </button>
          ) : null}
        </div>
        <div className="rounded-2xl bg-[#175aa8] p-5 text-white">
          <Zap className="mb-4 text-white" />
          <p className="font-black text-white">Operating Rule</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#eef6ff]">Every touch needs a target, channel, script, and status. This makes the module usable even before platform API approvals.</p>
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf2ff] text-[#2f62ed]">
              <Plus size={18} />
            </span>
            <div>
              <p className="font-black text-[#18191f]">Queue Outreach</p>
              <p className="text-sm text-[#626873]">Create the exact action the user will complete today.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Platform</span>
              <select
                value={draft.platform}
                onChange={(event) => setDraft((current) => ({ ...current, platform: event.target.value as OutreachTask["platform"] }))}
                className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none"
              >
                {platformOptions.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Action</span>
              <select
                value={draft.action}
                onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value as OutreachTask["action"] }))}
                className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none"
              >
                {actionOptions.map((action) => <option key={action} value={action}>{action.replace("_", " ")}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Target</span>
              <input
                data-social-target-input="true"
                value={draft.target}
                onChange={(event) => setDraft((current) => ({ ...current, target: event.target.value }))}
                className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none"
                placeholder="Name, handle, phone, or segment"
              />
            </label>
          </div>
          <label className="mt-3 block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Script</span>
            <textarea
              value={draft.script}
              onChange={(event) => setDraft((current) => ({ ...current, script: event.target.value }))}
              className="min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none"
              placeholder="Write the message the user should copy and send."
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, platform: template.platform, action: template.action, script: template.script }))}
                className="h-8 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]"
              >
                {template.title}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={addTask}
            disabled={!draft.target.trim() || !draft.script.trim()}
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-xs font-black uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:bg-[#a9b9ef]"
          >
            <Send size={15} />
            Add to Queue
          </button>
        </div>
        <div className="rounded-2xl border border-[#dedfe4] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#dedfe4] p-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d828c]" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-xl border border-[#dedfe4] pl-9 pr-3 text-sm outline-none lg:w-80"
                placeholder="Search targets, scripts, or platforms..."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(["all", "queued", "done", "skipped"] as const).map((item) => (
                <button key={item} onClick={() => setStatusFilter(item)} className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${statusFilter === item ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>
                  {item === "queued" ? "Pending" : item}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-[#dedfe4] p-4">
            {(["all", ...platformOptions] as const).map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${platformFilter === platform ? "bg-[#111827] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}
              >
                {platform}
              </button>
            ))}
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {filtered.length > 0 ? filtered.map((task) => (
              <div key={task.id} className="rounded-xl border border-[#dedfe4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#18191f]">{task.target}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#2f62ed]">{task.platform} · {task.action.replace("_", " ")} · {task.status}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe2e8] text-[#626873]"
                    aria-label={`Delete outreach for ${task.target}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#626873]">{task.script}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyScript(task)}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]"
                  >
                    <CopyIcon size={13} />
                    {copiedTaskId === task.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPlatform(task)}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]"
                  >
                    <ExternalLink size={13} />
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTaskStatus(task.id, task.status === "done" ? "queued" : "done")}
                    className="h-8 rounded-lg bg-[#2f62ed] px-3 text-[10px] font-black uppercase text-white"
                  >
                    {task.status === "done" ? "Reopen" : "Done"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTaskStatus(task.id, task.status === "skipped" ? "queued" : "skipped")}
                    className="h-8 rounded-lg bg-[#f3f4f6] px-3 text-[10px] font-black uppercase text-[#394150]"
                  >
                    {task.status === "skipped" ? "Unskip" : "Skip"}
                  </button>
                </div>
              </div>
            )) : (
              <div className="md:col-span-2 rounded-xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-6 text-sm font-semibold leading-6 text-[#626873]">
                No outreach is queued yet. Add a target above, choose a template, or paste prospects below to build today&apos;s action list.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
          <p className="font-black text-[#18191f]">Bulk Add</p>
          <p className="mt-1 text-sm text-[#626873]">Paste one outreach item per line. Use `platform, target, script`, or just paste a target to use the selected platform and action.</p>
          <textarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            className="mt-4 min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none"
            placeholder="linkedin, Jane Tan, Hi Jane, open to connecting?\nwhatsapp, +60123456789, Hi Jane, quick follow-up..."
          />
          <button
            type="button"
            onClick={importBulkTasks}
            disabled={!bulkText.trim()}
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
          >
            <Plus size={14} />
            Import Queue
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomationStudio({ sequences }: { sequences: AutomationSequence[] }) {
  const storageKey = "duplios-automation-sequences";
  const readStored = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return sequences;
      const parsed = JSON.parse(stored) as AutomationSequence[];
      return Array.isArray(parsed) ? parsed : sequences;
    } catch {
      return sequences;
    }
  };
  const [localSequences, setLocalSequences] = useState<AutomationSequence[]>(readStored);
  const [selectedId, setSelectedId] = useState(localSequences[0]?.id ?? "");
  const [automationTab, setAutomationTab] = useState<"sequences" | "activity" | "matrix">("sequences");
  const [draft, setDraft] = useState({
    name: "",
    trigger: "new_lead" as AutomationSequence["trigger"],
    channel: "dm" as FollowUpStep["channel"],
    dayOffset: 0,
    title: "",
    goal: "",
    script: ""
  });
  const selectedSequence = localSequences.find((sequence) => sequence.id === selectedId) ?? localSequences[0];
  const activeCount = localSequences.filter((sequence) => sequence.status === "active").length;
  const totalSteps = localSequences.reduce((sum, sequence) => sum + sequence.steps.length, 0);
  const nextStep = localSequences.flatMap((sequence) => sequence.steps.map((step) => ({ sequence, step }))).sort((a, b) => a.step.dayOffset - b.step.dayOffset)[0];
  const persist = (next: AutomationSequence[]) => {
    setLocalSequences(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep the in-memory workflow usable when storage is unavailable.
    }
  };
  const makeId = (prefix: string) => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };
  const addSequence = () => {
    const nextSequence: AutomationSequence = {
      id: makeId("seq"),
      name: draft.name.trim() || "New Follow-Up Sequence",
      trigger: draft.trigger,
      status: "draft",
      steps: []
    };
    persist([
      nextSequence,
      ...localSequences
    ]);
    setSelectedId(nextSequence.id);
    setDraft((current) => ({ ...current, name: "" }));
  };
  const updateSequence = (id: string, patch: Partial<AutomationSequence>) => {
    persist(localSequences.map((sequence) => sequence.id === id ? { ...sequence, ...patch } : sequence));
  };
  const deleteSequence = (id: string) => {
    const next = localSequences.filter((sequence) => sequence.id !== id);
    persist(next);
    setSelectedId(next[0]?.id ?? "");
  };
  const addStep = () => {
    if (!selectedSequence || !draft.title.trim() || !draft.script.trim()) return;
    const step: FollowUpStep = {
      id: makeId("step"),
      dayOffset: Number(draft.dayOffset) || 0,
      channel: draft.channel,
      title: draft.title.trim(),
      script: draft.script.trim(),
      goal: draft.goal.trim() || "Move the relationship to the next clear decision."
    };
    updateSequence(selectedSequence.id, { steps: [...selectedSequence.steps, step].sort((a, b) => a.dayOffset - b.dayOffset) });
    setDraft((current) => ({ ...current, title: "", goal: "", script: "", dayOffset: current.dayOffset + 1 }));
  };
  const deleteStep = (sequenceId: string, stepId: string) => {
    const sequence = localSequences.find((item) => item.id === sequenceId);
    if (!sequence) return;
    updateSequence(sequenceId, { steps: sequence.steps.filter((step) => step.id !== stepId) });
  };
  const duplicateSequence = (sequence: AutomationSequence) => {
    const clone: AutomationSequence = {
      ...sequence,
      id: makeId("seq"),
      name: `${sequence.name} Copy`,
      status: "draft",
      steps: sequence.steps.map((step) => ({ ...step, id: makeId("step") }))
    };
    persist([clone, ...localSequences]);
    setSelectedId(clone.id);
  };

  if (localSequences.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-6">
        <p className="text-xl font-black text-[#18191f]">No automation sequences yet</p>
        <p className="mt-2 text-sm text-[#626873]">Create a trigger-based follow-up flow, then add the exact messages the team should send.</p>
        <button onClick={addSequence} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white">
          <Plus size={17} /> Create First Sequence
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-[#dedfe4] bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-[#edf2ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#2f62ed]">Automation Engine</p>
            <h2 className="text-3xl font-black text-[#18191f]">Automated Follow-ups</h2>
            <p className="mt-2 text-sm text-[#626873]">Set up multi-step sequences to nurture your leads automatically.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-2xl border border-[#dfe2e8] bg-white p-1 shadow-sm">
              {(["sequences", "activity", "matrix"] as const).map((tab) => (
                <button key={tab} onClick={() => setAutomationTab(tab)} className={`h-10 rounded-xl px-5 text-[10px] font-black uppercase tracking-[0.12em] ${automationTab === tab ? "bg-[#2f62ed] text-white" : "text-[#394150]"}`}>
                  {tab}
                </button>
              ))}
            </div>
            <button onClick={addSequence} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white shadow-lg shadow-blue-200">
              <Plus size={17} /> Create Sequence
            </button>
          </div>
        </div>
      </div>

      {automationTab !== "sequences" ? (
        <div className="grid gap-4 md:grid-cols-4">
          <MetricBox label="Sequences" value={String(localSequences.length)} />
          <MetricBox label="Active" value={String(activeCount)} />
          <MetricBox label="Steps" value={String(totalSteps)} />
          <MetricBox label="Next Touch" value={nextStep ? `Day ${nextStep.step.dayOffset}` : "None"} />
        </div>
      ) : null}

      {automationTab === "activity" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {localSequences.flatMap((sequence) => sequence.steps.map((step) => ({ sequence, step }))).map(({ sequence, step }) => (
            <div key={`${sequence.id}-${step.id}`} className="rounded-2xl border border-[#dedfe4] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#18191f]">Day {step.dayOffset}: {step.title}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#2f62ed]">{sequence.name} · {step.channel}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${sequence.status === "active" ? "bg-[#eafbf3] text-[#047857]" : "bg-[#fff7ea] text-[#9a5a00]"}`}>{sequence.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#626873]">{step.script}</p>
              <button onClick={() => void navigator.clipboard.writeText(step.script)} className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]">
                <CopyIcon size={13} /> Copy Step
              </button>
            </div>
          ))}
        </div>
      ) : automationTab === "matrix" ? (
        <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
          <p className="font-black text-[#18191f]">Trigger Matrix</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">
                <tr><th className="py-3">Sequence</th><th>Trigger</th><th>Status</th><th>DM</th><th>SMS</th><th>Email</th><th>Call</th><th>LinkedIn</th></tr>
              </thead>
              <tbody>
                {localSequences.map((sequence) => (
                  <tr key={sequence.id} className="border-t border-[#edf0f4]">
                    <td className="py-3 font-black text-[#18191f]">{sequence.name}</td>
                    <td className="capitalize text-[#626873]">{sequence.trigger.replace("_", " ")}</td>
                    <td className="capitalize text-[#626873]">{sequence.status}</td>
                    {(["dm", "sms", "email", "call", "linkedin"] as const).map((channel) => (
                      <td key={channel} className="font-black text-[#2f62ed]">{sequence.steps.filter((step) => step.channel === channel).length}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <p className="font-black text-[#18191f]">Create Sequence</p>
            <div className="mt-4 grid gap-3">
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none"
                placeholder="Sequence name"
              />
              <select
                value={draft.trigger}
                onChange={(event) => setDraft((current) => ({ ...current, trigger: event.target.value as AutomationSequence["trigger"] }))}
                className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none"
              >
                <option value="new_lead">New lead</option>
                <option value="no_reply">No reply</option>
                <option value="appointment_booked">Appointment booked</option>
                <option value="new_joiner">New joiner</option>
              </select>
              <button onClick={addSequence} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2f62ed] px-5 text-sm font-black text-white">
                <Plus size={17} /> Create Sequence
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {localSequences.map((sequence) => (
              <button
                key={sequence.id}
                onClick={() => setSelectedId(sequence.id)}
                className={`w-full rounded-2xl border p-4 text-left ${selectedSequence?.id === sequence.id ? "border-[#2f62ed] bg-[#f0f4ff]" : "border-[#dedfe4] bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#18191f]">{sequence.name}</p>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#626873]">{sequence.trigger.replace("_", " ")} · {sequence.steps.length} steps</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${sequence.status === "active" ? "bg-[#eafbf3] text-[#047857]" : sequence.status === "paused" ? "bg-[#fff7ea] text-[#9a5a00]" : "bg-[#edf2ff] text-[#2f62ed]"}`}>
                    {sequence.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {selectedSequence ? (
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <input
                  value={selectedSequence.name}
                  onChange={(event) => updateSequence(selectedSequence.id, { name: event.target.value })}
                  className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-xl font-black text-[#18191f] outline-none lg:w-96"
                />
                <p className="mt-2 text-sm text-[#626873]">Build the message path this sequence runs after its trigger.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["draft", "active", "paused"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateSequence(selectedSequence.id, { status })}
                    className={`h-9 rounded-lg px-3 text-[10px] font-black uppercase ${selectedSequence.status === status ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}
                  >
                    {status}
                  </button>
                ))}
                <button onClick={() => duplicateSequence(selectedSequence)} className="h-9 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]">Duplicate</button>
                <button onClick={() => deleteSequence(selectedSequence.id)} className="h-9 rounded-lg bg-[#fff0f0] px-3 text-[10px] font-black uppercase text-[#b42318]">Delete</button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[0.6fr_0.8fr_1fr]">
              <input
                type="number"
                min={0}
                value={draft.dayOffset}
                onChange={(event) => setDraft((current) => ({ ...current, dayOffset: Number(event.target.value) }))}
                className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none"
                placeholder="Day"
              />
              <select
                value={draft.channel}
                onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value as FollowUpStep["channel"] }))}
                className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm font-bold outline-none"
              >
                <option value="dm">DM</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none"
                placeholder="Step title"
              />
            </div>
            <input
              value={draft.goal}
              onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value }))}
              className="mt-3 h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none"
              placeholder="Goal for this step"
            />
            <textarea
              value={draft.script}
              onChange={(event) => setDraft((current) => ({ ...current, script: event.target.value }))}
              className="mt-3 min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none"
              placeholder="Message, call opener, or follow-up script"
            />
            <button
              onClick={addStep}
              disabled={!draft.title.trim() || !draft.script.trim()}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
            >
              <Plus size={14} /> Add Step
            </button>
            <div className="mt-5 space-y-3">
              {selectedSequence.steps.length > 0 ? selectedSequence.steps.map((step) => (
                <div key={step.id} className="rounded-xl border border-[#dedfe4] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#18191f]">Day {step.dayOffset}: {step.title}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#2f62ed]">{step.channel} · {step.goal}</p>
                    </div>
                    <button onClick={() => deleteStep(selectedSequence.id, step.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe2e8] text-[#626873]" aria-label={`Delete ${step.title}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#626873]">{step.script}</p>
                  <button onClick={() => void navigator.clipboard.writeText(step.script)} className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-[#dfe2e8] px-3 text-[10px] font-black uppercase text-[#394150]">
                    <CopyIcon size={13} /> Copy
                  </button>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-5 text-sm font-semibold text-[#626873]">
                  No steps yet. Add the first message above to make this sequence executable.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}

function TeamMetricsGrid({ teamNodes }: { teamNodes: TeamMemberNode[] }) {
  const storageKey = "duplios-team-metrics";
  const readStored = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return teamNodes;
      const parsed = JSON.parse(stored) as TeamMemberNode[];
      return Array.isArray(parsed) ? parsed : teamNodes;
    } catch {
      return teamNodes;
    }
  };
  const [nodes, setNodes] = useState<TeamMemberNode[]>(readStored);
  const [statusFilter, setStatusFilter] = useState<"all" | TeamMemberNode["status"]>("all");
  const [metricsTab, setMetricsTab] = useState<"growth" | "performers" | "funnel">("growth");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState({ pv: 5000, tv: 60000, duplication: 80 });
  const filteredNodes = nodes.filter((node) => {
    const matchesStatus = statusFilter === "all" || node.status === statusFilter;
    const matchesQuery = !query.trim() || `${node.name} ${node.email} ${node.rank} ${node.leg}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesStatus && matchesQuery;
  });
  const totalPv = nodes.reduce((sum, node) => sum + node.personalVolume, 0);
  const totalTv = nodes.reduce((sum, node) => sum + node.teamVolume, 0);
  const totalGv = nodes.reduce((sum, node) => sum + node.groupVolume, 0);
  const averageDuplication = Math.round(nodes.reduce((sum, node) => sum + node.duplicationScore, 0) / Math.max(nodes.length, 1));
  const activeBuilders = nodes.reduce((sum, node) => sum + node.activeBuilders, 0);
  const atRiskCount = nodes.filter((node) => node.status === "at_risk" || node.duplicationScore < 55).length;
  const activeMemberCount = nodes.filter((node) => node.status === "active").length;
  const activeMemberPercent = Math.round((activeMemberCount / Math.max(nodes.length, 1)) * 100);
  const acquisitionBars = [0, 1, 2, 3, 4, 5, 6].map((item) => {
    const value = Math.max(1, (nodes.length + item + activeBuilders) % 8);
    return {
      day: ["Apr 29", "Apr 30", "May 01", "May 02", "May 03", "May 04", "May 05"][item],
      value,
      height: Math.max(8, value * 12)
    };
  });
  const persist = (next: TeamMemberNode[]) => {
    setNodes(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Metrics remain editable in-memory if storage is restricted.
    }
  };
  const updateNodeNumber = (id: string, key: "personalVolume" | "teamVolume" | "groupVolume" | "activeBuilders" | "customers" | "duplicationScore", value: number) => {
    persist(nodes.map((node) => node.id === id ? { ...node, [key]: Math.max(0, value) } : node));
  };
  const updateNodeStatus = (id: string, status: TeamMemberNode["status"]) => {
    persist(nodes.map((node) => node.id === id ? { ...node, status } : node));
  };
  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Rank", "Status", "PV", "TV", "GV", "Builders", "Customers", "Duplication"],
      ...nodes.map((node) => [node.name, node.email, node.rank, node.status, node.personalVolume, node.teamVolume, node.groupVolume, node.activeBuilders, node.customers, node.duplicationScore])
    ];
    void navigator.clipboard.writeText(rows.map((row) => row.join(",")).join("\n"));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricBox label="Team Size" value={String(nodes.length)} />
        <MetricBox label="Network Leads" value={String(activeBuilders)} />
        <MetricBox label="Avg. Conv." value={`${averageDuplication}%`} />
        <MetricBox label="Tasks Done" value={String(nodes.filter((node) => node.status === "active").length)} />
      </div>
      <div className="inline-flex w-full rounded-2xl border border-[#dfe2e8] bg-white p-1 shadow-sm">
        {(["growth", "performers", "funnel"] as const).map((tab) => (
          <button key={tab} onClick={() => setMetricsTab(tab)} className={`h-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] ${metricsTab === tab ? "bg-[#2f62ed] text-white" : "text-[#394150]"}`}>
            {tab}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Search team member, rank, email, or leg" />
          <input type="number" value={targets.pv} onChange={(event) => setTargets((current) => ({ ...current, pv: Number(event.target.value) || 1 }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="PV target" />
          <input type="number" value={targets.tv} onChange={(event) => setTargets((current) => ({ ...current, tv: Number(event.target.value) || 1 }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="TV target" />
          <input type="number" value={targets.duplication} onChange={(event) => setTargets((current) => ({ ...current, duplication: Number(event.target.value) || 1 }))} className="h-11 rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none" placeholder="Duplication target" />
          <button onClick={exportCsv} className="h-11 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white">Copy CSV</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["all", "active", "new", "at_risk", "inactive"] as const).map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${statusFilter === status ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      {metricsTab === "growth" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.14em] text-[#18191f]">Lead Acquisition</p>
            <div className="flex h-64 items-end gap-3 border-b border-dashed border-[#dfe2e8] px-4">
              {acquisitionBars.map((bar) => (
                <div key={bar.day} className="group relative flex flex-1 items-end justify-center" title={`${bar.day}: ${bar.value} leads`}>
                  <span className="absolute -top-7 hidden rounded-lg bg-[#111827] px-2 py-1 text-[10px] font-black text-white shadow-lg group-hover:block">
                    {bar.value}
                  </span>
                  <div className="w-full rounded-t bg-[#2f62ed]" style={{ height: `${bar.height}%` }}>
                    <span className="block -translate-y-5 text-center text-[10px] font-black text-[#18191f]">{bar.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 text-center text-xs font-bold text-[#626873]">
              {acquisitionBars.map((bar) => <span key={bar.day}>{bar.day}</span>)}
            </div>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#dedfe4] bg-white p-5 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#18191f]">Recent Pulse</p>
              <Zap className="mx-auto mt-8 text-[#d0d3da]" size={42} />
              <p className="mt-4 text-xs font-black uppercase text-[#626873]">{nodes.length ? "Activity recorded" : "Quiet for now"}</p>
            </div>
            <div className="rounded-2xl bg-[#2557df] p-6 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white">Network Health</p>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-[0.12em] text-white">
                  <span>Active Members</span>
                  <span>{activeMemberCount}/{nodes.length} · {activeMemberPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/35">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(Math.max(activeMemberPercent, 0), 100)}%` }} />
                </div>
              </div>
              <p className="mt-6 text-3xl font-black text-white">{atRiskCount}</p>
              <p className="text-[10px] font-black uppercase text-white">At risk members</p>
            </div>
          </div>
        </div>
      ) : metricsTab === "funnel" ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Reach", nodes.length + activeBuilders],
            ["Active", nodes.filter((node) => node.status === "active").length],
            ["At Risk", atRiskCount],
            ["Duplication Ready", nodes.filter((node) => node.duplicationScore >= targets.duplication).length]
          ].map(([label, value], index) => (
            <div key={label} className="rounded-2xl border border-[#dedfe4] bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">{label}</p>
              <p className="mt-3 text-3xl font-black text-[#18191f]">{value}</p>
              <div className="mt-4 h-2 rounded-full bg-[#edf0f4]"><div className="h-2 rounded-full bg-[#2f62ed]" style={{ width: `${Math.max(8, 100 - index * 22)}%` }} /></div>
            </div>
          ))}
        </div>
      ) : null}
      {metricsTab === "performers" ? (
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredNodes.length > 0 ? filteredNodes.map((node) => (
          <div key={node.id} className="rounded-2xl border border-[#dedfe4] bg-[#fbfcff] p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-black text-[#18191f]">{node.name}</p>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7d828c]">{node.rank} · level {node.level} · {node.leg}</p>
              </div>
              <select value={node.status} onChange={(event) => updateNodeStatus(node.id, event.target.value as TeamMemberNode["status"])} className="h-9 rounded-lg border border-[#dfe2e8] px-3 text-xs font-black uppercase outline-none">
                <option value="active">active</option>
                <option value="new">new</option>
                <option value="at_risk">at risk</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
            <div className="space-y-3">
              <ProgressBar label="Duplication" value={Math.min(Math.round((node.duplicationScore / targets.duplication) * 100), 100)} />
              <ProgressBar label="PV target" value={Math.min(Math.round((node.personalVolume / targets.pv) * 100), 100)} />
              <ProgressBar label="Team volume" value={Math.min(Math.round((node.teamVolume / targets.tv) * 100), 100)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
              {([
                ["personalVolume", "PV"],
                ["teamVolume", "TV"],
                ["groupVolume", "GV"],
                ["activeBuilders", "Builders"],
                ["customers", "Customers"],
                ["duplicationScore", "Score"]
              ] as const).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#626873]">{label}</span>
                  <input type="number" value={node[key]} onChange={(event) => updateNodeNumber(node.id, key, Number(event.target.value))} className="h-10 w-full rounded-lg border border-[#dfe2e8] px-2 text-sm font-bold outline-none" />
                </label>
              ))}
            </div>
          </div>
        )) : (
          <div className="lg:col-span-2 rounded-xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-6 text-sm font-semibold text-[#626873]">No team members match this filter.</div>
        )}
      </div>
      ) : null}
    </div>
  );
}

function TeamHubGrid({ teamNodes }: { teamNodes: TeamMemberNode[] }) {
  const storageKey = "duplios-team-hub-actions";
  type HubAction = { id: string; nodeId: string; title: string; note: string; status: "open" | "booked" | "done"; createdAt: string };
  const readStored = () => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return [] as HubAction[];
      const parsed = JSON.parse(stored) as HubAction[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const [actions, setActions] = useState<HubAction[]>(readStored);
  const [selectedNodeId, setSelectedNodeId] = useState(teamNodes[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_help" | "on_track">("all");
  const [hubTab, setHubTab] = useState<"leaderboard" | "pulse" | "chat" | "leads">("leaderboard");
  const selectedNode = teamNodes.find((node) => node.id === selectedNodeId) ?? teamNodes[0];
  const filteredNodes = teamNodes.filter((node) => {
    if (filter === "needs_help") return node.duplicationScore < 65 || node.status === "at_risk" || node.status === "inactive";
    if (filter === "on_track") return node.duplicationScore >= 65 && node.status !== "at_risk" && node.status !== "inactive";
    return true;
  });
  const persist = (next: HubAction[]) => {
    setActions(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep sponsor actions usable in-memory if storage is blocked.
    }
  };
  const makeAction = (node: TeamMemberNode, title: string, customNote = "") => {
    persist([
      {
        id: `hub-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nodeId: node.id,
        title,
        note: customNote || (node.duplicationScore < 65 ? "Coach on first outreach action and review blocked follow-ups." : "Ask for today's numbers and reinforce the action loop."),
        status: "open",
        createdAt: new Date().toISOString()
      },
      ...actions
    ]);
    setNotice(`${title} queued for ${node.name}.`);
    window.setTimeout(() => setNotice(""), 2200);
  };
  const updateAction = (id: string, status: HubAction["status"]) => {
    persist(actions.map((action) => action.id === id ? { ...action, status } : action));
  };
  const deleteAction = (id: string) => {
    persist(actions.filter((action) => action.id !== id));
  };
  const openActions = actions.filter((action) => action.status !== "done").length;
  const needsHelpCount = teamNodes.filter((node) => node.duplicationScore < 65 || node.status === "at_risk" || node.status === "inactive").length;
  const hubMembers = hubTab === "leaderboard"
    ? [...filteredNodes].sort((a, b) => b.duplicationScore - a.duplicationScore)
    : hubTab === "leads"
      ? [...filteredNodes].sort((a, b) => b.activeBuilders + b.customers - (a.activeBuilders + a.customers))
      : filteredNodes;

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-[#dedfe4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf2ff] text-[#2f62ed]"><Users size={25} /></span>
            <div>
              <p className="text-3xl font-black lowercase text-[#18191f]">{selectedNode?.name.replace(/\s+/g, "") ?? "team"}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">Team Hub · {teamNodes.length} members</p>
            </div>
          </div>
          <button
            onClick={() => selectedNode ? makeAction(selectedNode, "Invite to team pulse", note) : undefined}
            disabled={!selectedNode}
            className="h-10 rounded-xl border border-[#dfe2e8] px-5 text-xs font-black uppercase text-[#18191f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </div>
      {notice ? <div className="rounded-2xl border border-[#bdd0ff] bg-[#f2f5ff] px-4 py-3 text-sm font-black text-[#2f62ed]">{notice}</div> : null}
      <div className="inline-flex rounded-2xl border border-[#dfe2e8] bg-white p-1 shadow-sm">
        {(["leaderboard", "pulse", "chat", "leads"] as const).map((tab) => (
          <button key={tab} onClick={() => setHubTab(tab)} className={`h-10 rounded-xl px-5 text-[10px] font-black uppercase tracking-[0.12em] ${hubTab === tab ? "bg-[#2f62ed] text-white" : "text-[#394150]"}`}>
            {tab === "pulse" ? "Team Pulse" : tab}
          </button>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-2">
            <MetricBox label="Team Members" value={String(teamNodes.length)} compact />
            <MetricBox label="Need Help" value={String(needsHelpCount)} compact />
            <MetricBox label="Open Actions" value={String(openActions)} compact />
            <MetricBox label="Booked" value={String(actions.filter((action) => action.status === "booked").length)} compact />
          </div>
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <div className="flex flex-wrap gap-2">
              {(["all", "needs_help", "on_track"] as const).map((item) => (
                <button key={item} onClick={() => setFilter(item)} className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${filter === item ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>
                  {item.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          {hubTab === "chat" ? (
            <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
              <p className="font-black text-[#18191f]">Team Chat Composer</p>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 min-h-32 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none" placeholder="Write a recognition, instruction, or check-in message for the selected member." />
              <button
                onClick={() => selectedNode ? makeAction(selectedNode, "Send team chat message", note) : undefined}
                disabled={!selectedNode}
                className="mt-3 h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-[#9ca3af]"
              >
                Queue Chat Message
              </button>
            </div>
          ) : null}
          <div className="grid gap-3">
            {hubMembers.map((node) => {
              const needsCoaching = node.duplicationScore < 65 || node.status === "at_risk" || node.status === "inactive";
              return (
                <button key={node.id} onClick={() => setSelectedNodeId(node.id)} className={`rounded-2xl border p-4 text-left ${selectedNode?.id === node.id ? "border-[#2f62ed] bg-[#f0f4ff]" : "border-[#dedfe4] bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#18191f]">{node.name}</p>
                      <p className="mt-1 text-sm text-[#626873]">{node.rank} · {hubTab === "leads" ? `${node.activeBuilders} builders · ${node.customers} customers` : node.email}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${needsCoaching ? "bg-[#fff7ea] text-[#9a5a00]" : "bg-[#eafbf3] text-[#047857]"}`}>
                      {hubTab === "leaderboard" ? `${node.duplicationScore}%` : needsCoaching ? "Coach" : "On track"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          {selectedNode ? (
            <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black text-[#18191f]">{selectedNode.name}</p>
                  <p className="mt-1 text-sm text-[#626873]">{selectedNode.rank} · {selectedNode.status.replace("_", " ")}</p>
                </div>
                <a href={`mailto:${selectedNode.email}`} className="inline-flex h-9 items-center rounded-lg bg-[#2f62ed] px-3 text-xs font-black uppercase text-white">Email</a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricBox label="PV" value={String(selectedNode.personalVolume)} compact />
                <MetricBox label="TV" value={String(selectedNode.teamVolume)} compact />
                <MetricBox label="Builders" value={String(selectedNode.activeBuilders)} compact />
                <MetricBox label="Score" value={`${selectedNode.duplicationScore}%`} compact />
              </div>
              <div className="mt-4 rounded-xl bg-[#f7f9ff] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f62ed]">Sponsor focus</p>
                <p className="mt-2 text-sm leading-6 text-[#394150]">
                  {selectedNode.duplicationScore < 65 ? "Book a rescue call, review the last 5 conversations, and assign one outreach action." : "Review today's numbers, ask for one duplicated action, and identify who needs help in their downline."}
                </p>
              </div>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-[#dfe2e8] p-3 text-sm leading-6 outline-none" placeholder="Private sponsor note or next coaching instruction" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => makeAction(selectedNode, "Book sponsor check-in", note)} className="h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase text-white">Book Check-In</button>
                <button onClick={() => makeAction(selectedNode, "Assign 5-message power hour", note)} className="h-10 rounded-xl bg-[#111827] px-4 text-xs font-black uppercase text-white">Assign Power Hour</button>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(note || `Hi ${selectedNode.name}, quick check-in. What action is blocked today?`);
                    setNotice(`Sponsor note copied for ${selectedNode.name}.`);
                    window.setTimeout(() => setNotice(""), 2200);
                  }}
                  className="h-10 rounded-xl border border-[#dfe2e8] px-4 text-xs font-black uppercase text-[#394150]"
                >
                  Copy Note
                </button>
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
            <p className="font-black text-[#18191f]">Sponsor Action Board</p>
            <div className="mt-4 space-y-3">
              {actions.length > 0 ? actions.map((action) => {
                const node = teamNodes.find((item) => item.id === action.nodeId);
                return (
                  <div key={action.id} className="rounded-xl border border-[#dedfe4] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#18191f]">{action.title}</p>
                        <p className="mt-1 text-sm text-[#626873]">{node?.name ?? "Team member"} · {new Date(action.createdAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => deleteAction(action.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe2e8] text-[#626873]" aria-label={`Delete ${action.title}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#626873]">{action.note}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(["open", "booked", "done"] as const).map((status) => (
                        <button key={status} onClick={() => updateAction(action.id, status)} className={`h-8 rounded-lg px-3 text-[10px] font-black uppercase ${action.status === status ? "bg-[#2f62ed] text-white" : "bg-[#f3f4f6] text-[#394150]"}`}>
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-[#bdd0ff] bg-[#f7f9ff] p-5 text-sm font-semibold text-[#626873]">No sponsor actions yet. Select a member and book a check-in or assign a power hour.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptGrid({ scripts }: { scripts: ScriptAsset[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {scripts.map((script) => (
        <Card key={script.id} title={script.title} tag={script.channel}>
          <p>{script.body}</p>
        </Card>
      ))}
    </div>
  );
}

function AIScriptGenerator({ scripts }: { scripts: ScriptAsset[] }) {
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Professional");
  const [context, setContext] = useState("");
  const [generated, setGenerated] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const readAiRuntime = (): { provider: "gemini" | "deepseek" | "openai"; model: string } => {
    try {
      const provider = JSON.parse(window.localStorage.getItem("duplios-platform-ai-provider") ?? "\"gemini\"") as "gemini" | "deepseek" | "openai";
      const model = JSON.parse(window.localStorage.getItem("duplios-platform-ai-model") ?? "\"gemini-3-flash-preview\"") as string;
      return {
        provider: ["gemini", "deepseek", "openai"].includes(provider) ? provider : "gemini",
        model: model || "gemini-3-flash-preview"
      };
    } catch {
      return { provider: "gemini", model: "gemini-3-flash-preview" };
    }
  };

  const generate = async () => {
    const base = scripts[0]?.body ?? "Want me to send the short overview?";
    const aiRuntime = readAiRuntime();

    setIsGenerating(true);
    setNotice(null);

    try {
      const result = await generateAiScript({
        provider: aiRuntime.provider,
        model: aiRuntime.model,
        platform,
        tone,
        context,
        baseScript: base
      });

      setGenerated(result.script);
      setNotice(
        result.provider === "local"
          ? "Local fallback used. Ask the platform admin to configure the AI provider key."
          : "Generated with the platform AI configuration."
      );
    } catch (error) {
      setGenerated(`${tone} ${platform} opener:\n\n${context ? `Based on: ${context}\n\n` : ""}${base}\n\nPersonal note: keep it short, permission-based, and easy to reply to.`);
      setNotice(error instanceof Error ? error.message : "AI request failed. Local fallback used.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1fr]">
      <div className="rounded-2xl border border-[#dedfe4] bg-white p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f62ed] text-white"><Bot size={19} /></span>
          <p className="text-xl font-black text-[#18191f]">AI Script Generator</p>
        </div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">Platform</p>
        <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {["Instagram", "LinkedIn", "Video", "Email", "Call"].map((item) => (
            <button key={item} onClick={() => setPlatform(item)} className={`h-12 rounded-xl border text-xs font-black ${platform === item ? "border-[#2f62ed] bg-[#2f62ed] text-white" : "border-[#dedfe4] text-[#394150]"}`}>{item}</button>
          ))}
        </div>
        <p className="mb-5 rounded-xl border border-[#bdd0ff] bg-[#f2f5ff] p-3 text-xs font-bold leading-5 text-[#2f62ed]">
          AI provider and model are managed by the platform superadmin.
        </p>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#626873]">Tone</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {["Professional", "Casual", "Direct", "Curiosity"].map((item) => (
            <button key={item} onClick={() => setTone(item)} className={`h-9 rounded-full px-4 text-xs font-black ${tone === item ? "bg-[#2f62ed] text-white" : "border border-[#dedfe4] text-[#394150]"}`}>{item}</button>
          ))}
        </div>
        <textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="e.g., A former colleague interested in wellness..." className="min-h-28 w-full resize-none rounded-xl border border-[#dedfe4] p-4 text-sm outline-none" />
        <button onClick={() => void generate()} disabled={isGenerating} className="mt-4 h-12 w-full rounded-xl bg-[#9bb4ff] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
          {isGenerating ? "Generating..." : "Generate Script"}
        </button>
        {notice ? <p className="mt-3 rounded-xl bg-[#f2f5ff] p-3 text-xs font-bold text-[#2f62ed]">{notice}</p> : null}
      </div>
      <div className="rounded-2xl bg-[#2f62ed] p-6 text-white">
        <p className="text-xl font-black">Generated Script</p>
        <div className="mt-5 flex min-h-72 items-center justify-center rounded-xl border border-white/20 bg-white/5 p-5 text-center">
          {generated ? (
            <p className="whitespace-pre-line text-left text-sm leading-6 text-white">{generated}</p>
          ) : (
            <p className="max-w-sm text-sm text-blue-100">Your AI-generated script will appear here. Fill in the context to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaybookGrid({ plan, scripts }: { plan: FastStartPlan[]; scripts: ScriptAsset[] }) {
  const chapters = [
    {
      title: "Invite Fundamentals",
      status: "Required",
      body: "How to start conversations without pitching too early.",
      items: ["Warm opener", "Permission-based ask", "Clean next step"]
    },
    {
      title: "Follow-Up Rhythm",
      status: "Core",
      body: "How to stay top-of-mind without creating pressure.",
      items: ["Day 1 value", "Day 3 check-in", "Day 7 decision point"]
    },
    {
      title: "Sponsor Handoff",
      status: "Leadership",
      body: "When to bring the sponsor into a call and how to protect duplication.",
      items: ["Prep note", "15-minute overview", "Post-call action"]
    }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="grid gap-4">
        {chapters.map((chapter) => (
          <div key={chapter.title} className="rounded-2xl border border-[#dedfe4] bg-[#fbfcff] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f62ed]">{chapter.status}</p>
                <p className="mt-1 font-black text-[#18191f]">{chapter.title}</p>
              </div>
              <BookOpen className="text-[#2f62ed]" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#626873]">{chapter.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {chapter.items.map((item) => (
                <span key={item} className="rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-black text-[#2f62ed]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#dedfe4] bg-[#fbfcff] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f62ed]">Assigned path</p>
        <p className="mt-1 text-xl font-black text-[#18191f]">Fast-start lessons</p>
        <div className="mt-4 space-y-3">
          {plan.map((item) => (
            <div key={item.day} className="rounded-xl bg-white p-3">
              <p className="font-black text-[#18191f]">Day {item.day}: {item.title}</p>
              <p className="mt-1 text-sm text-[#626873]">{item.objective}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-[#fff7ea] p-4 text-sm leading-6 text-[#9a5a00]">
          Recommended script: {scripts[0]?.title ?? "Warm opener"}
        </div>
      </div>
    </div>
  );
}

function SalesSprintGrid({ leads, outreachTasks }: { leads: LeadRecord[]; outreachTasks: OutreachTask[] }) {
  const [target, setTarget] = useState(80000);
  const [weekendMode, setWeekendMode] = useState(false);
  const [score, setScore] = useState({
    dms: outreachTasks.filter((task) => task.action === "message").length,
    followUps: outreachTasks.filter((task) => task.action === "follow_up").length,
    presentations: leads.filter((lead) => lead.stage === "appointment").length,
    closed: leads.filter((lead) => lead.stage === "customer" || lead.stage === "builder").length
  });
  const [referrals, setReferrals] = useState<Array<{ id: string; name: string; source: string }>>([]);
  const [referralName, setReferralName] = useState("");
  const [showDepthCheck, setShowDepthCheck] = useState(true);
  const sprintEndsAt = new Date();
  sprintEndsAt.setDate(sprintEndsAt.getDate() + 25);
  sprintEndsAt.setHours(23, 59, 0, 0);
  const msRemaining = Math.max(sprintEndsAt.getTime() - Date.now(), 0);
  const daysRemaining = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((msRemaining / (60 * 60 * 1000)) % 24);
  const minutesRemaining = Math.floor((msRemaining / (60 * 1000)) % 60);
  const closedRevenue = score.closed * 3200;
  const progress = Math.min(Math.round((closedRevenue / Math.max(target, 1)) * 100), 100);
  const dailyVelocity = Math.ceil((target - closedRevenue) / Math.max(daysRemaining, 1));
  const dmReplyRate = Math.round((score.followUps / Math.max(score.dms, 1)) * 100);
  const replyPresentationRate = Math.round((score.presentations / Math.max(score.followUps, 1)) * 100);
  const closeRate = Math.round((score.closed / Math.max(score.presentations, 1)) * 100);
  const scorecards = [
    { key: "dms", label: "DMs Sent", target: weekendMode ? 60 : 100 },
    { key: "followUps", label: "Follow-ups", target: weekendMode ? 18 : 30 },
    { key: "presentations", label: "Presentations", target: weekendMode ? 3 : 5 },
    { key: "closed", label: "Sales Closed", target: weekendMode ? 2 : 3 }
  ] as const;
  const sprintDays = [
    ["01", "20 Power Contacts", "Use the value-first script to DM new prospects. This is your engine.", score.dms, scorecards[0].target],
    ["02", "Lead Nurturing", "Check your follow-up matrix. Never let a prospect wait more than 24h.", score.followUps, scorecards[1].target],
    ["03", "Presentations", "Move interested people into short overviews or sponsor-assisted calls.", score.presentations, scorecards[2].target],
    ["04", "Close & Referral", "Ask for the decision, then log one referral from every warm conversation.", score.closed + referrals.length, scorecards[3].target + 5]
  ] as const;
  const updateScore = (key: keyof typeof score, delta: number) => {
    setScore((current) => ({ ...current, [key]: Math.max(current[key] + delta, 0) }));
  };
  const addReferral = () => {
    if (!referralName.trim()) return;
    setReferrals((current) => [
      { id: `referral-${Date.now()}`, name: referralName.trim(), source: "Referral Engine" },
      ...current
    ]);
    setReferralName("");
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[#2f62ed] p-6 text-white shadow-[0_20px_60px_rgba(47,98,237,0.26)] lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_330px] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffcf5f]">
              Elite Sales Sprint Mode
            </span>
            <p className="mt-6 text-5xl font-black tracking-tight sm:text-6xl">
              {new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(target)}
            </p>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-blue-50">
              Stop overthinking. Send the first DMs, follow up within 24 hours, book short overviews,
              and track the actions that create revenue.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <label className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#2f62ed]">
                Target
                <input
                  type="number"
                  value={target}
                  onChange={(event) => setTarget(Math.max(Number(event.target.value), 1))}
                  className="h-8 w-28 rounded-lg border border-[#dfe2e8] px-2 text-[#18191f]"
                />
              </label>
              <button
                onClick={() => setWeekendMode((current) => !current)}
                className={`h-11 rounded-xl border px-4 text-sm font-black ${weekendMode ? "bg-[#ffcf5f] text-[#18191f]" : "border-white/25 bg-white/10 text-white"}`}
              >
                {weekendMode ? "Weekend Mode On" : "Weekend Mode"}
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-white/10 p-6 backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-xl bg-white/10 p-3 text-[#ffcf5f]"><Clock size={22} /></span>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Sprint countdown</p>
                <p className="text-2xl font-black">{daysRemaining}d {hoursRemaining}h {minutesRemaining}m</p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-black text-blue-50">
                <span>Sprint progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/25">
                <div className="h-full rounded-full bg-[#ffcf5f]" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="mt-5 border-t border-white/15 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Daily required velocity</p>
              <p className="mt-1 text-3xl font-black text-[#ffcf5f]">
                {new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(Math.max(dailyVelocity, 0))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-[#dfe2e8] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-[#18191f]">Success Roadmap</p>
                <p className="text-sm text-[#626873]">Follow the steps that make the sprint target possible.</p>
              </div>
              <span className="rounded-xl bg-[#edf2ff] p-3 text-[#2f62ed]"><Rocket size={20} /></span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {sprintDays.map(([day, title, body, value, goal]) => (
                <div key={day} className="rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#626873]">{day}</p>
                    <span className="rounded-full bg-[#edf2ff] px-2 py-1 text-[10px] font-black text-[#2f62ed]">
                      {Math.max(goal - value, 0)} left
                    </span>
                  </div>
                  <p className="font-black text-[#18191f]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#626873]">{body}</p>
                  <ProgressBar label="Action progress" value={Math.round((value / Math.max(goal, 1)) * 100)} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-[#dfe2e8] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-black text-[#18191f]">Daily Scoreboard</p>
                <p className="text-sm text-[#626873]">Track today’s output. These counters drive the sprint progress.</p>
              </div>
              <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#2f62ed]">
                Intensity: {weekendMode ? "Weekend" : "Std"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {scorecards.map((item) => (
                <div key={item.key} className="rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-[#18191f]">{item.label}</p>
                    <div className="flex gap-2">
                      <button onClick={() => updateScore(item.key, -1)} className="h-8 w-8 rounded-lg border border-[#dfe2e8] font-black">-</button>
                      <button onClick={() => updateScore(item.key, 1)} className="h-8 w-8 rounded-lg bg-[#2f62ed] font-black text-white">+</button>
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-black text-[#18191f]">{score[item.key]} <span className="text-sm text-[#626873]">/ {item.target}</span></p>
                  <ProgressBar label="Daily target" value={Math.round((score[item.key] / Math.max(item.target, 1)) * 100)} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-[#dfe2e8] bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xl font-black text-[#18191f]">Action Panel</p>
                <p className="text-sm text-[#626873]">High-priority people and next steps from the current pipeline.</p>
              </div>
              <button
                onClick={() => void navigator.clipboard.writeText("I thought of you because this is helping people build a cleaner follow-up rhythm. Want the short version?")}
                className="h-10 rounded-xl bg-[#2f62ed] px-4 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                Copy DM Script
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(leads.length > 0 ? leads.slice(0, 4) : [{ id: "empty", name: "No leads yet", nextAction: "Capture or add leads in Growth CRM", source: "manual", temperature: "warm" } as LeadRecord]).map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-[#dfe2e8] bg-[#fbfcff] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2f62ed]">Who to DM</p>
                  <p className="mt-1 font-black text-[#18191f]">{lead.name}</p>
                  <p className="mt-2 text-sm text-[#626873]">{lead.nextAction}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[26px] bg-[#2f62ed] p-6 text-white">
            <span className="mb-5 inline-flex rounded-xl bg-white/10 p-3 text-[#ffcf5f]"><Users size={22} /></span>
            <p className="text-xl font-black">Referral Engine</p>
            <p className="mt-3 text-sm leading-6 text-blue-50">Who do you know that values clean water, wellness, or building a stronger team?</p>
            <div className="mt-5 flex gap-2">
              <input value={referralName} onChange={(event) => setReferralName(event.target.value)} placeholder="Referral name" className="h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-blue-100" />
              <button onClick={addReferral} className="h-11 rounded-xl bg-white px-4 text-sm font-black text-[#2f62ed]">Log</button>
            </div>
            <p className="mt-3 text-sm text-blue-50">{referrals.length} referrals logged this sprint.</p>
          </section>

          <section className="rounded-[26px] border border-[#dfe2e8] bg-white p-5 shadow-sm">
            <p className="text-xl font-black text-[#18191f]">Conversion</p>
            <div className="mt-4 space-y-3">
              <StatRow label="DM -> Reply" value={dmReplyRate} />
              <StatRow label="Reply -> Pres" value={replyPresentationRate} />
              <StatRow label="Pres -> Close" value={closeRate} />
            </div>
          </section>

          <section className="rounded-[26px] border border-[#dfe2e8] bg-white p-5 shadow-sm">
            <p className="text-xl font-black text-[#18191f]">AI Objection Handler</p>
            <p className="mt-2 text-sm leading-6 text-[#626873]">Use AI Scripts for a short, compliant reply when a prospect stalls.</p>
            <button
              onClick={() => void navigator.clipboard.writeText("Context: prospect has not replied. Draft a warm, permission-based follow-up with no pressure and no income or health claims.")}
              className="mt-4 h-10 w-full rounded-xl bg-[#2f62ed] text-xs font-black uppercase tracking-[0.12em] text-white"
            >
              Copy AI Prompt
            </button>
          </section>
        </aside>
      </div>

      {showDepthCheck ? (
        <div className="fixed bottom-20 right-4 z-20 max-w-sm rounded-[22px] border border-[#bdd0ff] bg-white p-5 shadow-[0_20px_60px_rgba(47,98,237,0.24)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f62ed]">Depth Check</p>
            <button onClick={() => setShowDepthCheck(false)} className="text-[#626873]">x</button>
          </div>
          <p className="text-sm font-bold leading-6 text-[#18191f]">
            Building deep is the secret to stable income. Check which personal downline might need a hand today.
          </p>
          <button onClick={() => { window.location.href = `${window.location.pathname}?view=duplication`; }} className="mt-4 h-10 w-full rounded-xl bg-[#2f62ed] text-xs font-black uppercase tracking-[0.12em] text-white">
            Open Network
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TaskBoard({ plan, leads }: { plan: FastStartPlan[]; leads: LeadRecord[] }) {
  const tasks = [
    ...plan.flatMap((item) => item.actions.map((action) => ({ title: action, group: `Day ${item.day}`, done: item.day === 1 }))),
    ...leads.slice(0, 3).map((lead) => ({ title: lead.nextAction, group: lead.name, done: false }))
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {["Today", "Follow-up", "Done"].map((column) => {
        const columnTasks = tasks
          .filter((task) => (column === "Done" ? task.done : column === "Follow-up" ? task.group !== "Day 1" && !task.done : !task.done))
          .slice(0, 5);

        return (
          <div key={column} className="rounded-2xl border border-[#d8dee9] bg-white p-5 shadow-sm">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#1d4ed8]">{column}</p>
            <div className="space-y-3">
              {columnTasks.length > 0 ? (
                columnTasks.map((task) => (
                <label key={`${column}-${task.group}-${task.title}`} className="flex gap-3 rounded-xl bg-white p-3 text-sm text-[#394150]">
                  <input type="checkbox" defaultChecked={task.done} className="mt-1 h-4 w-4 accent-[#2f62ed]" />
                  <span>
                    <span className="block font-black text-[#18191f]">{task.title}</span>
                    <span className="text-xs text-[#7d828c]">{task.group}</span>
                  </span>
                </label>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#cfd6e3] bg-[#f8fafc] p-4 text-sm font-semibold text-[#4b5563]">
                  No {column.toLowerCase()} actions yet.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dedfe4] bg-[#fbfcff] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f62ed]">{tag}</p>
      <p className="mt-2 font-black text-[#18191f]">{title}</p>
      <div className="mt-3 text-sm leading-6 text-[#626873]">{children}</div>
    </div>
  );
}

function MetricBox({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[#dedfe4] bg-white ${compact ? "p-3" : "p-5"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7d828c]">{label}</p>
      <p className={`${compact ? "text-xl" : "text-3xl"} mt-1 font-black text-[#18191f]`}>{value}</p>
    </div>
  );
}

function CrmInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#626873]">
        {label}{required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[#dfe2e8] px-3 text-sm outline-none focus:border-[#2f62ed]"
        required={required}
      />
    </label>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-[#626873]">{label}</span>
      <span className="text-lg font-black text-[#18191f]">{value}</span>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-black text-[#626873]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#eceef2]">
        <div className="h-full rounded-full bg-[#2f62ed]" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
    </div>
  );
}
