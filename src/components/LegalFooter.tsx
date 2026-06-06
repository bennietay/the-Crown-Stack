const legalLinks = [
  ["Terms of Service", "terms-of-service"],
  ["Privacy Policy", "privacy-policy"],
  ["Refund Policy", "refund-policy"],
  ["Acceptable Use", "acceptable-use"]
] as const;

const disclaimerLinks = [
  ["Earnings Disclaimer", "earnings-disclaimer"],
  ["Medical Disclaimer", "medical-disclaimer"],
  ["Testimonial Disclosure", "testimonial-disclosure"],
  ["Compliance Review", "compliance-review"]
] as const;

export function LegalFooter({ onNavigate }: { onNavigate: (targetId?: string) => void }) {
  return (
    <footer className="border-t border-white/10 bg-crown-ink px-4 py-8 text-sm text-crown-mist sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-semibold text-white">Duplios</p>
          <p className="mt-2 max-w-3xl leading-6">
            Software for CRM organization, duplication, content management, training workflows,
            automation planning, and team operations. It does not guarantee income, rank
            advancement, sales results, customer acquisition, medical outcomes, or business success.
          </p>
          <button
            type="button"
            onClick={() => onNavigate()}
            className="mt-4 rounded-lg border border-crown-gold/30 px-4 py-2 text-sm font-semibold text-crown-gold transition hover:bg-crown-gold hover:text-crown-navy"
          >
            View Legal Center
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FooterColumn title="Legal" links={legalLinks} onNavigate={onNavigate} />
          <FooterColumn title="Disclaimers" links={disclaimerLinks} onNavigate={onNavigate} />
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-7xl border-t border-white/10 pt-5 text-xs leading-5 text-crown-mist">
        Template legal content is provided for review inside the Legal Center and Superadmin Legal
        Review module. Have qualified counsel review final terms, disclosures, claims, and
        jurisdiction-specific obligations before launch.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
  onNavigate
}: {
  title: string;
  links: readonly (readonly [string, string])[];
  onNavigate: (targetId?: string) => void;
}) {
  return (
    <div>
      <p className="font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {links.map(([label, targetId]) => (
          <button
            key={targetId}
            type="button"
            onClick={() => onNavigate(targetId)}
            className="block text-left text-crown-mist underline-offset-4 hover:text-white hover:underline"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
