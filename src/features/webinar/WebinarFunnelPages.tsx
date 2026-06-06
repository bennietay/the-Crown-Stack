import { ArrowRight, CalendarDays, CheckCircle2, Clock, LockKeyhole, MessageCircle, PlayCircle, ShieldCheck, UserRound } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { capturePublicLead } from "../../lib/api";
import { trackDupliosEvent } from "../../lib/tracking";

type WebinarFunnelConfig = {
  id: string;
  title: string;
  type?: string;
  scheduledAt: string;
  durationMinutes?: number;
  host: string;
  audience?: string;
  goal?: string;
  description: string;
  replayUrl?: string;
  brandColor?: string;
  template?: "classic" | "dark" | "modal" | "reverse";
  curriculum?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  hostAvatarUrl?: string;
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
  bookingUrl?: string;
};

const defaultWebinar: WebinarFunnelConfig = {
  id: "wellness-discovery",
  title: "Wellness & Lifestyle Product Discovery",
  type: "Webinar",
  scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  durationMinutes: 45,
  host: "Duplios Webinar Team",
  audience: "Product-curious prospects",
  goal: "Learn whether the product, business, or customer path is relevant.",
  description: "A short, relationship-first session designed to help you understand the opportunity and choose the right next step without pressure.",
  replayUrl: "",
  brandColor: "#2f62ed",
  template: "classic",
  landingHeadline: "Experience High-Performance Healthy Living",
  landingSubheadline: "A guided tour through premium wellness, lifestyle routines, and personal care solutions.",
  funnelMode: "Product Discovery",
  complianceDisclaimer: "This session is educational. Results vary based on individual effort and no income, rank, health, or business outcome is guaranteed.",
  replaySummary: "A focused replay recap with key takeaways and one clear follow-up action.",
  replayTakeaways: ["Beginner path", "Product ecosystem", "Support system", "Fit check"],
  successMessage: "Follow the steps below to confirm your access details and prepare for the session.",
  curriculum: [
    "How to decide whether the product or business path fits your current goals",
    "What to look for before making a decision",
    "Simple next steps after the session"
  ],
  faqs: [
    { question: "Is this a sales presentation?", answer: "It is an educational overview with a clear option to ask questions or book a follow-up." },
    { question: "Do I need to buy anything to attend?", answer: "No. The session is for learning and deciding whether a next conversation is useful." },
    { question: "Can I watch the replay?", answer: "Yes, if the host enables the replay page after the live session." }
  ],
  bookingUrl: ""
};

function readWebinar(id: string | null): WebinarFunnelConfig {
  try {
    const stored = window.localStorage.getItem("duplios-webinar-funnels");
    const parsed = stored ? (JSON.parse(stored) as WebinarFunnelConfig[]) : [];
    return parsed.find((webinar) => webinar.id === id) ?? parsed[0] ?? defaultWebinar;
  } catch {
    return defaultWebinar;
  }
}

export function WebinarRegistrationPage({ webinarId, onRegistered }: { webinarId: string | null; onRegistered: (id: string, email: string) => void }) {
  const webinar = useMemo(() => readWebinar(webinarId), [webinarId]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "Product", consent: true });
  const [status, setStatus] = useState("");
  const accent = webinar.brandColor || "#2f62ed";
  const styles = getTemplateStyles(webinar);
  const twoStep = webinar.template === "modal";
  const [modalOpen, setModalOpen] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("Add your name and email to reserve your webinar seat.");
      return;
    }

    setStatus("Reserving your seat...");
    try {
      await capturePublicLead({
        tenantSlug: "duplios",
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        source: "event",
        campaign: webinar.title,
        message: `Webinar registration. Interest: ${form.interest}. Webinar ID: ${webinar.id}`,
        consent: form.consent,
        nextAction: "Send webinar reminder and mark as Webinar Registered"
      });
      saveWebinarLead(webinar, form, "registered");
      trackDupliosEvent("event_created", { type: "webinar_registration", webinarId: webinar.id });
      onRegistered(webinar.id, form.email.trim());
    } catch (error) {
      saveWebinarLead(webinar, form, "registered");
      setStatus(error instanceof Error ? `${error.message} Registration saved in this workspace.` : "Registration saved in this workspace.");
      window.setTimeout(() => onRegistered(webinar.id, form.email.trim()), 500);
    }
  };

  return (
    <FunnelShell webinar={webinar}>
      <section className={styles.section}>
        <header className="sticky top-0 z-20 border-b border-[#eef1f5]/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {webinar.logoUrl ? <img src={webinar.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: accent }}>D</div>}
              <p className="text-sm font-black uppercase tracking-tight text-[#111827]">Duplios Masterclass</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-[#f5f7fa] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#64748b] sm:inline-flex">English</span>
              <button onClick={() => (twoStep ? setModalOpen(true) : document.getElementById("webinar-registration-form")?.scrollIntoView({ behavior: "smooth" }))} className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white" style={{ background: accent }}>
                Reserve Seat
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1fr_420px] lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              {["Fact-first preview", "Eco-share friendly", "No pressure required", "WhatsApp reminder included"].map((item) => (
                <span key={item} className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#64748b]">{item}</span>
              ))}
            </div>
            <h1 className={`mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl ${styles.heading}`}>
              {webinar.landingHeadline || webinar.title}
            </h1>
            <p className={`mt-6 max-w-xl text-base leading-8 ${styles.body}`}>{webinar.landingSubheadline || webinar.description}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button onClick={() => (twoStep ? setModalOpen(true) : document.getElementById("webinar-registration-form")?.scrollIntoView({ behavior: "smooth" }))} className="h-12 rounded-xl px-6 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg" style={{ background: accent }}>
                Confirm My Free Seat
              </button>
              <p className="text-xs font-semibold text-[#94a3b8]">{Math.max(1, 47)} joined today · access details after registration</p>
            </div>
          </div>
          <div id="webinar-registration-form" className="flex items-center">
            {twoStep ? (
              <div className="w-full rounded-[34px] border border-[#e5e7eb] bg-white p-7 shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
                <p className="text-2xl font-black text-[#111827]">Reserve your free preview seat</p>
                <p className="mt-3 text-sm leading-7 text-[#64748b]">Click below to open the focused two-step registration form.</p>
                <button onClick={() => setModalOpen(true)} className="mt-6 h-12 w-full rounded-xl text-sm font-black text-white" style={{ background: accent }}>Open Registration</button>
              </div>
            ) : (
              <RegistrationForm webinar={webinar} form={form} setForm={setForm} status={status} onSubmit={submit} />
            )}
          </div>
        </div>

        <section className="bg-[#0b1220] px-4 py-16 text-white">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Built for people who want to understand before deciding.</h2>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#94a3b8]">High-trust verification</p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {["Educational preview", "No-pressure explanation", "Beginner-friendly"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-6">
                  <ShieldCheck className="text-white/70" size={22} />
                  <p className="mt-5 font-black">{item}</p>
                  <p className="mt-2 text-sm leading-6 text-[#94a3b8]">A transparent look at the system, fit, support, and next steps.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#111827] sm:text-4xl">What You’ll Understand in This Free Preview</h2>
              <p className="mt-3 text-sm italic text-[#64748b]">Transparency is our core value. Here is what we cover in detail.</p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              {(webinar.curriculum ?? defaultWebinar.curriculum ?? []).map((point, index) => (
                <div key={point} className={`rounded-[28px] border border-[#e5e7eb] bg-white p-7 shadow-sm ${index === 0 ? "min-h-64 lg:row-span-2" : ""}`}>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white" style={{ background: index % 2 ? "#111827" : accent }}>{index + 1}</span>
                  <p className="mt-5 text-2xl font-black text-[#111827]">{point}</p>
                  <p className="mt-4 text-sm leading-7 text-[#64748b]">{index === 0 ? webinar.description : "Understand this part clearly before deciding on your next step."}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f5f7fa] px-4 py-16">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>Personalize your experience</p>
            <h2 className="mt-2 text-3xl font-black text-[#111827]">Choose Your Focus Area</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {["Product / customer path", "Business / team path"].map((item, index) => (
                <button key={item} onClick={() => setForm((current) => ({ ...current, interest: index === 0 ? "Product" : "Business" }))} className="rounded-[28px] bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                  <p className="text-lg font-black text-[#111827]">{item}</p>
                  <div className="mt-8 h-4 rounded-full" style={{ background: index === 0 ? "#111827" : accent }} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-black text-[#111827]">Common Questions</h2>
            <div className="mt-8 space-y-3">
              {(webinar.faqs ?? defaultWebinar.faqs ?? []).map((faq) => (
                <details key={faq.question} className="rounded-2xl bg-[#f8fafc] p-5">
                  <summary className="cursor-pointer text-sm font-black text-[#111827]">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-[#64748b]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-[#0b1220] px-4 py-12 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            {webinar.complianceDisclaimer || defaultWebinar.complianceDisclaimer}
          </div>
        </footer>
      </section>
      {twoStep && modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-md">
            <button onClick={() => setModalOpen(false)} className="mb-3 ml-auto block rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-[#111827]">Close</button>
            <RegistrationForm webinar={webinar} form={form} setForm={setForm} status={status} onSubmit={submit} />
          </div>
        </div>
      ) : null}
    </FunnelShell>
  );
}

export function WebinarThankYouPage({ webinarId, onReplay }: { webinarId: string | null; onReplay: (id: string) => void }) {
  const webinar = useMemo(() => readWebinar(webinarId), [webinarId]);
  const calendarUrl = makeCalendarUrl(webinar);
  const accent = webinar.brandColor || "#2f62ed";
  const whatsappUrl = makeWhatsAppUrl(webinar, `Hi, I registered for ${webinar.title}. Please confirm my access details.`);
  return (
    <FunnelShell webinar={webinar}>
      <section className="min-h-screen bg-[#f6f8fb] text-[#111827]">
        <div className="bg-black px-4 py-4 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white">
          <span className="text-[#22c55e]">●</span> Registration successful & verified <span className="mx-5 text-white/30">|</span> <span className="italic text-white/60">Please do not close this window</span>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-black leading-tight tracking-tight sm:text-7xl">You’re In — Your Free Preview Seat Is Confirmed</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#64748b]">
              {webinar.successMessage || "Follow the 3 steps below to ensure you have the correct access details and materials for the session."}
            </p>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <div className="overflow-hidden rounded-[34px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between p-6">
                  <p className="text-sm font-black uppercase tracking-[0.14em]"><span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-white">1</span> Step 1: Watch your welcome message</p>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-[#94a3b8]">2:14 minutes</span>
                </div>
                <button onClick={() => onReplay(webinar.id)} className="flex aspect-video w-full flex-col items-center justify-center bg-[#0b1220] text-white">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-white">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: accent }}><PlayCircle size={24} /></span>
                  </span>
                  <span className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/60">Quick onboarding intro</span>
                  <span className="mt-8 text-lg font-black italic">Learn how to make the most of the free preview session.</span>
                </button>
              </div>

              <div className="rounded-[34px] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-black uppercase tracking-[0.14em]"><span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-white">2</span> Step 2: Add to your calendar</p>
                <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_260px] sm:items-center">
                  <div className="text-sm font-bold leading-7 text-[#64748b]">
                    <p>{new Date(webinar.scheduledAt).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>
                    <p>{new Date(webinar.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="mt-2 italic">Adding this to your calendar helps protect the session window.</p>
                  </div>
                  <a href={calendarUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#111827] text-xs font-black uppercase tracking-[0.14em] text-white">Add to Google Calendar</a>
                </div>
              </div>

              <div className="rounded-[34px] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-black uppercase tracking-[0.14em]"><span className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-white">3</span> Step 3: Send confirmation message</p>
                <div className="mt-8 grid gap-5 sm:grid-cols-[1fr_260px] sm:items-center">
                  <p className="text-sm font-bold italic leading-7 text-[#64748b]">Message your host to verify your number and receive any access materials before the session.</p>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#22c55e] text-xs font-black uppercase tracking-[0.14em] text-white">Message me on WhatsApp</a>
                </div>
              </div>
            </div>

            <aside className="h-fit rounded-[34px] border border-[#bbf7d0] bg-white p-9 shadow-[0_24px_70px_rgba(34,197,94,0.12)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#22c55e]">Optional fast-track</p>
              <h2 className="mt-8 text-4xl font-black leading-tight">Book Your Business Fit Call</h2>
              <p className="mt-6 text-sm font-semibold italic leading-8 text-[#64748b]">If this aligns with your goals, book a short suitability conversation with your host.</p>
              {webinar.bookingUrl ? (
                <a href={webinar.bookingUrl} target="_blank" rel="noreferrer" className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#111827] text-xs font-black uppercase tracking-[0.14em] text-white">Book My Business Fit Call</a>
              ) : (
                <button onClick={() => onReplay(webinar.id)} className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[#111827] text-xs font-black uppercase tracking-[0.14em] text-white">View Replay Access</button>
              )}
              <div className="mt-8 border-t border-[#eef1f5] pt-5 text-xs font-semibold leading-6 text-[#94a3b8]">
                Access: direct & private. No income, rank, customer, or business success is guaranteed.
              </div>
            </aside>
          </div>
        </div>
        <footer className="px-4 py-14 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#94a3b8]">{webinar.complianceDisclaimer || defaultWebinar.complianceDisclaimer}</footer>
      </section>
    </FunnelShell>
  );
}

export function WebinarReplayPage({ webinarId }: { webinarId: string | null }) {
  const webinar = useMemo(() => readWebinar(webinarId), [webinarId]);
  const [initializing, setInitializing] = useState(true);
  const [watched, setWatched] = useState(false);
  const [ctaStatus, setCtaStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const accent = webinar.brandColor || "#2f62ed";

  useEffect(() => {
    const timer = window.setTimeout(() => setInitializing(false), 900);
    return () => window.clearTimeout(timer);
  }, [webinar.id]);

  useEffect(() => {
    if (!watched || webinar.replayUrl) return;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 8, 100);
        if (next === 100) window.clearInterval(timer);
        return next;
      });
    }, 700);
    return () => window.clearInterval(timer);
  }, [watched, webinar.replayUrl]);

  const markWatched = () => {
    setWatched(true);
    setProgress((current) => Math.max(current, 12));
    saveReplayActivity(webinar, "replay_watched");
  };
  const requestFollowUp = () => {
    const message = `Hi, I watched ${webinar.title} and would like to book a short follow-up conversation.`;
    void navigator.clipboard.writeText(message);
    saveReplayActivity(webinar, "follow_up_requested");
    setCtaStatus("Follow-up request copied. Send it to your host or paste it into WhatsApp.");
  };

  return (
    <FunnelShell webinar={webinar}>
      <section className="min-h-screen bg-[#030712] text-white">
        {initializing ? (
          <div className="flex min-h-screen items-center justify-center bg-black">
            <div className="text-center">
              <LockKeyhole className="mx-auto text-[#93a4bd]" size={26} />
              <p className="mt-4 text-sm font-black italic tracking-tight text-[#93a4bd]">Initializing secure replay hub...</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-5 lg:grid-cols-[1fr_380px] lg:px-8">
            <div className="flex flex-col justify-center">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-[#94a3b8]">
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2">Secure replay</span>
                <span>{templateLabel(webinar)}</span>
                <span>{webinar.durationMinutes ?? 45} min</span>
              </div>
              <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{webinar.title}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#cbd5e1]">{webinar.replaySummary || webinar.description}</p>

              <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-video">
                  {webinar.replayUrl ? (
                    <iframe title={webinar.title} src={webinar.replayUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" onLoad={markWatched} />
                  ) : (
                    <button onClick={markWatched} className="group flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(47,98,237,0.35),transparent_32%),linear-gradient(145deg,#020617,#000)] text-white">
                      <span className="flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-white/10 transition group-hover:scale-105">
                        <PlayCircle size={56} />
                      </span>
                      <span className="mt-5 text-sm font-black uppercase tracking-[0.18em]">Start Hosted Replay</span>
                      <span className="mt-3 max-w-xl px-6 text-center text-sm leading-6 text-white/65">
                        Watch the session summary, key curriculum points, and next-step guidance in one focused replay experience.
                      </span>
                    </button>
                  )}
                </div>
                <div className="border-t border-white/10 bg-[#050b16] p-4">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-[#94a3b8]">
                    <span>{watched ? "Replay activity tracked" : "Ready to watch"}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: accent }} />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(webinar.replayTakeaways ?? webinar.curriculum ?? defaultWebinar.curriculum ?? []).slice(0, 4).map((point, index) => (
                  <div key={point} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: accent }}>{String(index + 1).padStart(2, "0")}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#e5e7eb]">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="flex flex-col justify-center gap-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.08] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>Next conversion step</p>
                <h2 className="mt-3 text-2xl font-black">Book the follow-up while the context is fresh.</h2>
                <p className="mt-3 text-sm leading-7 text-[#cbd5e1]">
                  The replay tracks interest, keeps the call-to-action visible, and gives the prospect one clear next step.
                </p>
                {webinar.bookingUrl ? (
                  <a href={webinar.bookingUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white" style={{ background: accent }}>
                    Book Follow-Up Call <ArrowRight size={17} />
                  </a>
                ) : (
                  <button onClick={requestFollowUp} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white" style={{ background: accent }}>
                    Copy Follow-Up Request <MessageCircle size={17} />
                  </button>
                )}
                {ctaStatus ? <p className="mt-3 rounded-xl bg-white/10 p-3 text-xs font-semibold leading-5 text-[#dbeafe]">{ctaStatus}</p> : null}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.06] p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#94a3b8]">Replay FAQ</p>
                <div className="mt-4 space-y-3">
                  {(webinar.faqs ?? defaultWebinar.faqs ?? []).map((faq) => (
                    <details key={faq.question} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <summary className="cursor-pointer text-sm font-black text-white">{faq.question}</summary>
                      <p className="mt-2 text-sm leading-6 text-[#cbd5e1]">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-xs leading-5 text-[#94a3b8]">
                {webinar.complianceDisclaimer || "Duplios tracks replay activity for follow-up organization. It does not guarantee sales, income, rank advancement, customer acquisition, or business success."}
              </div>
            </aside>
          </div>
        )}
      </section>
    </FunnelShell>
  );
}

function saveWebinarLead(
  webinar: WebinarFunnelConfig,
  form: { name: string; email: string; phone: string; interest: string; consent: boolean },
  status: "registered"
) {
  const key = "duplios-webinar-registrations";
  const record = {
    id: `webinar-lead-${Date.now()}`,
    webinarId: webinar.id,
    webinarTitle: webinar.title,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    interest: form.interest,
    consent: form.consent,
    status,
    leadScore: 72,
    createdAt: new Date().toISOString(),
    nextAction: "Send webinar reminder and mark as Webinar Registered"
  };
  try {
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    window.localStorage.setItem(key, JSON.stringify([record, ...existing]));
  } catch {
    window.localStorage.setItem(key, JSON.stringify([record]));
  }
}

function saveReplayActivity(webinar: WebinarFunnelConfig, action: "replay_watched" | "follow_up_requested") {
  const key = "duplios-webinar-activity";
  const record = {
    id: `webinar-activity-${Date.now()}`,
    webinarId: webinar.id,
    webinarTitle: webinar.title,
    action,
    createdAt: new Date().toISOString()
  };
  try {
    const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    window.localStorage.setItem(key, JSON.stringify([record, ...existing]));
  } catch {
    window.localStorage.setItem(key, JSON.stringify([record]));
  }
}

function FunnelShell({ webinar, children }: { webinar: WebinarFunnelConfig; children: React.ReactNode }) {
  const dark = webinar.template === "dark";
  return (
    <main className={dark ? "min-h-screen bg-[#0b1220]" : "min-h-screen bg-[#f8fafc]"}>
      {children}
    </main>
  );
}

function RegistrationForm({
  webinar,
  form,
  setForm,
  status,
  onSubmit
}: {
  webinar: WebinarFunnelConfig;
  form: { name: string; email: string; phone: string; interest: string; consent: boolean };
  setForm: Dispatch<SetStateAction<{ name: string; email: string; phone: string; interest: string; consent: boolean }>>;
  status: string;
  onSubmit: () => void;
}) {
  const accent = webinar.brandColor || "#2f62ed";
  return (
    <div className="w-full rounded-[28px] border border-[#e5e7eb] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
      <p className="text-2xl font-black text-[#111827]">Reserve your seat</p>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">Your details create a webinar profile so reminders and follow-up are personal.</p>
      <div className="mt-5 space-y-3">
        <FunnelInput label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <FunnelInput label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
        <FunnelInput label="WhatsApp / phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <label>
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#6b7280]">Interest</span>
          <select value={form.interest} onChange={(event) => setForm((current) => ({ ...current, interest: event.target.value }))} className="h-12 w-full rounded-xl border border-[#d1d5db] px-4 text-sm outline-none">
            <option>Product</option>
            <option>Business</option>
            <option>Customer</option>
            <option>Team</option>
            <option>Not sure yet</option>
          </select>
        </label>
        <label className="flex gap-3 rounded-xl bg-[#f9fafb] p-3 text-xs leading-5 text-[#4b5563]">
          <input type="checkbox" checked={form.consent} onChange={(event) => setForm((current) => ({ ...current, consent: event.target.checked }))} className="mt-1 accent-[#2f62ed]" />
          I agree to receive webinar reminders and follow-up about this session.
        </label>
      </div>
      <button onClick={onSubmit} className="mt-5 h-12 w-full rounded-xl text-sm font-black text-white" style={{ background: accent }}>
        Submit Registration
      </button>
      {status ? <p className="mt-3 text-xs font-semibold text-[#6b7280]">{status}</p> : null}
      <p className="mt-4 flex gap-2 text-xs leading-5 text-[#6b7280]"><ShieldCheck size={16} /> Secure registration. No income, health, or business result is guaranteed.</p>
    </div>
  );
}

function FunnelStat({ icon, label, dark = false }: { icon: React.ReactNode; label: string; dark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-black ${dark ? "border-white/10 bg-white/10 text-white" : "border-[#e5e7eb] bg-white text-[#111827]"}`}>
      <span className="text-[#2f62ed]">{icon}</span>
      {label}
    </div>
  );
}

function getTemplateStyles(webinar: WebinarFunnelConfig) {
  if (webinar.template === "dark") {
    return {
      dark: true,
      section: "bg-[#0b1220]",
      heading: "text-white",
      body: "text-[#cbd5e1]",
      panel: "border-white/10 bg-white/[0.06] text-white"
    };
  }

  if (webinar.template === "modal") {
    return {
      dark: false,
      section: "bg-[#eef2ff]",
      heading: "text-[#111827]",
      body: "text-[#4b5563]",
      panel: "border-[#c7d2fe] bg-white text-[#111827]"
    };
  }

  return {
    dark: false,
    section: "bg-[#f8fafc]",
    heading: "text-[#111827]",
    body: "text-[#4b5563]",
    panel: "border-[#e5e7eb] bg-white text-[#111827]"
  };
}

function templateLabel(webinar: WebinarFunnelConfig) {
  if (webinar.template === "dark") return "Dark Mode Minimalist";
  if (webinar.template === "modal") return "Two-Step Modal";
  if (webinar.template === "reverse") return "Reverse Squeeze";
  return "Classic Long Form";
}

function FunnelInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#6b7280]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-[#d1d5db] px-4 text-sm outline-none focus:border-[#2f62ed]" />
    </label>
  );
}

function makeCalendarUrl(webinar: WebinarFunnelConfig) {
  const start = new Date(webinar.scheduledAt);
  const end = new Date(start.getTime() + (webinar.durationMinutes ?? 45) * 60 * 1000);
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", webinar.title);
  url.searchParams.set("dates", `${format(start)}/${format(end)}`);
  url.searchParams.set("details", webinar.description);
  return url.toString();
}

function makeWhatsAppUrl(webinar: WebinarFunnelConfig, message: string) {
  const phone = (webinar.whatsappNumber ?? "").replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

function makeIcsDataUrl(webinar: WebinarFunnelConfig) {
  const start = new Date(webinar.scheduledAt);
  const end = new Date(start.getTime() + (webinar.durationMinutes ?? 45) * 60 * 1000);
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${webinar.id}@duplios`,
    `DTSTAMP:${format(new Date())}`,
    `DTSTART:${format(start)}`,
    `DTEND:${format(end)}`,
    `SUMMARY:${webinar.title}`,
    `DESCRIPTION:${webinar.description}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
