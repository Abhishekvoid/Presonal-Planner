"use client";

import { Company, STAGES, STAGE_LABEL } from "@/lib/jobs/types";
import { companiesByStage } from "@/lib/jobs/selectors";
import { CompanyCard } from "./CompanyCard";
import { StageDot } from "./bits";

export function CompanyBoard({
  companies,
  onOpen,
}: {
  companies: Company[];
  onOpen: (c: Company) => void;
}) {
  const byStage = companiesByStage(companies);

  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {STAGES.map((stage) => {
          const list = byStage[stage];
          return (
            <section key={stage} className="flex w-[240px] shrink-0 flex-col">
              <header className="flex items-center justify-between border-b hairline pb-2">
                <span className="flex items-center gap-2">
                  <StageDot stage={stage} />
                  <span className="label text-espresso">{STAGE_LABEL[stage]}</span>
                </span>
                <span className="font-display text-xs font-bold text-coffee">
                  {list.length}
                </span>
              </header>

              <div className="mt-2.5 flex flex-col gap-2">
                {list.length === 0 ? (
                  <p className="select-none py-6 text-center text-xs text-coffee/45">
                    {STAGE_LABEL[stage].toLowerCase()}
                  </p>
                ) : (
                  list.map((c) => <CompanyCard key={c.id} company={c} onOpen={onOpen} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
