"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed } from "./seed";
import {
  ActiveTimer,
  Day,
  DEFAULT_FOCUS_SETTINGS,
  FocusSession,
  FocusSettings,
  PlannerState,
  Reflection,
  SCHEMA_VERSION,
  Task,
  TimerMode,
  Track,
} from "./types";
import { focusedMinutes, localDateKey } from "./focus";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

interface PlannerStore extends PlannerState {
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // tasks
  toggleTask: (id: string) => void;
  addTask: (input: Omit<Task, "id" | "done" | "order">) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;

  // days
  addDay: (input: Omit<Day, "id" | "order">) => string;
  updateDay: (id: string, patch: Partial<Omit<Day, "id">>) => void;
  deleteDay: (id: string) => void;

  // tracks
  addTrack: (input: Omit<Track, "id" | "order">) => void;
  updateTrack: (id: string, patch: Partial<Omit<Track, "id">>) => void;
  deleteTrack: (id: string) => void;

  // focus — timer
  startTimer: (taskId: string | null, mode?: TimerMode) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeSession: () => void;
  updateFocusSettings: (patch: Partial<FocusSettings>) => void;

  // focus — reflection
  upsertReflection: (date: string, patch: Partial<Omit<Reflection, "date">>) => void;

  // data management
  exportState: () => PlannerState;
  importState: (data: PlannerState, mode: "replace") => void;
  resetToSeed: () => void;
}

/** Log the current work block as a session (full or partial). Breaks never log. */
function logIfWork(s: PlannerStore): FocusSession[] {
  const t = s.activeTimer;
  if (!t || t.mode !== "work") return s.sessions;
  const minutes = focusedMinutes(t, Date.now());
  if (minutes <= 0) return s.sessions;
  const session: FocusSession = {
    id: uid("ses"),
    taskId: t.taskId,
    date: localDateKey(new Date(t.startedAt)),
    startedAt: t.startedAt,
    endedAt: new Date().toISOString(),
    minutes,
  };
  return [...s.sessions, session];
}

const seed = buildSeed();

export const usePlanner = create<PlannerStore>()(
  persist(
    (set, get) => ({
      ...seed,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined }
              : t,
          ),
        })),

      addTask: (input) =>
        set((s) => {
          const siblings = s.tasks.filter(
            (t) => t.dayId === input.dayId && t.trackId === input.trackId,
          );
          return {
            tasks: [
              ...s.tasks,
              { ...input, id: uid("task"), done: false, order: siblings.length },
            ],
          };
        }),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addDay: (input) => {
        const id = uid("day");
        set((s) => ({ days: [...s.days, { ...input, id, order: s.days.length }] }));
        return id;
      },

      updateDay: (id, patch) =>
        set((s) => ({
          days: s.days.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      deleteDay: (id) =>
        set((s) => ({
          days: s.days.filter((d) => d.id !== id),
          tasks: s.tasks.filter((t) => t.dayId !== id),
        })),

      addTrack: (input) =>
        set((s) => ({
          tracks: [...s.tracks, { ...input, id: uid("track"), order: s.tracks.length }],
        })),

      updateTrack: (id, patch) =>
        set((s) => ({
          tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTrack: (id) =>
        set((s) => ({
          tracks: s.tracks.filter((t) => t.id !== id),
          tasks: s.tasks.filter((t) => t.trackId !== id),
        })),

      /* ---------- focus: timer ---------- */

      startTimer: (taskId, mode = "work") =>
        set((s) => {
          const plannedMin =
            mode === "work" ? s.focusSettings.workMin : s.focusSettings.breakMin;
          const timer: ActiveTimer = {
            taskId,
            mode,
            startedAt: new Date().toISOString(),
            plannedSec: Math.max(1, plannedMin) * 60,
            pausedAccumMs: 0,
            pausedAt: null,
          };
          return { activeTimer: timer };
        }),

      pauseTimer: () =>
        set((s) => {
          if (!s.activeTimer || s.activeTimer.pausedAt) return {};
          return { activeTimer: { ...s.activeTimer, pausedAt: new Date().toISOString() } };
        }),

      resumeTimer: () =>
        set((s) => {
          const t = s.activeTimer;
          if (!t || !t.pausedAt) return {};
          const pausedSpan = Date.now() - new Date(t.pausedAt).getTime();
          return {
            activeTimer: {
              ...t,
              pausedAccumMs: t.pausedAccumMs + Math.max(0, pausedSpan),
              pausedAt: null,
            },
          };
        }),

      // Stop early: log the partial work block, then clear the timer.
      resetTimer: () =>
        set((s) => ({ sessions: logIfWork(s), activeTimer: null })),

      // Block finished naturally: log work, then advance work -> break -> idle.
      completeSession: () =>
        set((s) => {
          const t = s.activeTimer;
          if (!t) return {};
          const sessions = logIfWork(s);
          if (t.mode === "work") {
            const breakMin = Math.max(1, s.focusSettings.breakMin);
            return {
              sessions,
              activeTimer: {
                taskId: t.taskId,
                mode: "break",
                startedAt: new Date().toISOString(),
                plannedSec: breakMin * 60,
                pausedAccumMs: 0,
                pausedAt: null,
              },
            };
          }
          return { sessions, activeTimer: null };
        }),

      updateFocusSettings: (patch) =>
        set((s) => ({ focusSettings: { ...s.focusSettings, ...patch } })),

      /* ---------- focus: reflection ---------- */

      upsertReflection: (date, patch) =>
        set((s) => {
          const existing = s.reflections.find((r) => r.date === date);
          const next: Reflection = {
            date,
            did: existing?.did ?? "",
            blockers: existing?.blockers ?? "",
            oneThing: existing?.oneThing ?? "",
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          return {
            reflections: [
              ...s.reflections.filter((r) => r.date !== date),
              next,
            ],
          };
        }),

      /* ---------- data management ---------- */

      exportState: () => {
        const { tracks, days, tasks, sessions, reflections, focusSettings } = get();
        return {
          version: SCHEMA_VERSION,
          tracks,
          days,
          tasks,
          sessions,
          reflections,
          focusSettings,
          activeTimer: null,
        };
      },

      importState: (data) =>
        set(() => ({
          version: data.version ?? SCHEMA_VERSION,
          tracks: data.tracks ?? [],
          days: data.days ?? [],
          tasks: data.tasks ?? [],
          sessions: data.sessions ?? [],
          reflections: data.reflections ?? [],
          focusSettings: data.focusSettings ?? { ...DEFAULT_FOCUS_SETTINGS },
          activeTimer: null,
        })),

      resetToSeed: () => {
        const fresh = buildSeed();
        set({
          version: fresh.version,
          tracks: fresh.tracks,
          days: fresh.days,
          tasks: fresh.tasks,
          sessions: fresh.sessions,
          reflections: fresh.reflections,
          focusSettings: fresh.focusSettings,
          activeTimer: null,
        });
      },
    }),
    {
      name: "goals-learning-planner",
      version: SCHEMA_VERSION,
      // Backfill focus fields for any v1 blob so the bump never wipes data.
      migrate: (persisted, fromVersion) => {
        const p = (persisted ?? {}) as Partial<PlannerState>;
        if (fromVersion < 2) {
          return {
            ...p,
            sessions: p.sessions ?? [],
            reflections: p.reflections ?? [],
            focusSettings: p.focusSettings ?? { ...DEFAULT_FOCUS_SETTINGS },
            activeTimer: p.activeTimer ?? null,
          } as PlannerState;
        }
        return p as PlannerState;
      },
      partialize: (s) => ({
        version: s.version,
        tracks: s.tracks,
        days: s.days,
        tasks: s.tasks,
        sessions: s.sessions,
        reflections: s.reflections,
        focusSettings: s.focusSettings,
        activeTimer: s.activeTimer,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Defensive backfill in case an older blob slipped through.
          state.sessions ??= [];
          state.reflections ??= [];
          state.focusSettings ??= { ...DEFAULT_FOCUS_SETTINGS };
          // Drop a timer that points at a deleted task — keep it valid.
          if (state.activeTimer?.taskId) {
            const exists = state.tasks.some((t) => t.id === state.activeTimer!.taskId);
            if (!exists) state.activeTimer = { ...state.activeTimer, taskId: null };
          }
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
