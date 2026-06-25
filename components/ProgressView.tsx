"use client";

import { useMemo } from "react";
import { usePlanner } from "@/lib/store";
import {
  dayProgress,
  orderedDays,
  orderedTracks,
  overallProgress,
  trackProgress,
} from "@/lib/selectors";
import { useCountUp } from "@/lib/useCountUp";
import { KineticNumber, PressIn } from "@/lib/kineticType";
import { SectionDivider } from "./SectionDivider";

export function ProgressView() {
  const state = usePlanner();
  const tracks = useMemo(() => orderedTracks(state), [state]);
  const days = useMemo(() => orderedDays(state), [state]);
  const overall = overallProgress(state);
  const doneCount = useCountUp(overall.done);

  return (
    <div>
      {/* Big overall number */}
      <div className="grid grid-cols-12 items-end gap-4 pb-7">
        <div className="col-span-12 sm:col-span-5">
          <PressIn className="label text-coffee mb-1 block">Overall completion</PressIn>
          <div className="flex items-baseline gap-2">
            <KineticNumber
              value={overall.pct}
              className="font-display text-[6rem] leading-[0.8] font-extrabold tracking-tightest tabular-nums text-espresso"
            />
            <span className="font-display text-3xl font-bold text-olive">%</span>
          </div>
        </div>
        <div className="col-span-12 sm:col-span-7 sm:pb-2">
          <p className="font-display text-xl font-semibold tracking-tightest tabular-nums text-coffee">
            {doneCount} of {overall.total} tasks done
          </p>
          <p className="mt-1 text-sm text-coffee/80">
            Across {days.length} days and {tracks.length} tracks.
          </p>
        </div>
      </div>

      <SectionDivider />

      {/* Per-track */}
      <section className="mt-8">
        <div className="label text-coffee mb-3">By track</div>
        <div className="space-y-4">
          {tracks.map((t, i) => {
            const p = trackProgress(state, t.id);
            return (
              <div
                key={t.id}
                className="reveal flex items-center gap-4"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="h-3 w-3 shrink-0" style={{ backgroundColor: t.accent }} />
                <span className="w-24 shrink-0 truncate text-sm font-medium text-espresso sm:w-40">
                  {t.name}
                </span>
                <div className="relative h-6 flex-1 bg-cream-deep">
                  <div
                    className="grow-x h-full"
                    style={{
                      width: `${p.pct}%`,
                      backgroundColor: t.accent,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                </div>
                <span className="font-display w-14 shrink-0 text-right text-sm font-bold text-coffee">
                  {p.done}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <SectionDivider className="mt-10" />

      {/* Per-day */}
      <section className="mt-10">
        <div className="label text-coffee mb-3">By day</div>
        <div className="border-t hairline">
          {days.map((d) => {
            const p = dayProgress(state, d.id);
            const complete = p.total > 0 && p.done === p.total;
            return (
              <div
                key={d.id}
                className="grid grid-cols-12 items-center gap-3 border-b hairline py-3"
              >
                <span className="col-span-2 sm:col-span-1 font-display text-base font-bold tracking-tightest text-espresso">
                  {String(d.index).padStart(2, "0")}
                </span>
                <span className="col-span-10 sm:col-span-4 truncate text-sm text-espresso">
                  {d.title}
                </span>
                <span className="col-span-9 sm:col-span-5">
                  <div className="h-2 w-full bg-cream-deep">
                    <div
                      className="h-full"
                      style={{
                        width: `${p.pct}%`,
                        backgroundColor: complete ? "var(--olive)" : "var(--coffee)",
                      }}
                    />
                  </div>
                </span>
                <span className="col-span-3 sm:col-span-2 text-right font-display text-xs font-bold text-coffee">
                  {p.done}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
