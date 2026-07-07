"use client";

import { useMemo } from "react";
import { usePlanner } from "@/lib/store";
import { localDateKey, isoToDateKey, yesterdayKey } from "@/lib/focus";
import { FocusSession, Task, Day, Track } from "@/lib/types";

export function StudyHistory() {
  const state = usePlanner();
  const { sessions, tasks, days, tracks } = state;

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => localDateKey(today), [today]);
  const yesterdayKeyStr = useMemo(() => yesterdayKey(today), [today]);

  // Format YYYY-MM-DD to readable date like "Tuesday, July 7, 2026"
  const formatDateLabel = (dateStr: string) => {
    if (dateStr === todayKey) return "Today";
    if (dateStr === yesterdayKeyStr) return "Yesterday";

    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;

    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Group sessions and completed tasks by calendar date
  const historyByDate = useMemo(() => {
    const datesSet = new Set<string>();

    // Collect dates from sessions
    sessions.forEach((s) => {
      if (s.date) datesSet.add(s.date);
    });

    // Collect dates from completed tasks
    tasks.forEach((t) => {
      if (t.done && t.doneAt) {
        const key = isoToDateKey(t.doneAt);
        if (key) datesSet.add(key);
      }
    });

    // Sort dates in reverse chronological order
    const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateStr) => {
      // Find sessions on this date
      const dateSessions = sessions.filter((s) => s.date === dateStr);

      // Find tasks completed on this date
      const dateCompletedTasks = tasks.filter((t) => {
        if (!t.done || !t.doneAt) return false;
        return isoToDateKey(t.doneAt) === dateStr;
      });

      const totalMinutes = dateSessions.reduce((sum, s) => sum + s.minutes, 0);

      return {
        date: dateStr,
        label: formatDateLabel(dateStr),
        sessions: dateSessions,
        completedTasks: dateCompletedTasks,
        totalMinutes,
      };
    });
  }, [sessions, tasks, todayKey, yesterdayKeyStr]);

  if (historyByDate.length === 0) {
    return (
      <div className="border border-coffee/15 bg-cream-base/10 rounded-sm p-8 text-center">
        <span className="text-2xl mb-2 block select-none">📚</span>
        <h3 className="font-display text-sm font-bold text-espresso uppercase tracking-wider">
          No Study Logs Yet
        </h3>
        <p className="text-xs text-coffee mt-1.5 max-w-xs mx-auto">
          Start a Pomodoro focus block or complete tasks in your planner to log your progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-coffee/15 pb-2">
        <h2 className="font-display text-xs uppercase tracking-widest font-bold text-coffee">
          Study Log & Activity
        </h2>
        <span className="text-[10px] font-mono text-coffee-soft">
          {historyByDate.length} days of activity logged
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {historyByDate.map((dayGroup) => (
          <div
            key={dayGroup.date}
            className="border border-coffee/15 bg-cream-base/10 hover:border-coffee/30 hover:bg-cream-base/20 transition-all p-4 rounded-sm flex flex-col gap-3.5"
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-coffee/10 pb-2.5">
              <span className="font-display text-[13px] font-bold uppercase tracking-wider text-espresso">
                {dayGroup.label}
              </span>
              <div className="flex items-center gap-2">
                {dayGroup.totalMinutes > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-coffee/20 bg-coffee/5 text-[10px] font-mono text-espresso font-bold rounded-sm">
                    ⏱️ {dayGroup.totalMinutes}m focused
                  </span>
                )}
                {dayGroup.completedTasks.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-olive/35 bg-olive/[0.04] text-[10px] font-mono text-olive-deep font-bold rounded-sm">
                    ✓ {dayGroup.completedTasks.length} task{dayGroup.completedTasks.length > 1 ? "s" : ""} done
                  </span>
                )}
              </div>
            </div>

            {/* Content Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Focus Sessions Column */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-extrabold text-coffee-soft tracking-wider block">
                  Focus Blocks ({dayGroup.sessions.length})
                </span>
                {dayGroup.sessions.length === 0 ? (
                  <p className="text-[11px] text-coffee-soft italic">No focus blocks recorded on this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayGroup.sessions.map((s) => {
                      const matchedTask = tasks.find((t) => t.id === s.taskId);
                      const taskText = matchedTask?.text ?? "General study block";
                      const dayObj = matchedTask?.dayId ? days.find((d) => d.id === matchedTask.dayId) : null;
                      const trackObj = matchedTask?.trackId ? tracks.find((t) => t.id === matchedTask.trackId) : null;

                      return (
                        <div
                          key={s.id}
                          className="flex items-start gap-2 bg-cream-base/20 border border-coffee/5 p-2 rounded-sm"
                        >
                          <span className="text-coffee-soft mt-0.5 text-xs">⏱️</span>
                          <div className="flex-grow min-w-0 space-y-1">
                            <p className="text-[11.5px] font-mono text-espresso leading-normal break-words">
                              {taskText}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[9.5px] font-mono font-bold text-coffee-soft">
                                {s.minutes} mins
                              </span>
                              {dayObj && (
                                <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-coffee/10 text-espresso rounded-sm">
                                  Day {dayObj.index}
                                </span>
                              )}
                              {trackObj && (
                                <span
                                  className="px-1 py-0.2 text-[8px] font-mono font-bold border rounded-sm uppercase"
                                  style={{
                                    borderColor: `${trackObj.accent}35`,
                                    backgroundColor: `${trackObj.accent}08`,
                                    color: trackObj.accent,
                                  }}
                                >
                                  {trackObj.tag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Completed Tasks Column */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-extrabold text-coffee-soft tracking-wider block">
                  Completed Tasks ({dayGroup.completedTasks.length})
                </span>
                {dayGroup.completedTasks.length === 0 ? (
                  <p className="text-[11px] text-coffee-soft italic">No tasks completed on this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayGroup.completedTasks.map((t) => {
                      const dayObj = t.dayId ? days.find((d) => d.id === t.dayId) : null;
                      const trackObj = tracks.find((tr) => tr.id === t.trackId);

                      return (
                        <div
                          key={t.id}
                          className="flex items-start justify-between gap-3 bg-cream-base/20 border border-coffee/5 p-2 rounded-sm"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-emerald-500 font-bold text-[11px] mt-0.5">✓</span>
                            <div className="min-w-0">
                              <p className="text-[11.5px] font-mono text-coffee-soft line-through leading-normal break-words">
                                {t.text}
                              </p>
                              {dayObj && (
                                <span className="inline-block mt-1 px-1 py-0.2 text-[8px] font-mono font-bold bg-coffee/10 text-espresso rounded-sm">
                                  Day {dayObj.index}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {trackObj && (
                              <span
                                className="px-1 py-0.2 text-[8.5px] font-mono font-bold border rounded-sm uppercase tracking-wide"
                                style={{
                                  borderColor: `${trackObj.accent}35`,
                                  backgroundColor: `${trackObj.accent}08`,
                                  color: trackObj.accent,
                                }}
                              >
                                {trackObj.tag}
                              </span>
                            )}
                            {t.difficulty && (
                              <span
                                className={`px-1 py-0.2 rounded-sm text-[8px] font-mono font-bold ${
                                  t.difficulty === "easy"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : t.difficulty === "med"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {t.difficulty === "easy"
                                  ? "Easy"
                                  : t.difficulty === "med"
                                  ? "Medium"
                                  : "Hard"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
