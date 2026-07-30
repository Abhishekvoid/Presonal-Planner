"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Clock,
  CheckCircle,
  WarningOctagon,
  Brain,
  Lightning,
  Play,
  ArrowRight,
  X,
  Sparkle,
  ShieldCheck,
  Flame,
  Check,
} from "@phosphor-icons/react";
import { useMentorStore } from "@/lib/mentorStore";

interface CompetencyScore {
  name: string;
  score: number; // 0-100
  feedback: string;
}

export function InterviewSimulatorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { setMode, setSelectedModel } = useMentorStore();

  const [activeStep, setActiveStep] = useState<"brief" | "active" | "scorecard">("brief");
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [candidateNotes, setCandidateNotes] = useState("");

  const [competencies, setCompetencies] = useState<CompetencyScore[]>([
    { name: "Scalability & System Boundaries", score: 88, feedback: "Excellent use of Qdrant HNSW and RabbitMQ fan-out." },
    { name: "Fault Tolerance & Edge Case Defense", score: 82, feedback: "Good idempotency keys & SELECT FOR UPDATE locks." },
    { name: "Data Modeling & Storage Selection", score: 90, feedback: "Clean split between Postgres relational & Redis sorted set cache." },
    { name: "Trade-off Justification & Socratic Defense", score: 85, feedback: "Strong defense of B-Tree vs LSM-Tree compaction." },
    { name: "Senior Articulation & Communication", score: 92, feedback: "Clear P99 latency target formulation (1.5s RAG, <50ms Redis)." },
  ]);

  // Timer countdown hook
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      setActiveStep("scorecard");
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const startSimulator = () => {
    setActiveStep("active");
    setTimeLeft(900);
    setIsTimerRunning(true);
    setMode("mock-interview");
    setSelectedModel("deepseek/deepseek-v4-flash");
  };

  const finishSimulator = () => {
    setIsTimerRunning(false);
    setActiveStep("scorecard");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const averageScore = Math.round(
    competencies.reduce((acc, c) => acc + c.score, 0) / competencies.length
  );

  const evaluatedRank =
    averageScore >= 90
      ? "L6 Staff Architect"
      : averageScore >= 80
      ? "L5 Senior Candidate"
      : "Mid-Level Engineer";

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-6 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hair pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md">
                <Trophy size={22} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-espresso leading-tight">
                  L6 Staff Architect Timed Interview Simulator
                </h2>
                <p className="font-mono text-xs text-coffee">
                  Benchmark performance against Sarvam AI, Krutrim, & Observe.AI senior interview criteria.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* STEP 1: BRIEF */}
          {activeStep === "brief" && (
            <div className="space-y-5 font-mono text-xs">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2 text-espresso">
                <div className="flex items-center justify-between font-bold text-amber-500 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Flame size={16} />
                    <span>L6 System Design Round Format (15 Minutes)</span>
                  </span>
                  <span>Target: ₹15–20 LPA / $55–70k</span>
                </div>
                <p className="font-sans text-xs text-coffee leading-relaxed">
                  You will be grilled on building a real-time RAG Search & High-Throughput Celery Async Queue under strict latency (P99 &lt; 1.5s) and concurrency bounds.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
                  <div className="text-[10px] uppercase font-bold text-coffee">Time Limit</div>
                  <div className="text-sm font-bold text-espresso mt-1">15 Minutes</div>
                  <div className="text-[10px] text-coffee opacity-80 mt-0.5">Strict timer with alert</div>
                </div>
                <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
                  <div className="text-[10px] uppercase font-bold text-coffee">AI Interviewer</div>
                  <div className="text-sm font-bold text-espresso mt-1">DeepSeek V4 Flash</div>
                  <div className="text-[10px] text-coffee opacity-80 mt-0.5">Socratic Staff Engineer</div>
                </div>
                <div className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E]">
                  <div className="text-[10px] uppercase font-bold text-coffee">Competency Rubric</div>
                  <div className="text-sm font-bold text-espresso mt-1">5 Core Criteria</div>
                  <div className="text-[10px] text-coffee opacity-80 mt-0.5">Automated Scorecard</div>
                </div>
              </div>

              <button
                onClick={startSimulator}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-mono text-xs font-bold text-black hover:bg-amber-400 shadow-lg transition-all active:scale-95"
              >
                <Play size={16} weight="fill" />
                <span>Start Timed L6 Interview Simulation</span>
              </button>
            </div>
          )}

          {/* STEP 2: ACTIVE SIMULATION */}
          {activeStep === "active" && (
            <div className="space-y-4 font-mono text-xs">
              {/* Timer Bar */}
              <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-500">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Clock size={18} className="animate-pulse" />
                  <span>Time Remaining: {formatTime(timeLeft)}</span>
                </div>
                <button
                  onClick={finishSimulator}
                  className="rounded-lg bg-amber-500 px-3 py-1 text-black font-bold text-xs hover:bg-amber-400"
                >
                  Submit & Evaluate Scorecard →
                </button>
              </div>

              {/* Scratchpad */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-coffee uppercase">
                  Candidate Architecture Notes Scratchpad (Optional)
                </label>
                <textarea
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder="Type architectural trade-offs, system formulas, and Qdrant/Redis bounds here..."
                  rows={6}
                  className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] p-3 text-xs font-mono text-espresso placeholder-coffee focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={finishSimulator}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  <CheckCircle size={15} />
                  <span>Finish Interview & View Scorecard</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SCORECARD */}
          {activeStep === "scorecard" && (
            <div className="space-y-5 font-mono text-xs">
              {/* Evaluated Rank Banner */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                    L6 Staff Competency Result
                  </div>
                  <div className="text-xl font-bold text-espresso mt-0.5">{evaluatedRank}</div>
                  <p className="font-sans text-xs text-coffee mt-0.5">
                    Evaluated score: <strong>{averageScore}%</strong> against Sarvam AI & Observe.AI senior benchmarks.
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-lg border border-emerald-500/40">
                  {averageScore}%
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5">
                <div className="text-[10px] uppercase font-bold text-coffee">
                  Competency Rubric Breakdown (5 Criteria)
                </div>
                {competencies.map((comp, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-espresso">
                      <span>{comp.name}</span>
                      <span className="text-amber-500">{comp.score}/100</span>
                    </div>
                    <p className="font-sans text-[11px] text-coffee leading-snug">
                      {comp.feedback}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-espresso text-cream-raised dark:bg-cream-raised dark:text-espresso px-4 py-2 font-bold text-xs hover:opacity-90"
                >
                  Close & Continue Prep
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
