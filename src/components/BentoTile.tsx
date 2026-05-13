import type { ReactNode } from "react";

interface BentoTileProps {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

export function BentoTile({ title, eyebrow, children, className = "" }: BentoTileProps) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow backdrop-blur ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-crown-gold">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}
