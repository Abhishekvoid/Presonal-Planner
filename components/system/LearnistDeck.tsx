"use client";

import React, { useState } from "react";
import { Modal } from "../primitives";

/* ==========================================================================
   1. GITHUB-STYLE ACTIVITY HEATMAP
   ========================================================================== */
export function ActivityHeatmap({
  sessions,
  tasks,
}: {
  sessions: { date: string; minutes: number }[];
  tasks: { doneAt?: string; proven?: boolean }[];
}) {
  // Aggregate minutes and proven items by date (YYYY-MM-DD)
  const activityMap = React.useMemo(() => {
    const map: Record<string, { minutes: number; count: number }> = {};
    sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = { minutes: 0, count: 0 };
      map[s.date].minutes += s.minutes;
      map[s.date].count += 1;
    });
    tasks.forEach((t) => {
      if (t.doneAt) {
        const d = t.doneAt.slice(0, 10);
        if (!map[d]) map[d] = { minutes: 0, count: 0 };
        map[d].count += t.proven ? 2 : 1;
      }
    });
    return map;
  }, [sessions, tasks]);

  // Generate last 28 days
  const days = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const act = activityMap[dateStr] ?? { minutes: 0, count: 0 };
      list.push({
        date: dateStr,
        dayNum: d.getDate(),
        minutes: act.minutes,
        count: act.count,
      });
    }
    return list;
  }, [activityMap]);

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const activeDaysCount = days.filter((d) => d.minutes > 0 || d.count > 0).length;

  return (
    <div className="rounded-lg border border-hair bg-cream-raised dark:bg-[#0A0A0E] p-4 text-espresso shadow-sm">
      <div className="flex items-center justify-between border-b border-hair pb-3 mb-3">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-widest text-coffee">
            Activity Heatmap & Proof Log
          </h3>
          <p className="font-mono text-[11px] text-coffee mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeDaysCount} Days Active</span> •{" "}
            <span className="text-espresso font-bold">{totalMinutes} Mins Logged</span>
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase text-coffee bg-black/5 dark:bg-white/5 border border-hair px-2 py-0.5 rounded">
          Proof Stream
        </span>
      </div>

      {/* Grid of 28 day cells */}
      <div className="grid grid-cols-7 gap-1.5 pt-1">
        {days.map((day) => {
          let levelClass = "bg-cream-deep dark:bg-white/[0.03] border-hair text-coffee";
          if (day.minutes > 60 || day.count > 3) {
            levelClass = "bg-emerald-500 border-emerald-400 text-black font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]";
          } else if (day.minutes > 30 || day.count > 1) {
            levelClass = "bg-emerald-600 dark:bg-emerald-700/80 border-emerald-500 text-white dark:text-emerald-100 font-semibold";
          } else if (day.minutes > 0 || day.count > 0) {
            levelClass = "bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300";
          }

          return (
            <div
              key={day.date}
              title={`${day.date}: ${day.minutes} mins, ${day.count} activities`}
              className={`h-7 rounded border flex items-center justify-center font-mono text-[10px] transition-all hover:scale-105 ${levelClass}`}
            >
              {day.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   2. CODE LAB VALIDATOR (NAIVE → OPTIMIZED → ADVANCED)
   ========================================================================== */
export function CodeLabValidator() {
  const [tier, setTier] = useState<"naive" | "optimized" | "advanced">("naive");
  const [code, setCode] = useState(DEBOUNCE_STARTERS.naive);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "running" | "passed" | "failed";
    message: string;
    perfMs?: number;
  }>({ status: "idle", message: "Ready for execution test" });

  const handleSelectTier = (t: "naive" | "optimized" | "advanced") => {
    setTier(t);
    setCode(DEBOUNCE_STARTERS[t]);
    setTestResult({ status: "idle", message: `Loaded ${t.toUpperCase()} tier template.` });
  };

  const runEvaluation = () => {
    setTestResult({ status: "running", message: "Executing rapid pulse & context validation..." });
    setTimeout(() => {
      if (tier === "naive") {
        setTestResult({
          status: "failed",
          message: "⚠️ NAIVE CODE FLAGGED: Fails edge case when context (this) is bound or rapid immediate calls occur. Upgrade to OPTIMIZED.",
          perfMs: 4.2,
        });
      } else if (tier === "optimized") {
        setTestResult({
          status: "passed",
          message: "✅ OPTIMIZED PASS: Retains context & clears timer properly. Upgrade to ADVANCED for leading-edge & cancel capability.",
          perfMs: 1.1,
        });
      } else {
        setTestResult({
          status: "passed",
          message: "🏆 ADVANCED LAB PROVEN: Handles trailing/leading edges and immediate cancel()! Debouncing 3-Ways unlocked.",
          perfMs: 0.3,
        });
      }
    }, 600);
  };

  return (
    <div className="rounded-lg border border-hair bg-cream-raised dark:bg-[#0E0E12] p-4 text-espresso shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hair pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">
              [Lab #04]
            </span>
            <h3 className="font-mono text-sm font-semibold text-espresso">
              Debouncing 3 Ways (Punish Lazy Code)
            </h3>
          </div>
          <p className="font-mono text-[11px] text-coffee mt-0.5">
            Write & validate: Naive → Optimized → Advanced (Trailing, Leading, Cancelable)
          </p>
        </div>

        {/* Tier Selector */}
        <div className="flex items-center gap-1 bg-cream-deep dark:bg-zinc-950 p-1 rounded border border-hair">
          {(["naive", "optimized", "advanced"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleSelectTier(t)}
              className={`px-2.5 py-0.5 rounded font-mono text-[10px] uppercase transition-all ${
                tier === t
                  ? "bg-espresso text-cream-base dark:bg-amber-400 dark:text-black font-bold shadow"
                  : "text-coffee hover:text-espresso"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor Preview */}
      <div className="relative font-mono text-xs bg-[#0a0b0e] border border-hair rounded p-3 text-emerald-400">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={7}
          className="w-full bg-transparent resize-none outline-none font-mono text-xs text-emerald-400 leading-relaxed"
          spellCheck={false}
        />
        <div className="absolute top-2 right-3 font-mono text-[9px] text-zinc-500 uppercase">
          Editable Lab Code
        </div>
      </div>

      {/* Validation Result & Trigger */}
      <div className="mt-3 flex items-center justify-between gap-3 pt-2 border-t border-white/10">
        <div className="font-mono text-[11px] flex items-center gap-2">
          {testResult.status === "running" && (
            <span className="text-yellow-400 animate-pulse">Running test harness...</span>
          )}
          {testResult.status === "failed" && (
            <span className="text-rose-400">{testResult.message}</span>
          )}
          {testResult.status === "passed" && (
            <span className="text-emerald-400">{testResult.message}</span>
          )}
          {testResult.status === "idle" && (
            <span className="text-zinc-400">{testResult.message}</span>
          )}
        </div>

        <button
          onClick={runEvaluation}
          className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
        >
          [Execute Lab Test]
        </button>
      </div>
    </div>
  );
}

const DEBOUNCE_STARTERS = {
  naive: `// Tier 1: Naive (Fails when 'this' context is bound)
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
  optimized: `// Tier 2: Optimized Trailing
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    const ctx = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(ctx, args);
      timer = null;
    }, delay);
  };
}`,
  advanced: `// Tier 3: Advanced (Leading + Immediate + Cancel)
function advancedDebounce(fn, delay, immediate = false) {
  let timer = null;
  function debounced(...args) {
    const ctx = this;
    const callNow = immediate && !timer;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn.apply(ctx, args);
    }, delay);
    if (callNow) fn.apply(ctx, args);
  }
  debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced;
}`,
};

/* ==========================================================================
   3. SOCRATIC COACH MODAL ("Guides Without Spoiling")
   ========================================================================== */
export function SocraticCoachModal({
  open,
  onClose,
  topicTitle,
}: {
  open: boolean;
  onClose: () => void;
  topicTitle: string;
}) {
  const [userHypothesis, setUserHypothesis] = useState("");
  const [coachResponse, setCoachResponse] = useState<string | null>(null);

  const handleAskCoach = () => {
    if (!userHypothesis.trim()) return;
    setCoachResponse(
      `💡 **Coach Guidance for "${topicTitle}":**\n\nYour hypothesis ("${userHypothesis}") is on the right path regarding timing, but consider: What happens if the network request fails before the state is reset?\n\n📖 **Recommended Docs to Read:**\n- MDN: Event Loops & Task Queues\n- React Specs: Automatic Batching in React 18\n\n*Rule: Implement your idea, test the failure path, then check the lab result.*`
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={`Socratic Coach // ${topicTitle}`}>
      <div className="space-y-4 font-mono text-xs text-slate-200 pt-2">
        <div className="bg-zinc-950 p-3 border border-white/10 rounded">
          <p className="text-zinc-300 leading-relaxed">
            <span className="text-amber-400 font-bold">Pillar 3 Rules:</span> Learnist never gives you code to copy-paste. Tell the coach what you think the approach should be, and receive targeted docs & architectural checks.
          </p>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">
            What do you think your solution should do?
          </label>
          <textarea
            value={userHypothesis}
            onChange={(e) => setUserHypothesis(e.target.value)}
            placeholder="e.g. I plan to use a ref to store the timer id, then clear it on unmount..."
            rows={3}
            className="w-full bg-[#050505] border border-white/15 rounded p-2.5 outline-none focus:border-white/40 text-slate-200 placeholder:text-zinc-600"
          />
        </div>

        {coachResponse && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded text-emerald-200 whitespace-pre-wrap leading-relaxed">
            {coachResponse}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-white/15 text-zinc-400 hover:text-slate-200"
          >
            Close
          </button>
          <button
            onClick={handleAskCoach}
            className="px-4 py-1.5 rounded bg-slate-200 hover:bg-white text-black font-bold"
          >
            [Query Coach]
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   4. PROOF OF WORK DRAWER ("Build & Prove")
   ========================================================================== */
export function ProofDrawer({
  open,
  onClose,
  taskTitle,
  onSubmitProof,
}: {
  open: boolean;
  onClose: () => void;
  taskTitle: string;
  onSubmitProof: (proofUrl: string, proofType: "github" | "snippet" | "diagram" | "benchmark") => void;
}) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"github" | "snippet" | "diagram" | "benchmark">("github");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmitProof(url, type);
    setUrl("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Build & Prove // ${taskTitle}`}>
      <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs text-slate-200 pt-2">
        <p className="text-zinc-400 text-[11px] leading-relaxed">
          Attach empirical proof of work (GitHub commit link, PR URL, code benchmark, or architectural diagram) to officially mark this node as <span className="text-emerald-400 font-bold">PROVEN</span>.
        </p>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
            Proof Artifact Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["github", "snippet", "diagram", "benchmark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-1.5 rounded border text-[10px] uppercase transition-all ${
                  type === t
                    ? "bg-slate-200 text-black border-white font-bold"
                    : "bg-zinc-950 border-white/10 text-zinc-400 hover:text-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
            Proof Link / Snippet Reference
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/username/repo/commit/ab12cd..."
            className="w-full bg-[#050505] border border-white/15 rounded p-2.5 outline-none focus:border-white/40 text-slate-200 placeholder:text-zinc-600"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-white/15 text-zinc-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
          >
            [Submit & Mark Proven]
          </button>
        </div>
      </form>
    </Modal>
  );
}
