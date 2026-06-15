"use client";

import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { TimerMode } from "@/lib/types";
import { formatClock, remainingSec } from "@/lib/focus";
import { Button } from "@/components/primitives";

/** Short WebAudio beep — no asset file, gated behind the Start gesture. */
function beep(ref: React.MutableRefObject<AudioContext | null>) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ref.current) ref.current = new Ctx();
    const ctx = ref.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.26);
  } catch {
    /* audio blocked — silent is fine */
  }
}

function flashTitle(finishedMode: TimerMode) {
  const prev = document.title;
  document.title = finishedMode === "work" ? "● Break time" : "● Back to work";
  setTimeout(() => {
    document.title = prev;
  }, 4000);
}

export function FocusTimer() {
  const activeTimer = usePlanner((s) => s.activeTimer);
  const tasks = usePlanner((s) => s.tasks);
  const settings = usePlanner((s) => s.focusSettings);
  const startTimer = usePlanner((s) => s.startTimer);
  const pauseTimer = usePlanner((s) => s.pauseTimer);
  const resumeTimer = usePlanner((s) => s.resumeTimer);
  const resetTimer = usePlanner((s) => s.resetTimer);
  const completeSession = usePlanner((s) => s.completeSession);
  const updateFocusSettings = usePlanner((s) => s.updateFocusSettings);

  const [, setTick] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const completedAnchor = useRef<string | null>(null);

  const running = !!activeTimer && !activeTimer.pausedAt;
  const paused = !!activeTimer?.pausedAt;
  const remaining = activeTimer
    ? remainingSec(activeTimer, Date.now())
    : settings.workMin * 60;

  // Re-render ~4x/sec while running; the displayed value is derived from the clock.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  // Completion: fires once per block when the clock reaches zero.
  useEffect(() => {
    if (!activeTimer || activeTimer.pausedAt || remaining > 0) return;
    if (completedAnchor.current === activeTimer.startedAt) return;
    completedAnchor.current = activeTimer.startedAt;
    if (!muted) beep(audioRef);
    flashTitle(activeTimer.mode);
    completeSession();
  }, [remaining, activeTimer, muted, completeSession]);

  const incompleteTasks = tasks.filter((t) => !t.done);
  const selectedTaskId = activeTimer ? activeTimer.taskId : taskId;
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const mode: TimerMode = activeTimer?.mode ?? "work";

  const start = () => {
    completedAnchor.current = null;
    startTimer(taskId, "work");
  };

  return (
    <div className="border hairline bg-cream-raised">
      {/* Top bar: task + settings */}
      <div className="flex items-center gap-3 border-b hairline px-4 py-2.5">
        <span className="label text-coffee shrink-0">Working on</span>
        {activeTimer ? (
          <span className="truncate text-sm text-espresso">
            {selectedTask ? selectedTask.text : "No specific task"}
          </span>
        ) : (
          <select
            value={taskId ?? ""}
            onChange={(e) => setTaskId(e.target.value || null)}
            className="min-w-0 flex-1 bg-cream-base border hairline px-2 py-1 text-sm text-espresso focus:border-olive focus:outline-none"
          >
            <option value="">No specific task</option>
            {incompleteTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.text.length > 60 ? `${t.text.slice(0, 60)}…` : t.text}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-label="Timer settings"
          className="ml-auto label text-coffee hover:text-espresso transition-colors shrink-0"
        >
          ⚙ {settings.workMin}m
        </button>
      </div>

      {settingsOpen && (
        <div className="flex flex-wrap items-center gap-4 border-b hairline bg-cream-base px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-coffee">
            Work
            <input
              type="number"
              min={1}
              max={120}
              value={settings.workMin}
              onChange={(e) =>
                updateFocusSettings({ workMin: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-16 bg-cream-raised border hairline px-2 py-1 text-espresso focus:border-olive focus:outline-none"
            />
            min
          </label>
          <label className="flex items-center gap-2 text-sm text-coffee">
            Break
            <input
              type="number"
              min={1}
              max={60}
              value={settings.breakMin}
              onChange={(e) =>
                updateFocusSettings({ breakMin: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-16 bg-cream-raised border hairline px-2 py-1 text-espresso focus:border-olive focus:outline-none"
            />
            min
          </label>
          <label className="ml-auto flex items-center gap-2 text-sm text-coffee">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
            />
            Mute chime
          </label>
        </div>
      )}

      {/* Clock */}
      <div className="px-4 py-10 text-center">
        <div className="font-display text-[5rem] leading-none font-extrabold tracking-tightest tabular-nums text-espresso">
          {formatClock(remaining)}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${running ? "animate-pulse" : ""}`}
            style={{ backgroundColor: mode === "work" ? "var(--olive)" : "var(--clay)" }}
            aria-hidden
          />
          <span className="label text-coffee">
            {mode === "work" ? "Focus" : "Break"}
            {paused && " · paused"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t hairline px-4 py-3">
        {!activeTimer && (
          <Button variant="solid" onClick={start}>
            Start focus
          </Button>
        )}
        {running && (
          <>
            <Button variant="outline" onClick={pauseTimer}>
              Pause
            </Button>
            <Button variant="ghost" onClick={resetTimer}>
              Reset
            </Button>
          </>
        )}
        {paused && (
          <>
            <Button variant="solid" onClick={resumeTimer}>
              Resume
            </Button>
            <Button variant="ghost" onClick={resetTimer}>
              Reset
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
