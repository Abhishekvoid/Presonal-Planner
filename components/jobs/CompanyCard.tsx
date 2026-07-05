"use client";

import { Company, Stage, STAGES, STAGE_LABEL } from "@/lib/jobs/types";
import { useJobs } from "@/lib/jobs/store";
import { isFollowUpOverdue } from "@/lib/jobs/selectors";
import { PriorityDot, ChannelTag, shortDate } from "./bits";

function adjacentStage(stage: Stage, dir: -1 | 1): Stage | null {
  const i = STAGES.indexOf(stage);
  const j = i + dir;
  return j >= 0 && j < STAGES.length ? STAGES[j] : null;
}

/** Board card. Click opens detail; ←/→ move the company between stages. */
export function CompanyCard({
  company,
  onOpen,
}: {
  company: Company;
  onOpen: (c: Company) => void;
}) {
  const setStage = useJobs((s) => s.setStage);
  const overdue = isFollowUpOverdue(company, new Date());

  const prev = adjacentStage(company.stage, -1);
  const next = adjacentStage(company.stage, 1);

  return (
    <div
      className={`group border ${
        overdue ? "border-clay/45 bg-clay/[0.06]" : "border-hair bg-cream-raised"
      }`}
    >
      <button
        onClick={() => onOpen(company)}
        className="block w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-display text-sm font-bold tracking-tightest text-espresso leading-tight text-balance">
            {company.name}
          </span>
          <PriorityDot p={company.priority} />
        </div>
        {company.role && (
          <p className="mt-0.5 text-xs text-coffee leading-snug">{company.role}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ChannelTag channel={company.channel} />
          {company.contacts && company.contacts.length > 1 && (
            <span className="label !text-[9px] border border-coffee/20 px-1 py-[1px] text-coffee/90 bg-coffee/5 font-semibold">
              👥 {company.contacts.length}
            </span>
          )}
          {company.followUpAt && (
            <span
              className={`label !text-[9px] !tracking-[0.08em] ${
                overdue ? "text-clay-deep" : "text-coffee"
              }`}
            >
              ⤳ {shortDate(company.followUpAt)}
            </span>
          )}
        </div>
      </button>

      <div className="flex items-stretch border-t hairline">
        <button
          onClick={() => prev && setStage(company.id, prev)}
          disabled={!prev}
          aria-label={prev ? `Move to ${STAGE_LABEL[prev]}` : "Already at first stage"}
          className="flex-1 py-1 text-coffee hover:bg-cream-deep/60 hover:text-espresso disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
        >
          ←
        </button>
        <span className="w-px bg-coffee/20" aria-hidden />
        <button
          onClick={() => next && setStage(company.id, next)}
          disabled={!next}
          aria-label={next ? `Move to ${STAGE_LABEL[next]}` : "Already at last stage"}
          className="flex-1 py-1 text-coffee hover:bg-cream-deep/60 hover:text-espresso disabled:opacity-30 disabled:pointer-events-none transition-colors text-xs"
        >
          →
        </button>
      </div>
    </div>
  );
}
