import { Eye, Save, ToggleRight } from "lucide-react";
import type { SalesPageContent } from "../../types/tenant";

interface SalesPageCMSProps {
  content: SalesPageContent;
  onPreview: () => void;
}

export function SalesPageCMS({ content, onPreview }: SalesPageCMSProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
          Tenant CMS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Sales page control room</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-crown-mist">
          Tenant leaders can publish offer messaging, proof, and page content without touching the
          core app or deployment pipeline.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <form className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <div className="grid gap-4">
            <Field label="Headline" value={content.headline} />
            <Field label="Subheadline" value={content.subheadline} textarea />
            <Field label="Primary CTA" value={content.primaryCta} />
            <Field label="Proof points" value={content.proofPoints.join("\n")} textarea />
            <Field label="Offer stack" value={content.offerStack.join("\n")} textarea />
            <Field
              label="Features"
              value={content.features.map((item) => `${item.title}: ${item.body}`).join("\n")}
              textarea
            />
            <Field
              label="Testimonials"
              value={content.testimonials
                .map((item) => `${item.name} (${item.title}): ${item.quote}`)
                .join("\n")}
              textarea
            />
            <Field
              label="Pricing"
              value={content.pricing
                .map((item) => `${item.name} ${item.price}: ${item.description}`)
                .join("\n")}
              textarea
            />
            <Field
              label="FAQ"
              value={content.faqs.map((item) => `${item.question}: ${item.answer}`).join("\n")}
              textarea
            />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-crown-gold px-4 font-semibold text-crown-navy"
            >
              <Save size={18} />
              Save draft
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 px-4 font-semibold text-white"
            >
              <ToggleRight size={18} />
              Publish
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-white/10 bg-crown-ink p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Live preview</h2>
            <button
              onClick={onPreview}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-sm text-white"
            >
              <Eye size={16} />
              Open
            </button>
          </div>
          <div className="rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
            <h3 className="text-xl font-semibold text-white">{content.headline}</h3>
            <p className="mt-3 text-sm leading-6 text-crown-mist">{content.subheadline}</p>
            <div className="mt-4 rounded-lg bg-crown-gold px-4 py-3 text-center text-sm font-semibold text-crown-navy">
              {content.primaryCta}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({ label, value, textarea = false }: { label: string; value: string; textarea?: boolean }) {
  const className =
    "w-full rounded-lg border border-white/10 bg-crown-ink p-3 text-sm text-white outline-none ring-crown-gold/30 focus:ring-4";

  return (
    <label className="block">
      <span className="mb-2 block text-sm text-crown-mist">{label}</span>
      {textarea ? (
        <textarea defaultValue={value} className={`${className} min-h-28 resize-none`} />
      ) : (
        <input defaultValue={value} className={className} />
      )}
    </label>
  );
}
