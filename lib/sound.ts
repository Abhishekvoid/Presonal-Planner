"use client";

import { useEffect, useState } from "react";

/**
 * Optional interface sound cues — synth only (no assets), off by default.
 * `playStamp` is a soft percussive "ink stamp" on task completion; `playTurn`
 * a low tone on view change. The module-level `enabled` flag is the source of
 * truth for the play fns so callers (TaskItem, Planner) don't need the store;
 * `useSfx` hydrates it from localStorage and exposes the toggle.
 */

const SFX_KEY = "planner-sfx";
let enabled = false;
let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isSfxEnabled(): boolean {
  return enabled;
}

/** Soft percussive "ink stamp" — a quick low thud with a tiny click. */
export function playStamp(): void {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const o = ac.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(72, t + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.18);
}

/** Low tone on view change — like turning a page. */
export function playTurn(): void {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const o = ac.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(210, t + 0.18);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.24);
}

export function useSfx() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      enabled = localStorage.getItem(SFX_KEY) === "1";
    } catch {}
    setOn(enabled);
  }, []);

  const setEnabled = (v: boolean) => {
    enabled = v;
    try {
      localStorage.setItem(SFX_KEY, v ? "1" : "0");
    } catch {}
    setOn(v);
    if (v) ensureCtx(); // unlock/resume audio within the enabling click gesture
  };

  return { enabled: on, setEnabled };
}
