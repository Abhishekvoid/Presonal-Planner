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
  Note,
} from "./types";
import { focusedMinutes, elapsedSec, localDateKey } from "./focus";

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
  assignTimerTask: (taskId: string | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeSession: () => void;
  startFlowTimer: (taskId: string | null) => void;
  endFlowTimer: () => void;
  updateFocusSettings: (patch: Partial<FocusSettings>) => void;

  // focus — reflection
  upsertReflection: (date: string, patch: Partial<Omit<Reflection, "date">>) => void;

  // notes
  addNote: (title: string, content: string, folder?: string | null, taskId?: string | null, dayId?: string | null) => string;
  updateNote: (id: string, patch: Partial<Omit<Note, "id">>) => void;
  deleteNote: (id: string) => void;

  // navigation
  setActiveView: (view: string) => void;
  setActiveNoteId: (id: string | null) => void;

  // data management
  exportState: () => PlannerState;
  importState: (data: PlannerState, mode: "replace") => void;
  resetToSeed: () => void;
}

/** Log the current work or flow block as a session. Breaks never log. */
function logIfWork(s: PlannerStore): FocusSession[] {
  const t = s.activeTimer;
  if (!t || (t.mode !== "work" && t.mode !== "flow")) return s.sessions;
  const elapsed = elapsedSec(t, Date.now());
  const minutes = t.mode === "flow"
    ? Math.round(elapsed / 60)
    : Math.round(Math.min(t.plannedSec, elapsed) / 60);
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

      assignTimerTask: (taskId) =>
        set((s) => (s.activeTimer ? { activeTimer: { ...s.activeTimer, taskId } } : {})),

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

      startFlowTimer: (taskId) =>
        set(() => {
          const timer: ActiveTimer = {
            taskId,
            mode: "flow",
            startedAt: new Date().toISOString(),
            plannedSec: 9_999_999, // effectively infinite — flow runs until manually ended
            pausedAccumMs: 0,
            pausedAt: null,
          };
          return { activeTimer: timer };
        }),

      endFlowTimer: () =>
        set((s) => ({ sessions: logIfWork(s), activeTimer: null })),

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

      addNote: (title, content, folder = null, taskId = null, dayId = null) => {
        const id = uid("nt");
        const newNote: Note = {
          id,
          title,
          content,
          folder: folder || null,
          taskId: taskId || null,
          dayId: dayId || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          notes: [...(s.notes ?? []), newNote],
        }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: (s.notes ?? []).map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
          ),
        })),
      deleteNote: (id) =>
        set((s) => ({
          notes: (s.notes ?? []).filter((n) => n.id !== id),
        })),

      activeView: "today",
      activeNoteId: null,
      setActiveView: (view) => set({ activeView: view }),
      setActiveNoteId: (id) => set({ activeNoteId: id }),

      /* ---------- data management ---------- */

      exportState: () => {
        const { tracks, days, tasks, sessions, reflections, focusSettings, notes, activeView, activeNoteId } = get();
        return {
          version: SCHEMA_VERSION,
          tracks,
          days,
          tasks,
          sessions,
          reflections,
          focusSettings,
          activeTimer: null,
          notes: notes ?? [],
          activeView: activeView ?? "today",
          activeNoteId: activeNoteId ?? null,
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
          notes: data.notes ?? [],
          activeView: data.activeView ?? "today",
          activeNoteId: data.activeNoteId ?? null,
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
          notes: [],
          activeView: "today",
          activeNoteId: null,
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
            notes: p.notes ?? [],
            activeView: p.activeView ?? "today",
            activeNoteId: p.activeNoteId ?? null,
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
        notes: s.notes ?? [],
        activeView: s.activeView ?? "today",
        activeNoteId: s.activeNoteId ?? null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Defensive backfill in case an older blob slipped through.
          state.sessions ??= [];
          state.reflections ??= [];
          state.focusSettings ??= { ...DEFAULT_FOCUS_SETTINGS };
          state.notes ??= [];
          state.activeView ??= "today";
          state.activeNoteId ??= null;
          
          // Backfill track accents to apply high-contrast colors (e.g. system design to var(--slate))
          state.tracks = (state.tracks ?? []).map((t) => {
            if (t.id === "track-sys" && t.accent === "var(--espresso)") {
              return { ...t, accent: "var(--slate)" };
            }
            return t;
          });

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
