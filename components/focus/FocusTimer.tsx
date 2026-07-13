"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePlanner } from "@/lib/store";
import { TimerMode } from "@/lib/types";
import { formatClock, remainingSec } from "@/lib/focus";
import { Button, Modal } from "@/components/primitives";
import { TaskPicker } from "./TaskPicker";
import { ProgressRing } from "./ProgressRing";
import { ZenMode } from "./ZenMode";
import { useToast } from "@/components/system/Toaster";
import { useCelebrate } from "@/components/system/Celebration";

// WebGL halo loads client-only; the timer stays fully usable without it.
const FocusHalo = dynamic(() => import("@/components/webgl/FocusHalo"), { ssr: false });

/** Short WebAudio double-tone chime — no asset file, gated behind the Start gesture. */
function playChime(ref: React.MutableRefObject<AudioContext | null>) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ref.current) ref.current = new Ctx();
    const ctx = ref.current;
    
    // First tone (G4)
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.connect(g1);
    g1.connect(ctx.destination);
    o1.type = "sine";
    o1.frequency.value = 392; // G4
    g1.gain.setValueAtTime(0.0001, ctx.currentTime);
    g1.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
    g1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o1.start();
    o1.stop(ctx.currentTime + 0.4);

    // Second tone (C5)
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2);
    g2.connect(ctx.destination);
    o2.type = "sine";
    o2.frequency.value = 523.25; // C5
    g2.gain.setValueAtTime(0.0001, ctx.currentTime + 0.15);
    g2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.2);
    g2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o2.start(ctx.currentTime + 0.15);
    o2.stop(ctx.currentTime + 0.65);
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

function sendNotification(mode: TimerMode) {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      const title = mode === "work" ? "Focus session complete!" : "Break is over!";
      const body = mode === "work" ? "Time to rest and take a break." : "Time to get back to work!";
      new Notification(title, { body, silent: true });
    }
  }
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
  const startFlowTimer = usePlanner((s) => s.startFlowTimer);
  const endFlowTimer = usePlanner((s) => s.endFlowTimer);
  const updateFocusSettings = usePlanner((s) => s.updateFocusSettings);
  const tasks = usePlanner((s) => s.tasks);
  const { toast } = useToast();
  const celebrate = useCelebrate();

  const [, setTick] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [zenOpen, setZenOpen] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const completedAnchor = useRef<string | null>(null);
  const [completionModal, setCompletionModal] = useState<{ mode: TimerMode } | null>(null);

  const running = !!activeTimer && !activeTimer.pausedAt;
  const paused = !!activeTimer?.pausedAt;
  const isFlow = activeTimer?.mode === "flow";

  // For Pomodoro modes: time remaining. For Flow: elapsed time counting up.
  const remaining = activeTimer
    ? remainingSec(activeTimer, Date.now())
    : settings.workMin * 60;
  const flowElapsed = activeTimer && isFlow
    ? (() => {
        const startMs = new Date(activeTimer.startedAt).getTime();
        const pausedMs = activeTimer.pausedAccumMs +
          (activeTimer.pausedAt ? Date.now() - new Date(activeTimer.pausedAt).getTime() : 0);
        return Math.max(0, Math.floor((Date.now() - startMs - pausedMs) / 1000));
      })()
    : 0;

  const requestPermission = () => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  // Re-render ~4x/sec while running; the displayed value is derived from the clock.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  // Completion: fires once per block when the clock reaches zero. Not fired for flow (no end).
  useEffect(() => {
    if (!activeTimer || activeTimer.pausedAt || remaining > 0) return;
    if (isFlow) return; // flow never completes automatically
    if (completedAnchor.current === activeTimer.startedAt) return;
    completedAnchor.current = activeTimer.startedAt;
    if (!muted) playChime(audioRef);
    flashTitle(activeTimer.mode);
    sendNotification(activeTimer.mode);
    if (activeTimer.mode === "work") {
      celebrate();
      toast({ tone: "success", title: "Focus block complete", desc: `${settings.workMin}m logged. Time to breathe.` });
    }
    setCompletionModal({ mode: activeTimer.mode });
    completeSession();
  }, [remaining, activeTimer, isFlow, muted, completeSession, celebrate, toast, settings.workMin]);

  const selectedTaskId = activeTimer ? activeTimer.taskId : taskId;
  const taskLabel = tasks.find((t) => t.id === selectedTaskId)?.text ?? null;
  const mode: TimerMode = activeTimer?.mode ?? "work";

  // Session progress (0..1) drives the halo's density/tightening.
  const totalSec = (mode === "work" ? settings.workMin : settings.breakMin) * 60;
  const progress = activeTimer
    ? Math.max(0, Math.min(1, 1 - remaining / totalSec))
    : 0;

  const start = () => {
    completedAnchor.current = null;
    startTimer(taskId, "work");
    requestPermission();
  };

  const enterZen = () => {
    if (!activeTimer) start();
    setZenOpen(true);
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
      <div className="relative flex flex-col items-center px-4 py-9">
        <FocusHalo
          className="absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2"
          progress={progress}
          running={running}
          paused={paused}
          active={!!activeTimer}
          mode={mode}
        />
        <ProgressRing progress={progress} mode={mode} running={running} isFlow={isFlow} size={248} stroke={6}>
          <div className="font-display text-[3.4rem] sm:text-[4rem] leading-none font-extrabold tracking-tightest tabular-nums text-espresso">
            {isFlow ? formatClock(flowElapsed) : formatClock(remaining)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${running ? "animate-pulse" : ""}`}
              style={{ backgroundColor: isFlow ? "var(--flow)" : mode === "work" ? "var(--olive)" : "var(--clay)" }}
              aria-hidden
            />
            <span className="label" style={{ color: isFlow ? "var(--flow)" : undefined }}>
              {isFlow ? "Flow" : mode === "work" ? "Focus" : "Break"}
              {paused && " · paused"}
            </span>
          </div>
          {isFlow && running && (
            <span className="mt-1 text-[10px] font-mono text-coffee-soft">{Math.floor(flowElapsed / 60)}m deep</span>
          )}
        </ProgressRing>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t hairline px-4 py-3">
        <Button variant="ghost" onClick={enterZen} className="!px-3" aria-label="Enter fullscreen focus space">
          ⛶ Zen
        </Button>
        {!activeTimer && (
          <>
            <Button variant="solid" onClick={start}>
              Start focus
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                completedAnchor.current = null;
                startFlowTimer(taskId);
                requestPermission();
              }}
              className="border-[var(--flow)] text-[var(--flow)] hover:bg-[var(--flow)]/10"
            >
              ⚡ Flow
            </Button>
          </>
        )}
        {running && !isFlow && (
          <>
            <Button variant="outline" onClick={pauseTimer}>
              Pause
            </Button>
            <Button variant="ghost" onClick={resetTimer}>
              Reset
            </Button>
          </>
        )}
        {running && isFlow && (
          <>
            <Button variant="outline" onClick={pauseTimer}>
              Pause
            </Button>
            <Button
              variant="solid"
              onClick={() => {
                endFlowTimer();
              }}
              className="bg-[var(--flow)] hover:opacity-90 border-0 text-white"
            >
              End Flow
            </Button>
          </>
        )}
        {paused && !isFlow && (
          <>
            <Button
              variant="solid"
              onClick={() => {
                resumeTimer();
                requestPermission();
              }}
            >
              Resume
            </Button>
            <Button variant="ghost" onClick={resetTimer}>
              Reset
            </Button>
          </>
        )}
        {paused && isFlow && (
          <>
            <Button
              variant="solid"
              onClick={() => {
                resumeTimer();
                requestPermission();
              }}
            >
              Resume Flow
            </Button>
            <Button
              variant="ghost"
              onClick={() => endFlowTimer()}
            >
              End & Save
            </Button>
          </>
        )}
      </div>

      {/* Timer Completion Modal */}
      <Modal
        open={!!completionModal}
        onClose={() => setCompletionModal(null)}
        title={completionModal?.mode === "work" ? "Focus block complete" : "Break complete"}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-coffee">
            {completionModal?.mode === "work"
              ? "Excellent work. You've completed your focus session. Time to rest your eyes, stand up, and take a breather."
              : "Your break is finished. Ready to focus again and build on your streak?"}
          </p>
          <div className="flex justify-end gap-2 border-t hairline pt-4">
            <Button variant="ghost" onClick={() => setCompletionModal(null)}>
              Dismiss
            </Button>
            {completionModal?.mode === "work" ? (
              <Button
                variant="solid"
                onClick={() => {
                  setCompletionModal(null);
                  startTimer(taskId, "break");
                  requestPermission();
                }}
              >
                Start break
              </Button>
            ) : (
              <Button
                variant="solid"
                onClick={() => {
                  setCompletionModal(null);
                  startTimer(taskId, "work");
                  requestPermission();
                }}
              >
                Start focus
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Fullscreen zen focus space */}
      <ZenMode
        open={zenOpen}
        onClose={() => setZenOpen(false)}
        display={isFlow ? formatClock(flowElapsed) : formatClock(remaining)}
        progress={progress}
        mode={mode}
        isFlow={isFlow}
        running={running}
        paused={paused}
        hasTimer={!!activeTimer}
        taskLabel={taskLabel}
        controls={{
          start,
          pause: pauseTimer,
          resume: () => {
            resumeTimer();
            requestPermission();
          },
          reset: resetTimer,
          endFlow: endFlowTimer,
        }}
      />
    </div>
  );
}
