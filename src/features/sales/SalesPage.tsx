import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  GitBranch,
  HeartHandshake,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getPublicPricing } from "../../lib/api";
import { detectCountryCode, formatLocalizedPrice, tierPriceKeys } from "../../lib/locationPricing";
import type { SubscriptionTier } from "../../types/subscription";
import type { LocationPricingRule, SalesPageContent } from "../../types/tenant";

interface SalesPageProps {
  content: SalesPageContent;
  locationPricing?: LocationPricingRule[];
  onStart: () => void;
  onCheckout: (tier: SubscriptionTier, email?: string, countryCode?: string) => void;
}

export function SalesPage({ content, locationPricing = [], onStart, onCheckout }: SalesPageProps) {
  const featureIcons = [Zap, MessageSquareText, Users, FileText, BarChart3, ShieldCheck];
  const [buyerEmail, setBuyerEmail] = useState("");
  const [stripePrices, setStripePrices] = useState<Awaited<ReturnType<typeof getPublicPricing>>["prices"]>({});
  const [detectedCountry, setDetectedCountry] = useState("US");
  const [remoteLocationRule, setRemoteLocationRule] = useState<LocationPricingRule | null>(null);

  useEffect(() => {
    setDetectedCountry(detectCountryCode());
  }, []);

  useEffect(() => {
    getPublicPricing(detectedCountry)
      .then((result) => {
        if (result.configured) {
          setStripePrices(result.prices);
        }
        if (result.locationRule) {
          setRemoteLocationRule({
            id: `${result.locationRule.countryCode.toLowerCase()}-${result.locationRule.currency.toLowerCase()}`,
            countryCode: result.locationRule.countryCode,
            currency: result.locationRule.currency,
            ignitePrice: result.locationRule.ignitePrice,
            ascentPrice: result.locationRule.ascentPrice,
            empirePrice: result.locationRule.empirePrice,
            taxMode: result.locationRule.taxMode as LocationPricingRule["taxMode"],
            enabled: true
          });
        }
      })
      .catch(() => {
        setStripePrices({});
      });
  }, [detectedCountry]);

  const selectedLocationRule = useMemo(() => {
    if (remoteLocationRule) return remoteLocationRule;
    return (
      locationPricing.find((rule) => rule.enabled && rule.countryCode === detectedCountry) ??
      locationPricing.find((rule) => rule.enabled && rule.countryCode === "US") ??
      null
    );
  }, [detectedCountry, locationPricing, remoteLocationRule]);

  const getDisplayPrice = (plan: SalesPageContent["pricing"][number]) => {
    const stripePrice = stripePrices[plan.tier];

    if (stripePrice?.unitAmount !== null && stripePrice?.unitAmount !== undefined) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: stripePrice.currency,
        maximumFractionDigits: 0
      }).format(stripePrice.unitAmount / 100);
    }

    return plan.price;
  };

  const getLocalizedPrice = (plan: SalesPageContent["pricing"][number]) => {
    if (!selectedLocationRule) return null;
    const key = tierPriceKeys[plan.tier];
    return formatLocalizedPrice(selectedLocationRule.currency, selectedLocationRule[key]);
  };

  const checkout = (tier: SubscriptionTier) => {
    onCheckout(tier, buyerEmail, selectedLocationRule?.countryCode ?? detectedCountry);
  };

  return (
    <div className="sales-motion overflow-hidden">
      <section className="sales-hero relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8">
        <div className="cinema-grid" aria-hidden="true" />
        <div className="motion-rise">
          <div className="glass-chip motion-badge mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-crown-champagne">
            <HeartHandshake size={16} />
            Relationship-first duplication for human-led network marketing
          </div>
          <h1 className="motion-rise max-w-4xl text-4xl font-semibold tracking-normal text-white sm:text-6xl">
            {content.headline}
          </h1>
          <p className="motion-rise mt-5 max-w-2xl text-base leading-7 text-crown-mist sm:text-lg">
            {content.subheadline}
          </p>
          <div className="motion-rise mt-7 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="email"
                value={buyerEmail}
                onChange={(event) => setBuyerEmail(event.target.value)}
                placeholder="Enter your work email"
                className="h-12 rounded-xl border border-white/10 bg-crown-navy/80 px-4 text-sm text-white outline-none ring-crown-gold/30 placeholder:text-crown-mist focus:ring-4"
              />
              <button
                onClick={() => checkout("ascent")}
                className="motion-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-crown-gold px-5 font-semibold text-crown-navy transition hover:bg-crown-champagne"
              >
                {content.primaryCta}
                <ArrowRight size={18} />
              </button>
            </div>
            <p className="mt-2 px-1 text-xs leading-5 text-crown-mist">
              Start with Growth. Test the full lead capture, relationship CRM, warm scripts, follow-up rhythm, and team snapshot flow.
            </p>
          </div>

          <div className="motion-rise mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => checkout("ignite")}
              className="motion-lift inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-crown-gold/40 px-5 font-semibold text-crown-champagne transition hover:border-crown-gold/70"
            >
              Start Basic instead
            </button>
            <button onClick={onStart} className="motion-lift inline-flex h-12 items-center justify-center rounded-lg border border-white/10 px-5 font-semibold text-white transition hover:border-crown-gold/60">
              Preview dashboard
            </button>
          </div>

          <div className="motion-rise mt-6 grid gap-2 text-sm text-crown-mist sm:grid-cols-3">
            {["Know who to care for next", "Send warmer, personal messages", "Lead with trust instead of pressure"].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {content.proofPoints.map((point, index) => (
              <div key={point} className="motion-card rounded-lg border border-white/10 bg-white/[0.045] p-4" style={{ animationDelay: `${index * 90}ms` }}>
                <CheckCircle2 className="mb-3 text-crown-emerald" size={20} />
                <p className="text-sm font-medium text-crown-champagne">{point}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel motion-float rounded-[24px] p-5 shadow-glow">
          <div className="cinema-reflection" aria-hidden="true" />
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-crown-gold">What buyers get</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">A human-touch growth workspace</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
              <GitBranch />
            </div>
          </div>
          <div className="space-y-3">
            {content.offerStack.map((item, index) => (
              <div
                key={item}
                className="glass-row motion-list-item flex items-center gap-3 rounded-lg p-4"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <CheckCircle2 size={18} className="text-crown-emerald" />
                <span className="text-sm text-white">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-crown-gold/10 p-4 text-sm leading-6 text-crown-champagne">
            Best for leaders who want speed without losing the personal care, sponsor support, and
            warm conversations that make network marketing work.
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-crown-ink/70 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {[
            ["Warmer onboarding", "New builders learn who to contact, how to listen, and when to ask their sponsor for help."],
            ["Relationship memory", "Track trust notes, personal context, next care touch, and follow-up timing."],
            ["Human follow-up", "Reminders and scripts keep people cared for without making outreach feel robotic."],
            ["Sales-ready SaaS", "Plans, trials, Stripe, tenants, CMS, access, SEO, and analytics are included."]
          ].map(([title, body], index) => (
            <div key={title} className="motion-lift rounded-lg border border-white/10 bg-white/[0.035] p-5" style={{ animationDelay: `${index * 70}ms` }}>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-2 text-sm leading-6 text-crown-mist">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionHeader
        eyebrow="Features"
        title="Designed to make growth feel personal, not mechanical"
        body="Duplios is not another file vault. It helps each builder remember the person, send the right warm touch, ask for sponsor support, and build trust before trying to close."
      />

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
        {content.features.map((feature, index) => {
          const Icon = featureIcons[index % featureIcons.length];
          return (
            <div key={feature.title} className="motion-lift rounded-lg border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-crown-mist">{feature.body}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-crown-ink/60 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
              Human Touch System
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Automation should remind people to be more human.
            </h2>
            <p className="mt-4 text-sm leading-7 text-crown-mist">
              Network marketing grows through trust, recognition, consistency, and care. The app is
              built to help builders remember birthdays, personal goals, objections, last
              conversations, sponsor handoffs, and the next thoughtful reason to reconnect.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Trust Notes", "Capture family, goals, pain points, product interests, and what matters to each person."],
              ["Care Touches", "Schedule check-ins that give value before asking for a decision."],
              ["Sponsor Handoff", "Bring a leader into sensitive or high-intent conversations at the right moment."],
              ["Relationship Score", "Prioritize warm people by engagement, context, trust, and follow-up age."]
            ].map(([title, body]) => (
              <div key={title} className="motion-lift rounded-lg border border-white/10 bg-crown-navy p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-crown-gold/15 text-crown-gold">
                  <HeartHandshake size={20} />
                </div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-crown-mist">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-crown-ink/60 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
              Conversion System
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              From cold confusion to booked conversations
            </h2>
            <p className="mt-4 text-sm leading-7 text-crown-mist">
              Every workflow exists to move a new builder toward the next revenue-producing action:
              add names, send invites, follow up, book conversations, and ask the sponsor for help.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {[
              "7/14/30-day onboarding",
              "Memory jogger contact builder",
              "Daily Power Hour",
              "Sponsor accountability",
              "Leader playbook push",
              "AI script personalization",
              "Appointment tracker",
              "Momentum leaderboard",
              "Compliance guardrails",
              "WhatsApp/SMS workflows"
            ].map((item, index) => (
              <div key={item} className="motion-lift rounded-lg border border-white/10 bg-crown-navy p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-crown-gold text-sm font-semibold text-crown-navy">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-crown-ink/60 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
              Duplication Engine
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              Turn what top leaders do into what the whole team repeats.
            </h2>
            <p className="mt-4 text-sm leading-7 text-crown-mist">
              The core product is not just a dashboard. It is a behavior distribution system:
              package the right action, push it to the right lineage, and measure whether it is
              being adopted.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Package", "Create approved scripts, assets, action plans, and launch campaigns."],
              ["Push", "Send updates to Basic, Growth, or selected downline segments."],
              ["Execute", "New joiners get a stripped-down action screen with no learning curve."],
              ["Measure", "Track usage, compliance, follow-up, conversion, and rank readiness."]
            ].map(([title, body], index) => (
              <div key={title} className="motion-lift rounded-lg border border-white/10 bg-crown-navy p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-crown-gold text-sm font-semibold text-crown-navy">
                  {index + 1}
                </div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-crown-mist">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionHeader
        eyebrow="Pricing"
        title="Start with Growth if you want customers fast"
        body="Basic is enough for personal execution. Growth is the best starting point for lead capture, automation, and selling now. Pro is for leaders managing duplication at scale."
      />

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6 lg:px-8">
        <label className="block rounded-lg border border-white/10 bg-crown-ink p-4">
          <span className="mb-2 block text-sm font-medium text-crown-champagne">
            Work email for checkout
          </span>
          <input
            type="email"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="Work email"
            className="w-full rounded-lg border border-white/10 bg-crown-navy p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4"
          />
        </label>
        <p className="mt-3 text-center text-xs leading-5 text-crown-mist">
          Detected region: {selectedLocationRule?.countryCode ?? detectedCountry}. Stripe Price IDs remain the billing source of truth; regional prices are shown for local context and tax planning.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        {content.pricing.map((plan) => (
          <div
            key={plan.tier}
            className={`motion-lift rounded-lg border p-5 ${
              plan.highlighted
                ? "border-crown-gold/60 bg-crown-gold/10 shadow-glow"
                : "border-white/10 bg-white/[0.045]"
            }`}
          >
            {plan.highlighted ? (
              <div className="mb-4 inline-flex rounded-full bg-crown-gold px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-crown-navy">
                Most popular
              </div>
            ) : null}
            <h3 className="text-2xl font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-sm leading-6 text-crown-mist">{plan.description}</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="text-4xl font-semibold text-white">{getDisplayPrice(plan)}</span>
              <span className="pb-1 text-sm text-crown-mist">
                /{stripePrices[plan.tier]?.interval === "year" ? "yr" : "mo"}
              </span>
            </div>
            {getLocalizedPrice(plan) ? (
              <p className="mt-2 text-xs font-medium text-crown-champagne">
                Local display: {getLocalizedPrice(plan)}
              </p>
            ) : null}
            <button
              onClick={() => checkout(plan.tier)}
              className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg font-semibold ${
                plan.highlighted
                  ? "bg-crown-gold text-crown-navy hover:bg-crown-champagne"
                  : "border border-white/10 text-white hover:border-crown-gold/60"
              }`}
            >
              Start 14-day trial
            </button>
            <div className="mt-5 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex gap-3 text-sm text-crown-mist">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-crown-emerald" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {content.testimonials.length > 0 ? (
        <>
          <SectionHeader
            eyebrow="Testimonials"
            title="Built for leaders who need the team moving today"
            body="The sales promise is simple: less confusion, faster execution, cleaner leadership duplication."
          />

          <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 sm:px-6 lg:grid-cols-3 lg:px-8">
            {content.testimonials.map((testimonial) => (
              <figure key={testimonial.name} className="motion-lift rounded-lg border border-white/10 bg-crown-ink p-5">
                <blockquote className="text-sm leading-7 text-crown-champagne">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="mt-5 border-t border-white/10 pt-4">
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-crown-mist">{testimonial.title}</p>
                </figcaption>
              </figure>
            ))}
          </section>
        </>
      ) : null}

      <section className="bg-crown-ink/60 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
              FAQ
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Questions before rollout</h2>
            <p className="mt-4 text-sm leading-7 text-crown-mist">
              This is positioned as an enterprise-ready SaaS foundation for paid tenants, not just
              a set of isolated productivity tools.
            </p>
          </div>
          <div className="space-y-3">
            {content.faqs.map((faq) => (
              <details key={faq.question} className="rounded-lg border border-white/10 bg-crown-navy p-5">
                <summary className="cursor-pointer font-semibold text-white">{faq.question}</summary>
                <p className="mt-3 text-sm leading-6 text-crown-mist">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="motion-glow mx-auto max-w-7xl rounded-lg border border-crown-gold/30 bg-crown-gold/10 p-6 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-crown-gold text-crown-navy">
            <GitBranch />
          </div>
          <h2 className="text-3xl font-semibold text-white">Ready to turn leadership into a system?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-crown-champagne">
            Launch a premium tenant workspace with sales-page CMS, Stripe billing, role management,
            and the duplication engine your fastest-growing builders need.
          </p>
          <button
            onClick={onStart}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-crown-gold px-5 font-semibold text-crown-navy transition hover:bg-crown-champagne"
          >
            Start 14-Day Free Trial
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">{eyebrow}</p>
      <div className="mt-2 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
        <p className="text-sm leading-7 text-crown-mist">{body}</p>
      </div>
    </section>
  );
}
