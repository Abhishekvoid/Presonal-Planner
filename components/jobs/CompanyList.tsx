"use client";

import { useMemo, useState } from "react";
import {
  Company,
  Stage,
  STAGES,
  STAGE_LABEL,
  Priority,
  PRIORITIES,
  Channel,
  CHANNELS,
  CHANNEL_LABEL,
} from "@/lib/jobs/types";
import { useJobs } from "@/lib/jobs/store";
import { CompanyFilter, filterCompanies, isFollowUpOverdue } from "@/lib/jobs/selectors";
import { inputClass } from "@/components/primitives";
import { PriorityDot, StageDot, ChannelTag, shortDate } from "./bits";

const selClass =
  "bg-cream-base border hairline px-2 py-1.5 text-xs text-espresso focus:border-olive focus:outline-none transition-colors";

export function CompanyList({
  companies,
  onOpen,
}: {
  companies: Company[];
  onOpen: (c: Company) => void;
}) {
  const setStage = useJobs((s) => s.setStage);
  const [filter, setFilter] = useState<CompanyFilter>({
    stage: "all",
    priority: "all",
    channel: "all",
    search: "",
  });

  const rows = useMemo(() => {
    const filtered = filterCompanies(companies, filter);
    // Sort by stage order, then hot→cold, then name.
    const stageRank = (s: Stage) => STAGES.indexOf(s);
    const prioRank: Record<Priority, number> = { hot: 0, warm: 1, cold: 2 };
    return [...filtered].sort(
      (a, b) =>
        stageRank(a.stage) - stageRank(b.stage) ||
        prioRank[a.priority] - prioRank[b.priority] ||
        a.name.localeCompare(b.name),
    );
  }, [companies, filter]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <input
          className={`${inputClass} h-auto max-w-[200px] flex-1 py-1.5 text-xs`}
          placeholder="Search name, role, contact…"
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          className={selClass}
          value={filter.stage}
          aria-label="Filter by stage"
          onChange={(e) => setFilter((f) => ({ ...f, stage: e.target.value as Stage | "all" }))}
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className={selClass}
          value={filter.priority}
          aria-label="Filter by priority"
          onChange={(e) =>
            setFilter((f) => ({ ...f, priority: e.target.value as Priority | "all" }))
          }
        >
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={selClass}
          value={filter.channel}
          aria-label="Filter by channel"
          onChange={(e) =>
            setFilter((f) => ({ ...f, channel: e.target.value as Channel | "all" }))
          }
        >
          <option value="all">Any channel</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="border hairline bg-cream-raised px-4 py-10 text-center text-sm text-coffee">
          No companies match these filters.
        </p>
      ) : (
        <div className="border hairline divide-y divide-coffee/20 bg-cream-raised">
          {rows.map((c) => (
            <Row key={c.id} company={c} onOpen={onOpen} onStage={setStage} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  company,
  onOpen,
  onStage,
}: {
  company: Company;
  onOpen: (c: Company) => void;
  onStage: (id: string, s: Stage) => void;
}) {
  const overdue = isFollowUpOverdue(company, new Date());
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
        overdue ? "bg-clay/[0.06] hover:bg-clay/[0.1]" : "hover:bg-cream-deep/40"
      }`}
    >
      <button
        onClick={() => onOpen(company)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PriorityDot p={company.priority} />
        <span className="min-w-0">
          <span className="font-display text-sm font-bold tracking-tightest text-espresso">
            {company.name}
          </span>
          {company.role && (
            <span className="ml-2 truncate text-xs text-coffee">{company.role}</span>
          )}
        </span>
      </button>

      <span className="hidden items-center gap-1.5 sm:flex">
        {company.contacts && company.contacts.length > 0 ? (
          <>
            <span className="text-xs text-coffee truncate max-w-[120px]">
              {company.contacts[0].name || "Unnamed"}
              {company.contacts.length > 1 && ` +${company.contacts.length - 1}`}
            </span>
            <ChannelTag channel={company.contacts[0].channel} link={company.contacts[0].link} />
          </>
        ) : (
          <>
            {company.contactName && (
              <span className="text-xs text-coffee truncate max-w-[120px]">{company.contactName}</span>
            )}
            <ChannelTag channel={company.channel} link={company.contactLink} />
          </>
        )}
      </span>

      {company.followUpAt && (
        <span
          className={`label !text-[9px] !tracking-[0.08em] hidden md:inline ${
            overdue ? "text-clay-deep" : "text-coffee/70"
          }`}
        >
          {shortDate(company.followUpAt)}
        </span>
      )}

      <span className="flex items-center gap-1.5">
        <StageDot stage={company.stage} />
        <select
          value={company.stage}
          aria-label={`Stage for ${company.name}`}
          onChange={(e) => onStage(company.id, e.target.value as Stage)}
          className="bg-transparent text-xs text-espresso focus:outline-none cursor-pointer"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABEL[s]}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
