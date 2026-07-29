"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  Brain,
  PaperPlaneTilt,
  Code,
  Gear,
  Trash,
  ArrowUpRight,
  CheckCircle,
  CaretDown,
  Lock,
  Trophy,
} from "@phosphor-icons/react";
import { useMentorStore, ChatMessageItem } from "@/lib/mentorStore";
import { MentorMode } from "@/lib/ai/prompt";
import { CodeReviewDrawer } from "./system/CodeReviewDrawer";
import { MermaidRenderer } from "./system/MermaidRenderer";
import { renderMarkdown } from "@/lib/markdown";

import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-bash";

const STRUCTURE_STEPS = [
  { id: 1, label: "Problem Statement", short: "1. Problem" },
  { id: 2, label: "Why Naive Fails", short: "2. Naive Fails" },
  { id: 3, label: "First Principles", short: "3. First Principles" },
  { id: 4, label: "Internal Working", short: "4. Internals" },
  { id: 5, label: "Visual Mental Model", short: "5. Visual Model" },
  { id: 6, label: "Production Use Cases", short: "6. Production Uses" },
  { id: 7, label: "Trade-offs Analysis", short: "7. Trade-offs" },
  { id: 8, label: "Live Coding Exercise", short: "8. Live Coding" },
  { id: 9, label: "Debugging Scenarios", short: "9. Debugging" },
  { id: 10, label: "Optimization & GC", short: "10. Optimization" },
  { id: 11, label: "Senior Interview Qs", short: "11. Interview Qs" },
  { id: 12, label: "Common Anti-Patterns", short: "12. Mistakes" },
  { id: 13, label: "Revision Quiz", short: "13. Quiz" },
];

const PRESET_TOPICS = [
  { id: "day-1-django-orm", title: "Day 1: Django ORM & N+1 Optimization", day: 1 },
  { id: "day-2-postgres-indexing", title: "Day 2: PostgreSQL Indexing & EXPLAIN ANALYZE", day: 2 },
  { id: "day-3-redis-rate-limiter", title: "Day 3: Redis Cache Aside & Rate Limiters", day: 3 },
  { id: "day-4-celery-async-reliability", title: "Day 4: Celery Task Queues & DLQ Reliability", day: 4 },
  { id: "day-5-payment-system-design", title: "Day 5: Payment System Idempotency & Webhooks", day: 5 },
  { id: "day-6-rag-architecture", title: "Day 6: RAG Qdrant Vector Search & Cross-Encoders", day: 6 },
  { id: "day-7-notification-fanout", title: "Day 7: Notification Service Fan-Out Architecture", day: 7 },
  { id: "day-8-prometheus-llm-gateway", title: "Day 8: Prometheus Metrics & LLM Gateway Middleware", day: 8 },
  { id: "day-9-mock-interview-marathon", title: "Day 9: Full L6 Mock Interview Sprint", day: 9 },
];

const AVAILABLE_MODELS = [
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", desc: "Socratic Reasoning & Systems Architecture" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 550B", desc: "Code Review & Concurrency Intelligence" },
];

export function MentorView() {
  const {
    activeMode,
    activeTopicId,
    activeTopicContext,
    selectedModel,
    provider,
    customApiKey,
    threads,
    isStreaming,
    setMode,
    setActiveTopic,
    setSelectedModel,
    addMessage,
    setLastMessageContent,
    clearCurrentThread,
    toggleCodeDrawer,
    setStreaming,
  } = useMentorStore();

  const [input, setInput] = useState("");
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  const currentMessages: ChatMessageItem[] = threads[activeTopicId] || [];

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isStreaming]);

  // Syntax highlighting trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      Prism.highlightAll();
    }, 30);
    return () => clearTimeout(timer);
  }, [currentMessages, isStreaming]);

  // GSAP animation for 13-step stepper bar track
  useEffect(() => {
    if (!stepperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stepper-node",
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.02, ease: "power2.out" }
      );
    }, stepperRef);
    return () => ctx.revert();
  }, [activeTopicId]);

  // Listen for single-click topic locking events
  useEffect(() => {
    const handleLockTopicEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ topicTitle: string; prompt: string }>;
      if (customEv.detail && customEv.detail.prompt) {
        handleSendMessage(customEv.detail.prompt);
      }
    };

    window.addEventListener("lock-topic-and-start", handleLockTopicEvent);
    return () => window.removeEventListener("lock-topic-and-start", handleLockTopicEvent);
  }, [activeTopicId, activeMode, customApiKey, provider, selectedModel, isStreaming]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isStreaming) return;

    if (!textToSend) setInput("");

    // Add user message
    addMessage("user", query, activeMode);

    // Add placeholder assistant message
    addMessage("assistant", "", activeMode);
    setStreaming(true);

    try {
      const payloadMessages = [...currentMessages, { id: "temp-user", role: "user" as const, content: query, timestamp: Date.now() }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          mode: activeMode,
          topicContext: activeTopicContext || { id: activeTopicId },
          apiKey: customApiKey,
          provider,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setLastMessageContent(
          `⚠️ **API Error (${res.status})**: ${errorData?.error || "Failed to reach AI Mentor endpoint."}`
        );
        setStreaming(false);
        return;
      }

      if (!res.body) {
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulated = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setLastMessageContent(accumulated);
        }
      }
    } catch (err: any) {
      setLastMessageContent(`⚠️ **Connection Error**: ${err.message || "Network request failed."}`);
    } finally {
      setStreaming(false);
    }
  };

  const currentTopicObj = PRESET_TOPICS.find((t) => t.id === activeTopicId) || {
    id: activeTopicId,
    title: activeTopicContext?.title || activeTopicId,
    day: activeTopicContext?.sprintDay || 1,
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full gap-5 overflow-hidden rounded-3xl border border-hair bg-cream-base/90 dark:bg-[#0A0C10]/95 p-4 shadow-2xl backdrop-blur-2xl">
      {/* ==================================================================== */}
      {/* LEFT PANEL: TOPIC CONTEXT, STEPPER & Socratic CONTROL CENTER        */}
      {/* ==================================================================== */}
      <div className="flex w-80 flex-col justify-between rounded-2xl border border-hair bg-cream-raised dark:bg-[#12151E] p-4 shadow-md overflow-y-auto">
        <div className="space-y-5">
          {/* Header & Topic Lock Banner */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-coffee dark:text-cream/60">
              <span className="flex items-center gap-1.5 font-bold text-amber-500">
                <Brain size={16} weight="fill" /> AI Senior Mentor
              </span>
              <span className="flex items-center gap-1 text-emerald-500 font-bold">
                <Lock size={12} weight="fill" /> Topic Locked
              </span>
            </div>

            {/* Active Topic Dropdown Lock */}
            <div className="relative mt-2">
              <button
                onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-hair bg-cream-deep/80 dark:bg-black/40 px-3 py-2 text-left transition-all hover:border-amber-500/50"
              >
                <div className="truncate">
                  <div className="font-mono text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                    Sprint Day {currentTopicObj.day}
                  </div>
                  <div className="truncate font-sans text-xs font-bold text-espresso dark:text-cream">
                    {currentTopicObj.title}
                  </div>
                </div>
                <CaretDown size={14} className="text-coffee flex-shrink-0" />
              </button>

              {/* Topic Selector Dropdown */}
              <AnimatePresence>
                {topicDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-hair bg-cream-raised dark:bg-[#181C27] p-1.5 shadow-2xl backdrop-blur-xl"
                  >
                    {PRESET_TOPICS.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => {
                          setActiveTopic(topic.id, {
                            id: topic.id,
                            title: topic.title,
                            sprintDay: topic.day,
                          });
                          setTopicDropdownOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left font-sans text-xs transition-all ${
                          activeTopicId === topic.id
                            ? "bg-amber-500/20 font-bold text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "text-coffee hover:bg-black/5 dark:hover:bg-white/5 hover:text-espresso"
                        }`}
                      >
                        <div className="font-mono text-[9px] uppercase">Day {topic.day}</div>
                        <div className="truncate">{topic.title}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Socratic Mode Switcher Pills */}
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-coffee font-bold">
              Select Interaction Mode
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-hair bg-cream-deep/60 dark:bg-black/40 p-1">
              {(["grill", "code-review", "mock-interview"] as MentorMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={`rounded-lg py-1.5 text-center font-mono text-[10px] font-bold uppercase transition-all ${
                    activeMode === mode
                      ? "bg-amber-500 text-black shadow-md"
                      : "text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {mode === "grill" ? "Grill" : mode === "code-review" ? "Review" : "Mock"}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-coffee font-bold">
              Active Intelligence Model
            </div>
            <div className="space-y-1.5">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedModel === model.id
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                      : "border-hair bg-cream-deep/40 dark:bg-black/20 text-coffee hover:text-espresso"
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs">{model.name}</div>
                    <div className="font-sans text-[10px] font-normal opacity-80">{model.desc}</div>
                  </div>
                  {selectedModel === model.id && <CheckCircle size={14} className="text-emerald-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* 13-Step Stepper Progress Track */}
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-coffee font-bold flex justify-between items-center">
              <span>Socratic 13-Step Track</span>
              <span className="text-amber-500 font-bold">13/13</span>
            </div>
            <div ref={stepperRef} className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {STRUCTURE_STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => {
                    handleSendMessage(
                      `Mentor, let's focus specifically on Step ${step.id}: ${step.label} for ${currentTopicObj.title}.`
                    );
                  }}
                  className="stepper-node w-full flex items-center justify-between rounded-lg border border-hair/50 bg-cream-deep/30 dark:bg-black/20 px-2.5 py-1.5 font-mono text-[11px] text-coffee hover:bg-amber-500/10 hover:text-espresso transition-all text-left group"
                >
                  <span className="truncate group-hover:text-amber-500">{step.short}</span>
                  <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Candidate Brief Quick Target */}
        <div className="mt-4 rounded-xl border border-hair bg-cream-deep/80 dark:bg-black/40 p-3 font-mono text-[10px] text-coffee space-y-1">
          <div className="flex items-center gap-1 text-espresso dark:text-cream font-bold">
            <Trophy size={13} className="text-amber-500" />
            <span>Target: ₹15–20 LPA / $55–70k</span>
          </div>
          <p className="opacity-80">Sarvam AI · Krutrim · Observe.AI · Ripik.AI</p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT PANEL: INTERACTIVE CHAT STUDIO CANVAS WITH MERMAID & HIGH-LIGHT */}
      {/* ==================================================================== */}
      <div className="flex flex-1 flex-col justify-between rounded-2xl border border-hair bg-cream-raised dark:bg-[#12151E] shadow-md overflow-hidden">
        {/* Studio Top Control Bar */}
        <div className="flex items-center justify-between border-b border-hair bg-cream-deep/50 dark:bg-black/40 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-espresso dark:text-cream">
              {activeMode === "grill"
                ? "🔥 Socratic First-Principles Drill"
                : activeMode === "code-review"
                ? "🔍 Senior Production Code Review"
                : "🏆 Staff Level Mock Interview"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleCodeDrawer(true)}
              className="flex items-center gap-1.5 rounded-xl border border-hair bg-cream-deep px-3 py-1.5 font-mono text-xs font-bold text-espresso hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            >
              <Code size={14} />
              <span>Submit Code</span>
            </button>
            <button
              onClick={() => clearCurrentThread()}
              className="rounded-xl border border-hair bg-cream-deep p-1.5 text-coffee hover:text-rose-500 transition-all"
              title="Clear Session History"
            >
              <Trash size={16} />
            </button>
          </div>
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {currentMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500">
                <Brain size={36} weight="fill" />
              </div>
              <h3 className="text-lg font-bold text-espresso dark:text-cream">
                AI Senior Mentor Studio Ready
              </h3>
              <p className="max-w-md font-mono text-xs text-coffee leading-relaxed">
                Topic locked to <strong className="text-amber-500">{currentTopicObj.title}</strong>. Click any prompt below or type your question to start Socratic grilling.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  `Mentor, let's drill on ${currentTopicObj.title}`,
                  "Guide me through Step 5: Visual Mental Model",
                  "Grill me on PostgreSQL EXPLAIN ANALYZE vs B-Trees",
                  "Run an L6 Mock Interview scenario",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(preset)}
                    className="rounded-xl border border-hair bg-cream-deep px-3 py-2 font-mono text-xs text-espresso hover:bg-amber-500/20 hover:border-amber-500/40 transition-all"
                  >
                    ⚡ {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentMessages.map((msg: ChatMessageItem, idx: number) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl p-4 text-xs font-sans leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-amber-500 text-black font-medium"
                      : "bg-cream-deep/90 dark:bg-[#181C27] border border-hair text-espresso dark:text-cream"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <RenderMentorMessage content={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Floating Input Control Bar */}
        <div className="border-t border-hair bg-cream-deep/40 dark:bg-black/30 p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask AI Mentor on ${currentTopicObj.title}... (⌘ + Enter to send)`}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-hair bg-cream-raised dark:bg-[#0A0C10] p-3 text-xs font-sans text-espresso dark:text-cream placeholder-coffee focus:border-amber-500 focus:outline-none transition-all"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isStreaming}
              className="flex items-center justify-center rounded-xl bg-amber-500 px-5 font-mono text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
              <PaperPlaneTilt size={18} weight="fill" />
            </button>
          </div>
        </div>
      </div>

      {/* Code Review Slide-Over Drawer */}
      <CodeReviewDrawer />
    </div>
  );
}

/**
 * Message Content Parser:
 * Dynamically detects Mermaid ```mermaid ``` blocks and renders them with <MermaidRenderer />!
 */
function RenderMentorMessage({ content }: { content: string }) {
  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g;

  // Split content by mermaid blocks
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.substring(lastIndex, match.index) });
    }
    parts.push({ type: "mermaid", value: match[1] });
    lastIndex = mermaidRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (part.type === "mermaid") {
          return <MermaidRenderer key={idx} chart={part.value} />;
        }
        return (
          <div
            key={idx}
            className="prose dark:prose-invert prose-xs max-w-none text-espresso dark:text-cream leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(part.value) }}
          />
        );
      })}
    </div>
  );
}
