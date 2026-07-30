"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code, Play, FileCode, Sparkle, ArrowUpRight, CheckCircle } from "@phosphor-icons/react";
import { useMentorStore } from "@/lib/mentorStore";

export function CodeReviewDrawer() {
  const {
    isCodeDrawerOpen,
    toggleCodeDrawer,
    codeForReview,
    setCodeForReview,
    codeLanguage,
    setMode,
    addMessage,
  } = useMentorStore();

  const [localCode, setLocalCode] = useState(codeForReview || "");
  const [localLang, setLocalLang] = useState(codeLanguage || "typescript");
  const [copied, setCopied] = useState(false);

  const handleSubmitReview = () => {
    if (!localCode.trim()) return;
    setCodeForReview(localCode, localLang);
    setMode("code-review");
    toggleCodeDrawer(false);

    // Send code message to thread
    const userPrompt = `Please perform a production-grade code review of my implementation below in ${localLang}.\n\n\`\`\`${localLang}\n${localCode}\n\`\`\``;
    addMessage("user", userPrompt, "code-review");
  };

  return (
    <AnimatePresence>
      {isCodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleCodeDrawer(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Doppelrand Slide-Over Outer Shell */}
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="relative z-10 flex h-full w-full max-w-2xl p-3 sm:p-5"
          >
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-hair bg-cream-raised dark:bg-[#0a0b0e]/95 p-2 shadow-2xl backdrop-blur-2xl">
              {/* Inner Core Container */}
              <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[calc(1.75rem-0.5rem)] border border-hair bg-cream-base dark:bg-[#101218]/90 p-5 sm:p-6 shadow-sm text-espresso">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-hair pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/25 shadow-md">
                      <Code size={22} weight="bold" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-espresso">Code Review Workbench</h2>
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Senior Review
                        </span>
                      </div>
                      <p className="text-xs text-coffee">
                        Submit snippets for edge-case, memory leak & concurrency analysis
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCodeDrawer(false)}
                    className="rounded-xl p-2 text-coffee hover:bg-black/5 dark:hover:bg-white/10 hover:text-espresso transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Toolbar */}
                <div className="my-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-amber-400" />
                    <span className="font-mono text-xs font-semibold text-cream/70">Language:</span>
                    <select
                      value={localLang}
                      onChange={(e) => setLocalLang(e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 font-mono text-xs text-cream focus:border-amber-400 focus:outline-none"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="go">Go</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="rust">Rust</option>
                      <option value="sql">SQL</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setLocalCode(`// Example: High-concurrency Token Bucket Rate Limiter
class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per second
  private tokens: number;
  private lastRefill: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  public allowRequest(tokensRequested = 1): boolean {
    this.refill();
    if (this.tokens >= tokensRequested) {
      this.tokens -= tokensRequested;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSec * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}`);
                    }}
                    className="font-mono text-xs text-amber-400/90 hover:text-amber-300 underline"
                  >
                    Insert Sample Snippet
                  </button>
                </div>

                {/* Editor Surface */}
                <div className="relative flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#060709] p-4 font-mono text-xs shadow-inner">
                  <textarea
                    value={localCode}
                    onChange={(e) => setLocalCode(e.target.value)}
                    placeholder="// Paste your backend implementation here (e.g. WAL writer, Cache eviction, Thread pool, LRU, etc.)"
                    className="h-full w-full resize-none bg-transparent text-cream/90 placeholder-cream/30 focus:outline-none mentor-scrollbar"
                    spellCheck={false}
                  />
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="font-mono text-xs text-cream/50">
                    {localCode.split("\n").length} lines | {localCode.length} chars
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCodeDrawer(false)}
                      className="rounded-xl px-4 py-2 font-mono text-xs text-cream/70 hover:bg-white/10"
                    >
                      Cancel
                    </button>

                    {/* Button-in-Button Nested CTA Architecture */}
                    <button
                      onClick={handleSubmitReview}
                      disabled={!localCode.trim()}
                      className="group relative inline-flex items-center gap-3 rounded-full bg-amber-500 px-5 py-2.5 font-semibold text-black shadow-xl hover:bg-amber-400 disabled:opacity-40 transition-all active:scale-[0.98]"
                    >
                      <span className="text-xs font-bold">Request Code Review</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/15 text-black transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight size={14} weight="bold" />
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
