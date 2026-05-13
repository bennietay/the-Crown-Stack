import { CheckCircle2, Copy, MessageSquareText, Target, Users } from "lucide-react";
import type { FastStartPlan, LeadRecord, OutreachTask, ScriptAsset, DupliosUserProfile } from "../../types/tenant";
import { translate, type LanguageCode } from "../../lib/i18n";

interface NewJoinerViewProps {
  profile: DupliosUserProfile;
  scripts: ScriptAsset[];
  leads?: LeadRecord[];
  outreachTasks?: OutreachTask[];
  fastStartPlan?: FastStartPlan[];
  language: LanguageCode;
}

export function NewJoinerView({ profile, scripts, leads = [], outreachTasks = [], fastStartPlan = [], language }: NewJoinerViewProps) {
  const primaryScript = scripts[0];
  const todayPlan = fastStartPlan[0];
  const nextLead = leads[0];
  const nextOutreach = outreachTasks.find((task) => task.status === "queued");

  return (
    <section className="border-t border-white/10 bg-crown-ink/75 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-crown-gold">
            {translate(language, "newJoiner.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{translate(language, "newJoiner.title")}</h2>
          <p className="mt-3 text-sm leading-6 text-crown-mist">
            {profile.displayName} {translate(language, "newJoiner.body")}
          </p>
          <div className="mt-5 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
            <p className="text-sm font-semibold text-crown-champagne">Day {todayPlan?.day ?? 1}</p>
            <p className="mt-1 font-semibold text-white">{todayPlan?.title ?? "Start conversations"}</p>
            <p className="mt-2 text-sm leading-6 text-crown-mist">
              {todayPlan?.objective ?? "Use the approved message and log every response."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-crown-navy p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              [translate(language, "newJoiner.addLeads"), translate(language, "newJoiner.addLeadsDetail"), Users],
              [translate(language, "newJoiner.sendInvites"), translate(language, "newJoiner.sendInvitesDetail"), MessageSquareText],
              [translate(language, "newJoiner.bookOverview"), translate(language, "newJoiner.bookOverviewDetail"), Target]
            ].map(([step, detail, Icon]) => (
              <div key={String(step)} className="rounded-lg bg-white/[0.04] p-4">
                <Icon className="mb-2 text-crown-emerald" size={22} />
                <p className="text-sm font-medium text-white">{String(step)}</p>
                <p className="mt-1 text-xs text-crown-mist">{String(detail)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ActionCard
              eyebrow={translate(language, "newJoiner.nextLead")}
              title={nextLead?.name ?? translate(language, "newJoiner.addFirstLead")}
              body={nextLead ? `${nextLead.nextAction} · ${nextLead.source}` : translate(language, "newJoiner.firstLeadBody")}
              language={language}
            />
            <ActionCard
              eyebrow={translate(language, "newJoiner.socialOutreach")}
              title={nextOutreach?.target ?? translate(language, "newJoiner.queueOutreach")}
              body={nextOutreach?.script ?? translate(language, "newJoiner.outreachBody")}
              copyText={nextOutreach?.script}
              language={language}
            />
          </div>

          <div className="mt-4 rounded-lg border border-crown-gold/25 bg-crown-gold/10 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-crown-gold">
              {translate(language, "newJoiner.approvedScript")}
            </p>
            <p className="text-sm leading-6 text-crown-champagne">{primaryScript.body}</p>
            <button
              onClick={() => void navigator.clipboard.writeText(primaryScript.body)}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-crown-gold px-4 text-sm font-semibold text-crown-navy"
            >
              <Copy size={16} />
              {translate(language, "newJoiner.copyScript")}
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {(todayPlan?.actions ?? ["Send 5 invites", "Log every response", "Follow up with hot leads"]).map((action) => (
              <label key={action} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-white">
                <input type="checkbox" className="h-4 w-4 accent-crown-gold" />
                {action}
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionCard({
  eyebrow,
  title,
  body,
  copyText,
  language
}: {
  eyebrow: string;
  title: string;
  body: string;
  copyText?: string;
  language: LanguageCode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-crown-ink p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crown-gold">{eyebrow}</p>
      <p className="mt-2 font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-crown-mist">{body}</p>
      {copyText ? (
        <button
          onClick={() => void navigator.clipboard.writeText(copyText)}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-crown-gold/30 px-3 text-sm text-crown-champagne"
        >
          <Copy size={15} />
          {translate(language, "newJoiner.copy")}
        </button>
      ) : null}
    </div>
  );
}
