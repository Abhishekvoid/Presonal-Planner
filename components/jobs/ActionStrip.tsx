"use client";

import { useState } from "react";
import { Company } from "@/lib/jobs/types";
import { ActionBuckets } from "@/lib/jobs/selectors";
import { PriorityDot, shortDate } from "./bits";

type BucketKey = keyof ActionBuckets;

const BUCKET_META: { key: BucketKey; label: string; hint: string }[] = [
  { key: "dueFollowUp", label: "Due to follow up", hint: "follow-up date has arrived" },
  { key: "noReply", label: "No reply yet", hint: "contacted, gone quiet" },
  { key: "notContacted", label: "Not contacted", hint: "fresh leads waiting" },
];

export function ActionStrip({
  buckets,
  onOpen,
}: {
  buckets: ActionBuckets;
  onOpen: (c: Company) => void;
}) {
  const total =
    buckets.dueFollowUp.length + buckets.noReply.length + buckets.notContacted.length;

  // Open the first non-empty bucket by default so the page leads with action.
  const firstNonEmpty = BUCKET_META.find((m) => buckets[m.key].length > 0)?.key ?? null;
  const [open, setOpen] = useState<BucketKey | null>(firstNonEmpty);

  if (total === 0) {
    return (
      <div className="mb-6 border hairline bg-cream-raised px-5 py-6 text-center">
        <p className="font-display text-base font-bold tracking-tightest text-espresso">
          Nothing waiting on you.
        </p>
        <p className="mt-1 text-sm text-coffee">Add a lead, or go message someone.</p>
      </div>
    );
  }

  const active = open ? buckets[open] : [];

  return (
    <div className="mb-6 border hairline bg-cream-raised">
      <div className="grid grid-cols-3 divide-x divide-coffee/20">
        {BUCKET_META.map((m) => {
          const count = buckets[m.key].length;
          const isOpen = open === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setOpen(isOpen ? null : m.key)}
              disabled={count === 0}
              className={`px-3 py-3 text-left transition-colors disabled:opacity-45 ${
                isOpen ? "bg-cream-deep/60" : "hover:bg-cream-deep/30"
              }`}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold tracking-tightest text-espresso">
                  {count}
                </span>
                <span className="label text-coffee leading-tight">{m.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {open && active.length > 0 && (
        <ul className="divide-y divide-coffee/20 border-t hairline">
          {active.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onOpen(c)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-cream-deep/40"
              >
                <PriorityDot p={c.priority} />
                <span className="font-display text-sm font-bold tracking-tightest text-espresso">
                  {c.name}
                </span>
                {c.role && <span className="truncate text-xs text-coffee">{c.role}</span>}
                {c.followUpAt && open === "dueFollowUp" && (
                  <span className="label !text-[9px] ml-auto text-clay-deep">
                    {shortDate(c.followUpAt)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
