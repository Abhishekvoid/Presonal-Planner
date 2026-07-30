"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MUST_DO_SPECS, DailyMustDoSpec } from "@/lib/mustDoSpecs";
import { renderMarkdown } from "@/lib/markdown";

interface Props {
  dayId?: string;
}

export function MustDoContractCard({ dayId = "day-1" }: Props) {
  const spec: DailyMustDoSpec = MUST_DO_SPECS[dayId] ?? MUST_DO_SPECS["day-1"];
  const [isRevealed, setIsRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState<"leetcode" | "system">("leetcode");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const lc = spec.leetcodeSpec;
  const sys = spec.systemSpec;

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="reveal border border-rose-500/30 bg-cream-raised dark:bg-[#0A0708] p-4 sm:p-5 rounded-lg text-espresso shadow-[0_0_25px_rgba(244,63,94,0.1)] relative overflow-hidden transition-all">
      {/* Red/Amber Hairline Pulse Header - Clickable Banner */}
      <div 
        onClick={() => setIsRevealed(!isRevealed)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group select-none"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-rose-400 uppercase tracking-widest bg-rose-950/80 border border-rose-500/40 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              🔥 DAY DOESN'T END UNTIL YOU DO THIS
            </span>
            <span className="font-mono text-[10px] text-zinc-400 uppercase">
              {spec.dayTitle}
            </span>
          </div>
          <p className="font-mono text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors">
            Must-Do: LeetCode #{lc.problemNumber} ({lc.title}) + {sys.title}
          </p>
        </div>

        <button
          type="button"
          className="self-start sm:self-center px-3.5 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
        >
          <span>{isRevealed ? "[Hide Spec ▲]" : "[Click to Reveal Problem Spec & Execute Contract ↓]"}</span>
        </button>
      </div>

      {/* Expanded Spec Body */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="pt-4 border-t border-rose-500/20 mt-4 space-y-4"
          >
            {/* Tab Switcher */}
            <div className="flex gap-1 bg-zinc-950 p-1 rounded border border-white/10 shrink-0 font-mono text-[11px]">
              <button
                onClick={() => setActiveTab("leetcode")}
                className={`px-3 py-1.5 rounded transition-all flex-1 ${
                  activeTab === "leetcode"
                    ? "bg-rose-500 text-white font-bold shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    : "text-zinc-400 hover:text-slate-200"
                }`}
              >
                [1] LeetCode Spec (#{lc.problemNumber})
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`px-3 py-1.5 rounded transition-all flex-1 ${
                  activeTab === "system"
                    ? "bg-emerald-500 text-black font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    : "text-zinc-400 hover:text-slate-200"
                }`}
              >
                [2] 0-1 Systems Spec
              </button>
            </div>

      {/* Main Spec Content */}
      <AnimatePresence mode="wait">
        {activeTab === "leetcode" ? (
          <motion.div
            key="leetcode"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4 font-mono text-xs"
          >
            {/* Header & Badges */}
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold text-slate-100">
                Problem Spec: LeetCode #{lc.problemNumber} — {lc.title}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                lc.difficulty === "Easy"
                  ? "text-emerald-400 bg-emerald-950 border-emerald-500/30"
                  : lc.difficulty === "Medium"
                  ? "text-amber-400 bg-amber-950 border-amber-500/30"
                  : "text-rose-400 bg-rose-950 border-rose-500/30"
              }`}>
                {lc.difficulty}
              </span>
            </div>

            {/* Problem Statement */}
            <div className="bg-cream-deep dark:bg-[#050505] text-espresso leading-relaxed">
              <span className="text-[9px] uppercase font-bold text-rose-400 block mb-1">
                Problem Statement & Objective:
              </span>
              {lc.statement}
            </div>

            {/* Inputs, Outputs, & Constraints Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#050505] border border-white/10 p-3 rounded">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Input Example:</span>
                <code className="text-emerald-300 text-[11px] block">{lc.inputExample}</code>
                <span className="text-[9px] uppercase font-bold text-zinc-400 block mt-2 mb-1">Expected Output:</span>
                <code className="text-amber-300 text-[11px] block">{lc.outputExample}</code>
              </div>

              <div className="bg-[#050505] border border-white/10 p-3 rounded">
                <span className="text-[9px] uppercase font-bold text-rose-400 block mb-1">Strict Constraints:</span>
                <ul className="space-y-1 text-[11px] text-zinc-300">
                  {lc.constraints.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Step-by-Step Execution Protocol */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-200 block">
                Step-by-Step Execution Protocol (Click step to expand):
              </span>
              <div className="space-y-2">
                {lc.steps.map((step) => {
                  const stepId = `lc-${lc.problemNumber}-${step.stepNum}`;
                  const isDone = completedSteps[stepId];
                  const isOpen = expandedStep === step.stepNum;

                  return (
                    <div
                      key={step.stepNum}
                      className={`border rounded p-3 transition-all ${
                        isDone
                          ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                          : "border-white/10 bg-[#050505] text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStep(isOpen ? null : step.stepNum)}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStep(stepId);
                            }}
                            className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                              isDone ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20 hover:border-white"
                            }`}
                          >
                            {isDone ? "✓" : ""}
                          </button>
                          <span className="font-mono text-xs font-bold">
                            Step {step.stepNum}: {step.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{isOpen ? "▲" : "▼"}</span>
                      </div>

                      {isOpen && (
                        <p className="mt-2 pt-2 border-t border-white/10 text-[11px] text-zinc-300 leading-relaxed">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-fde-topic", { detail: "dsa-sliding-window" }))}
                className="text-[10px] font-mono text-emerald-400 hover:underline"
              >
                [Open Code Lab Validator →]
              </button>
              <span className="text-[10px] text-zinc-500">
                {Object.keys(completedSteps).filter(k => k.startsWith(`lc-${lc.problemNumber}`)).length} / {lc.steps.length} Steps Completed
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="system"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-4 font-mono text-xs"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold text-slate-100">
                Systems Challenge: {sys.title}
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded">
                ⚡ Target: {sys.latencyTarget}
              </span>
            </div>

            {/* Statement */}
            <div className="bg-cream-deep dark:bg-[#050505] text-espresso leading-relaxed">
              <span className="text-[9px] uppercase font-bold text-emerald-400 block mb-1">
                Engineering Challenge Objective:
              </span>
              {sys.statement}
            </div>

            {/* API Contract & Latency Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#050505] border border-white/10 p-3 rounded">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Input API Trigger:</span>
                <code className="text-emerald-300 text-[11px] block">{sys.inputContract}</code>
              </div>

              <div className="bg-[#050505] border border-white/10 p-3 rounded">
                <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Output Contract & Benchmark:</span>
                <code className="text-amber-300 text-[11px] block">{sys.outputContract}</code>
              </div>
            </div>

            {/* Step-by-Step Execution Protocol */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-200 block">
                Systems Step-by-Step Execution Checklist:
              </span>
              <div className="space-y-2">
                {sys.steps.map((step) => {
                  const stepId = `sys-${dayId}-${step.stepNum}`;
                  const isDone = completedSteps[stepId];
                  const isOpen = expandedStep === step.stepNum + 10;

                  return (
                    <div
                      key={step.stepNum}
                      className={`border rounded p-3 transition-all ${
                        isDone
                          ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                          : "border-white/10 bg-[#050505] text-slate-200 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedStep(isOpen ? null : step.stepNum + 10)}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStep(stepId);
                            }}
                            className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                              isDone ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20 hover:border-white"
                            }`}
                          >
                            {isDone ? "✓" : ""}
                          </button>
                          <span className="font-mono text-xs font-bold">
                            Step {step.stepNum}: {step.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">{isOpen ? "▲" : "▼"}</span>
                      </div>

                      {isOpen && (
                        <p className="mt-2 pt-2 border-t border-white/10 text-[11px] text-zinc-300 leading-relaxed">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-fde-topic", { detail: "day-1-django-orm" }))}
                className="text-[10px] font-mono text-emerald-400 hover:underline font-bold"
              >
                [Open 0-1 Notes & Code Snippet →]
              </button>
              <span className="text-[10px] text-zinc-500">
                {Object.keys(completedSteps).filter(k => k.startsWith(`sys-${dayId}`)).length} / {sys.steps.length} Steps Completed
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
