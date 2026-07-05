"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/lib/store";
import {
  buildHeatmap,
  computeStreak,
  HeatDay,
  HeatMetric,
  intensity,
} from "@/lib/focus";

const WEEKS = 13;

const CELL_COLOR: Record<number, string> = {
  0: "var(--cream-deep)",
  1: "rgb(var(--olive-rgb) / 0.30)",
  2: "rgb(var(--olive-rgb) / 0.55)",
  3: "rgb(var(--olive-rgb) / 0.80)",
  4: "var(--olive-deep)",
};

function chunkWeeks(days: HeatDay[]): HeatDay[][] {
  const weeks: HeatDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function valueFor(d: HeatDay, metric: HeatMetric): number {
  return metric === "focus" ? d.focusMinutes : d.tasksDone;
}

function prettyDate(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function Heatmap() {
  const sessions = usePlanner((s) => s.sessions);
  const tasks = usePlanner((s) => s.tasks);

  const [metric, setMetric] = useState<HeatMetric>("focus");
  const [selected, setSelected] = useState<HeatDay | null>(null);

  const today = useMemo(() => new Date(), []);
  const days = useMemo(
    () => buildHeatmap(sessions, tasks, WEEKS, today),
    [sessions, tasks, today],
  );
  const weeks = useMemo(() => chunkWeeks(days), [days]);
  const max = useMemo(
    () => days.reduce((m, d) => Math.max(m, valueFor(d, metric)), 0),
    [days, metric],
  );
  const streak = useMemo(() => computeStreak(days, today), [days, today]);

  return (
    <div className="border hairline bg-cream-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="label text-espresso">Consistency</span>
        <div className="inline-flex border hairline text-xs">
          {(["focus", "tasks"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-2.5 py-1 capitalize transition-colors ${
                metric === m
                  ? "bg-espresso text-cream-raised"
                  : "text-coffee hover:text-espresso"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto flex lg:justify-center py-1">
        <div className="flex gap-[3px] shrink-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px] shrink-0">
              {week.map((d) => {
                const v = valueFor(d, metric);
                const isSelected = selected?.date === d.date;
                return (
                  <button
                    key={d.date}
                    onClick={() => setSelected(isSelected ? null : d)}
                    title={`${prettyDate(d.date)} · ${d.focusMinutes}m focus · ${d.tasksDone} task${d.tasksDone === 1 ? "" : "s"}`}
                    aria-label={`${prettyDate(d.date)}: ${d.focusMinutes} focus minutes, ${d.tasksDone} tasks`}
                    className={`h-3 w-3 shrink-0 transition-colors ${
                      isSelected ? "ring-1 ring-espresso ring-offset-1 ring-offset-cream-raised" : ""
                    }`}
                    style={{ backgroundColor: CELL_COLOR[intensity(v, max)] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-coffee">
          {streak > 0 ? (
            <>
              <span className="font-display font-bold text-espresso">{streak}</span>
              {`-day streak`}
            </>
          ) : (
            "No active streak yet"
          )}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-coffee">
          less
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5"
              style={{ backgroundColor: CELL_COLOR[i] }}
              aria-hidden
            />
          ))}
          more
        </span>
      </div>

      {selected && (
        <div className="mt-3 border-t hairline pt-3 text-sm text-espresso">
          <span className="label text-coffee">{prettyDate(selected.date)}</span>
          <span className="ml-3">{selected.focusMinutes}m focused</span>
          <span className="ml-3">
            {selected.tasksDone} task{selected.tasksDone === 1 ? "" : "s"} done
          </span>
        </div>
      )}
    </div>
  );
}
