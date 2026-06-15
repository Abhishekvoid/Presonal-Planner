import { ActiveTimer, FocusSession, Task } from "./types";

/* ---------- Date helpers (all local, matching the jobs selectors) ---------- */

/** Local "YYYY-MM-DD" key for a Date. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local date key for an ISO datetime string, or "" if unparseable. */
export function isoToDateKey(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : localDateKey(d);
}

/* ---------- Timer math (wall-clock truth, never tick-counting) ---------- */

/** Whole seconds the timer has actually run (excluding paused spans). */
export function elapsedSec(t: ActiveTimer, now: number): number {
  const startedMs = new Date(t.startedAt).getTime();
  const pausedMs =
    t.pausedAccumMs + (t.pausedAt ? now - new Date(t.pausedAt).getTime() : 0);
  return Math.max(0, Math.floor((now - startedMs - pausedMs) / 1000));
}

/** Seconds left in the current block. Clamped at zero. */
export function remainingSec(t: ActiveTimer, now: number): number {
  return Math.max(0, t.plannedSec - elapsedSec(t, now));
}

/** Minutes focused so far — used when logging a full or partial work block. */
export function focusedMinutes(t: ActiveTimer, now: number): number {
  const ran = Math.min(t.plannedSec, elapsedSec(t, now));
  return Math.round(ran / 60);
}

/** "MM:SS" for display. */
export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- Heatmap aggregation ---------- */

export interface HeatDay {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  tasksDone: number;
}

/**
 * One HeatDay per day for the last `weeks` weeks, aligned so the grid ends on
 * the week containing `today`. Returned oldest-first; the UI chunks into
 * week-columns. `tasksDone` is derived from task `doneAt` timestamps.
 */
export function buildHeatmap(
  sessions: FocusSession[],
  tasks: Task[],
  weeks: number,
  today: Date,
): HeatDay[] {
  const focusByDate = new Map<string, number>();
  for (const s of sessions) {
    focusByDate.set(s.date, (focusByDate.get(s.date) ?? 0) + s.minutes);
  }

  const tasksByDate = new Map<string, number>();
  for (const t of tasks) {
    if (!t.done || !t.doneAt) continue;
    const key = isoToDateKey(t.doneAt);
    if (key) tasksByDate.set(key, (tasksByDate.get(key) ?? 0) + 1);
  }

  // End on the Saturday of the current week so columns are whole weeks.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  end.setDate(end.getDate() + (6 - end.getDay()));
  const totalDays = weeks * 7;

  const out: HeatDay[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = localDateKey(d);
    out.push({
      date: key,
      focusMinutes: focusByDate.get(key) ?? 0,
      tasksDone: tasksByDate.get(key) ?? 0,
    });
  }
  return out;
}

export type HeatMetric = "focus" | "tasks";

/** Bucket a value into 0..4 intensity steps, scaled to the range's max. */
export function intensity(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

/**
 * Consecutive-day streak ending today (or yesterday — today not yet worked
 * doesn't break a run). A day counts as active if it has focus minutes or a
 * completed task.
 */
export function computeStreak(days: HeatDay[], today: Date): number {
  const active = new Set(
    days.filter((d) => d.focusMinutes > 0 || d.tasksDone > 0).map((d) => d.date),
  );
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // If today isn't active yet, start counting from yesterday.
  if (!active.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(localDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Yesterday's local date key relative to `today`. */
export function yesterdayKey(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}
