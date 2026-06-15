"use client";

import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { TimerMode } from "@/lib/types";
import { formatClock, remainingSec } from "@/lib/focus";
import { Button } from "@/components/primitives";
import { TaskPicker } from "./TaskPicker";

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

function DurationRow({
  label,
  value,
  presets,
  min,
  max,
  onPick,
}: {
  label: string;
  value: number;
  presets: number[];
  min: number;
  max: number;
  onPick: (n: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n || min));
  return (
    <div>
      <div className="label text-coffee mb-1.5">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
              value === p
                ? "bg-espresso text-cream-raised"
                : "border border-coffee/30 text-coffee hover:border-coffee/60 hover:text-espresso"
            }`}
          >
            {p}m
          </button>
        ))}
        <span className="mx-0.5 text-xs text-coffee/50">or</span>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onPick(clamp(Number(e.target.value)))}
          aria-label={`${label} custom minutes`}
          className="w-16 rounded-md border border-coffee/30 bg-cream-raised px-2 py-1 text-sm text-espresso focus:border-olive focus:outline-none"
        />
        <span className="text-xs text-coffee">min</span>
      </div>
    </div>
  );
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
  const settings = usePlanner((s) => s.focusSettings);
  const startTimer = usePlanner((s) => s.startTimer);
  const assignTimerTask = usePlanner((s) => s.assignTimerTask);
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

  const selectedTaskId = activeTimer ? activeTimer.taskId : taskId;
  const mode: TimerMode = activeTimer?.mode ?? "work";

  const start = () => {
    completedAnchor.current = null;
    startTimer(taskId, "work");
  };

  return (
    <div className="border hairline bg-cream-raised">
      {/* Top bar: label + customize on one row, full-width task picker below */}
      <div className="space-y-2 border-b hairline px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="label text-coffee">Working on</span>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-coffee/30 px-2.5 py-1.5 text-xs font-medium text-coffee transition-colors hover:border-coffee/60 hover:text-espresso"
          >
            <span aria-hidden>⚙</span>
            <span>
              {settings.workMin}m focus · {settings.breakMin}m break
            </span>
            <span
              className={`transition-transform ${settingsOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▾
            </span>
          </button>
        </div>
        <TaskPicker
          value={selectedTaskId}
          onChange={(id) => {
            setTaskId(id);
            if (activeTimer) assignTimerTask(id);
          }}
        />
      </div>

      {settingsOpen && (
        <div className="space-y-4 border-b hairline bg-cream-base px-4 py-4">
          <DurationRow
            label="Focus length"
            value={settings.workMin}
            presets={[15, 25, 45, 50]}
            min={1}
            max={120}
            onPick={(n) => updateFocusSettings({ workMin: n })}
          />
          <DurationRow
            label="Break length"
            value={settings.breakMin}
            presets={[5, 10, 15]}
            min={1}
            max={60}
            onPick={(n) => updateFocusSettings({ breakMin: n })}
          />
          <label className="flex items-center gap-2 text-sm text-coffee">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
            />
            Mute the end-of-block chime
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
