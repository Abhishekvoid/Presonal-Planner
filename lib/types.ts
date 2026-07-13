export type Difficulty = "easy" | "med" | "hard";

export interface Track {
  id: string;
  name: string;
  /** short uppercase tag, e.g. "DSA" */
  tag: string;
  /** CSS color used as the track accent */
  accent: string;
  order: number;
}

export interface Task {
  id: string;
  trackId: string;
  /** scheduled day id; null = backlog */
  dayId: string | null;
  text: string;
  difficulty?: Difficulty;
  tip?: string;
  done: boolean;
  doneAt?: string;
  order: number;
}

export interface Day {
  id: string;
  index: number;
  date: string;
  title: string;
  goal: string;
  must: string;
  result: string;
  notes?: string;
  /** distilled end-of-day revision / summary (markdown) */
  revision?: string;
  /** ISO timestamp of last edit; used to merge local vs Neon on hydrate */
  updatedAt?: string;
  order: number;
}

/* ---------- Focus feature ---------- */

export interface FocusSession {
  id: string;
  /** optional link to a study task */
  taskId: string | null;
  /** "YYYY-MM-DD" local — the heatmap aggregation key (= startedAt local date) */
  date: string;
  startedAt: string;
  endedAt: string;
  /** minutes actually focused in this work block */
  minutes: number;
}

export interface Reflection {
  /** "YYYY-MM-DD" local — one reflection per day (keyed, upserted) */
  date: string;
  did: string;
  blockers: string;
  oneThing: string;
  updatedAt: string;
}

export interface FocusSettings {
  workMin: number;
  breakMin: number;
}

export type TimerMode = "work" | "break" | "flow";

/** Running timer — persisted so a Pomodoro survives a page reload. */
export interface ActiveTimer {
  taskId: string | null;
  mode: TimerMode;
  /** wall-clock anchor; remaining time is recomputed from this, never tick-counted */
  startedAt: string;
  plannedSec: number;
  pausedAccumMs: number;
  /** set while paused, null while running */
  pausedAt: string | null;
}

export const DEFAULT_FOCUS_SETTINGS: FocusSettings = { workMin: 25, breakMin: 5 };

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string | null;
  taskId?: string | null;
  dayId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannerState {
  version: number;
  tracks: Track[];
  days: Day[];
  tasks: Task[];
  sessions: FocusSession[];
  reflections: Reflection[];
  focusSettings: FocusSettings;
  activeTimer: ActiveTimer | null;
  notes: Note[];
  /**
   * Generic synced key/value bag for small pieces of user state that used to
   * live in raw localStorage (per-day checklist toggles, gamification counters,
   * STAR stories, quiz score, cycle-start). Round-trips to Neon via /api/sync.
   * Device-only prefs (theme, sound, ambience) are intentionally NOT here.
   */
  kv: Record<string, string>;
  activeView?: string;
  activeNoteId?: string | null;
  codeTheme?: "editorial" | "midnight";
}

export const SCHEMA_VERSION = 2;
