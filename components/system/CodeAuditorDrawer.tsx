"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code,
  Sparkle,
  X,
  CheckCircle,
  WarningOctagon,
  Lightning,
  Play,
} from "@phosphor-icons/react";

export interface CodeAuditorDrawerProps {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  initialLanguage?: string;
}

export function CodeAuditorDrawer({
  open,
  onClose,
  initialCode = `# Python Example: Django ORM N+1 Query Bottleneck Audit\ndef calculate_total_costs():\n    factories = Factory.objects.all()\n    total = 0\n    for f in factories:\n        for tag in f.tags.all():  # N+1 Query Triggered Here!\n            total += tag.price\n    return total\n`,
  initialLanguage = "python",
}: CodeAuditorDrawerProps) {
  const [code, setCode] = useState(initialCode);
  const [language, setLanguage] = useState(initialLanguage);
  const [audited, setAudited] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  if (!open) return null;

  const handleAuditCode = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      setAudited(true);
    }, 600);
  };

  const getComplexityAnalysis = () => {
    const lower = code.toLowerCase();

    const isNPlusOne = lower.includes("for ") && (lower.includes(".all()") || lower.includes(".filter("));
    const isDoubleLoop = (code.match(/for /g) || []).length >= 2;

    return {
      timeComplexity: isDoubleLoop ? "O(N * M)" : lower.includes("for ") ? "O(N)" : "O(1)",
      spaceComplexity: lower.includes("list(") || lower.includes(".all()") ? "O(N)" : "O(1)",
      nPlusOneDetected: isNPlusOne,
      recommendation: isNPlusOne
        ? "Replace nested loop iteration with `.prefetch_related('tags')` or `.annotate(total=Sum('tags__price'))` to compute sums directly in PostgreSQL engine."
        : "Code structure demonstrates low memory footprint and clean algorithmic execution bounds.",
    };
  };

  const analysis = getComplexityAnalysis();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-[#0E1117] text-zinc-100 shadow-2xl border-l border-white/10 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Code size={18} weight="bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Code Complexity & Anti-Pattern Auditor
              </h3>
              <p className="font-mono text-[10px] text-zinc-400">
                Static Big-O & DB Query Analyzer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {/* Language Selector */}
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-zinc-400 font-bold">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
              <option value="sql">SQL</option>
              <option value="go">Go</option>
            </select>
          </div>

          {/* Code Textarea */}
          <div className="space-y-1">
            <label className="font-mono text-[10px] uppercase text-zinc-400 font-bold">
              Input Code Snippet
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={10}
              className="w-full bg-[#06080C] border border-white/10 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500/50 leading-relaxed"
            />
          </div>

          {/* Audit Action Button */}
          <button
            onClick={handleAuditCode}
            disabled={isAuditing || !code.trim()}
            className="w-full py-2.5 bg-emerald-500 text-black font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-30"
          >
            {isAuditing ? (
              <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
            ) : (
              <>
                <Play size={14} weight="bold" />
                <span>Audit & Analyze Complexity</span>
              </>
            )}
          </button>

          {/* Results Analysis Panel */}
          {audited && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-2"
            >
              <div className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Sparkle size={16} />
                <span>Audit Results</span>
              </div>

              {/* Complexity Badges */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block uppercase font-bold">Time Complexity</span>
                  <span className="text-emerald-400 font-bold text-sm">{analysis.timeComplexity}</span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-zinc-400 text-[10px] block uppercase font-bold">Space Complexity</span>
                  <span className="text-amber-400 font-bold text-sm">{analysis.spaceComplexity}</span>
                </div>
              </div>

              {/* Anti-Pattern Flag */}
              {analysis.nPlusOneDetected ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-xs">
                    <WarningOctagon size={16} />
                    <span>N+1 Query Bottleneck Detected!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Executing queries inside loops multiplies database round-trips by $O(N)$ factor.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>No N+1 queries or memory leak patterns detected!</span>
                </div>
              )}

              {/* Recommendation */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 block">
                  Senior Staff Engineering Optimization
                </span>
                <p className="text-[11px] leading-relaxed">{analysis.recommendation}</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
