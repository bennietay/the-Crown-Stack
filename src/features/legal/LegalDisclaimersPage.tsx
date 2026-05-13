import { FileText, ShieldCheck } from "lucide-react";
import type { LegalDocument } from "../../types/tenant";

const categoryLabels: Record<LegalDocument["category"], string> = {
  terms: "Terms",
  privacy: "Privacy",
  refund: "Refund",
  acceptable_use: "Acceptable Use",
  earnings: "Earnings",
  medical: "Medical",
  testimonial: "Testimonials",
  compliance: "Compliance"
};

export function LegalDisclaimersPage({ documents }: { documents: LegalDocument[] }) {
  const publishedDocs = documents.filter((doc) => doc.status === "published");

  return (
    <section className="bg-crown-navy px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-glow sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crown-gold">
                Legal Center
              </p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Legal and disclaimers</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-crown-mist sm:text-base">
                Review the platform terms, privacy disclosures, refund policy, acceptable use rules,
                and business disclaimers before using Duplios. These templates should be
                reviewed by qualified counsel before public launch.
              </p>
            </div>
            <div className="rounded-2xl border border-crown-gold/25 bg-crown-gold/10 p-4">
              <ShieldCheck className="text-crown-gold" />
              <p className="mt-3 text-sm font-semibold text-white">Published policy set</p>
              <p className="mt-1 text-3xl font-semibold text-crown-gold">{publishedDocs.length}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4">
          {publishedDocs.map((doc) => (
            <article
              key={doc.id}
              id={doc.id}
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-crown-ink p-5 sm:p-6"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-crown-gold/15 text-crown-gold">
                    <FileText size={20} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crown-gold">
                      {categoryLabels[doc.category]}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-white">{doc.title}</h2>
                  </div>
                </div>
                <p className="text-xs text-crown-mist">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm leading-7 text-crown-champagne sm:text-base">{doc.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-crown-gold/25 bg-crown-gold/10 p-5 text-sm leading-7 text-crown-champagne">
          This page is provided as template software content and is not legal advice. Laws and
          platform policies vary by country, industry, product category, advertising claim, and
          payment flow. Have qualified counsel review the final customer-facing language before
          accepting payments publicly.
        </div>
      </div>
    </section>
  );
}
