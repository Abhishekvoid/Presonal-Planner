import { Day, PlannerState, Task, Track } from "./types";

export interface Progress {
  done: number;
  total: number;
  pct: number;
}

export function progressOf(tasks: Task[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function tasksForDay(state: PlannerState, dayId: string): Task[] {
  return state.tasks
    .filter((t) => t.dayId === dayId)
    .sort((a, b) => a.order - b.order);
}

export function tasksForDayAndTrack(
  state: PlannerState,
  dayId: string,
  trackId: string,
): Task[] {
  return tasksForDay(state, dayId).filter((t) => t.trackId === trackId);
}

export function dayProgress(state: PlannerState, dayId: string): Progress {
  return progressOf(tasksForDay(state, dayId));
}

export function trackProgress(state: PlannerState, trackId: string): Progress {
  return progressOf(state.tasks.filter((t) => t.trackId === trackId));
}

export function tasksForTrack(state: PlannerState, trackId: string): Task[] {
  return state.tasks
    .filter((t) => t.trackId === trackId)
    .sort((a, b) => a.order - b.order);
}

export function orderedDays(state: PlannerState): Day[] {
  return [...state.days].sort((a, b) => a.order - b.order);
}

export function orderedTracks(state: PlannerState): Track[] {
  return [...state.tracks].sort((a, b) => a.order - b.order);
}

export function overallProgress(state: PlannerState): Progress {
  return progressOf(state.tasks);
}
