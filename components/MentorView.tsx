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
  Lightning,
  Sparkle,
  WarningOctagon,
  CheckSquare,
  Square,
  Flame,
  Star,
  Check,
  Lightbulb,
  SidebarSimple,
  BookOpen,
  TextAa,
  CaretLeft,
  CaretRight,
  X,
  Copy,
  PencilLine,
  Eye,
} from "@phosphor-icons/react";
import { useMentorStore, ChatMessageItem } from "@/lib/mentorStore";
import { lockTopicAndOpenMentor } from "@/lib/topicLocker";
import { InterviewSimulatorModal } from "./system/InterviewSimulatorModal";
import { MentorMode } from "@/lib/ai/prompt";
import { CodeReviewDrawer } from "./system/CodeReviewDrawer";
import { MermaidRenderer } from "./system/MermaidRenderer";
import { renderMarkdown } from "@/lib/markdown";
import { get8020PlanForTopic } from "@/lib/ai/subtopics8020";

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
  { id: "inclusionai/ling-3.0-flash:free", name: "Ling 3.0 Flash", desc: "Socratic Reasoning (124B MoE)" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 550B", desc: "Code Intelligence" },
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
    topicProgress,
    isStreaming,
    setMode,
    setActiveTopic,
    setSelectedModel,
    addMessage,
    setLastMessageContent,
    clearCurrentThread,
    toggleCodeDrawer,
    setStreaming,
    markStepCompleted,
    toggleSubtopicDone,
    logMistake,
    setCandidateRank,
  } = useMentorStore();

  const [input, setInput] = useState("");
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"plan8020" | "steps" | "rank">("plan8020");
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mentor_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("mentor_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  // Reader Mode / Co-Reading Space State
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState<"xs" | "sm" | "base" | "lg" | "xl">("base");
  const [readerFontFamily, setReaderFontFamily] = useState<"sans" | "serif" | "handwriting">("sans");
  const [readerMsgIndex, setReaderMsgIndex] = useState<number>(0);
  const [copiedReaderText, setCopiedReaderText] = useState(false);

  // Keyboard shortcuts: Ctrl+B (sidebar), Ctrl+R (reader mode), Escape (close reader)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        setReaderOpen((prev) => !prev);
      }
      if (e.key === "Escape" && readerOpen) {
        setReaderOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readerOpen]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  const currentMessages: ChatMessageItem[] = threads[activeTopicId] || [];
  const currentProgress = topicProgress[activeTopicId] || {
    topicId: activeTopicId,
    completedSteps: [1],
    currentStep: 1,
    subtopicsDone: {},
    mistakesLogged: [],
    rank: "L5 Senior Candidate",
    scorePct: 15,
  };

  const plan8020 = get8020PlanForTopic(activeTopicId, activeTopicContext?.title);

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

  // GSAP animation for stepper track nodes
  useEffect(() => {
    if (!stepperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stepper-node",
        { opacity: 0, x: -6 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.02, ease: "power2.out" }
      );
    }, stepperRef);
    return () => ctx.revert();
  }, [activeTopicId, sidebarTab]);

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

    // Auto-detect query intent and switch mode & model automatically!
    let targetMode = activeMode;
    let targetModel = selectedModel;

    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes("```") ||
      lowerQuery.includes("code review") ||
      lowerQuery.includes("refactor") ||
      lowerQuery.includes("debug function") ||
      lowerQuery.includes("syntax")
    ) {
      targetMode = "code-review";
      targetModel = "nvidia/nemotron-3-ultra-550b-a55b:free";
      setMode("code-review");
      setSelectedModel("nvidia/nemotron-3-ultra-550b-a55b:free");
    } else if (
      lowerQuery.includes("mock interview") ||
      lowerQuery.includes("l6") ||
      lowerQuery.includes("rank my performance") ||
      lowerQuery.includes("scorecard")
    ) {
      targetMode = "mock-interview";
      targetModel = "inclusionai/ling-3.0-flash:free";
      setMode("mock-interview");
      setSelectedModel("inclusionai/ling-3.0-flash:free");
    } else if (
      lowerQuery.includes("first principles") ||
      lowerQuery.includes("grill") ||
      lowerQuery.includes("why") ||
      lowerQuery.includes("step")
    ) {
      targetMode = "grill";
      targetModel = "inclusionai/ling-3.0-flash:free";
      setMode("grill");
      setSelectedModel("inclusionai/ling-3.0-flash:free");
    }

    // Add user message
    addMessage("user", query, targetMode);

    // Add placeholder assistant message
    addMessage("assistant", "", targetMode);
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
          mode: targetMode,
          topicContext: activeTopicContext || { id: activeTopicId },
          apiKey: customApiKey,
          provider,
          model: targetModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setLastMessageContent(
          `API Error (${res.status}): ${errorData?.error || "Failed to reach AI Mentor endpoint."}`
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

          // Client-side bulletproof sanitizer to filter out any lingering API JSON metadata
          let cleanChunk = chunk;
          if (
            cleanChunk.includes("data: ") ||
            cleanChunk.includes("OPENROUTER PROCESSING") ||
            cleanChunk.includes('"choices":') ||
            cleanChunk.includes('"provider":') ||
            cleanChunk.includes('"usage":') ||
            cleanChunk.includes("data: [DONE]")
          ) {
            // Extract ONLY valid delta content if chunk has JSON payload
            const dataMatches = cleanChunk.match(/data:\s*(\{[\s\S]*?\})/g);
            if (dataMatches) {
              cleanChunk = dataMatches
                .map((dm) => {
                  try {
                    const parsed = JSON.parse(dm.replace(/^data:\s*/, ""));
                    return parsed.choices?.[0]?.delta?.content || "";
                  } catch (e) {
                    return "";
                  }
                })
                .join("");
            } else {
              cleanChunk = "";
            }
          }

          accumulated += cleanChunk;
          setLastMessageContent(accumulated);

          // Real-time Step Detection Metadata Parser
          parseMetadataChunk(accumulated);
        }
      }
    } catch (err: any) {
      setLastMessageContent(`Connection Error: ${err.message || "Network request failed."}`);
    } finally {
      setStreaming(false);
    }
  };

  /**
   * Meta JSON Tag Parser: Automatically updates completed steps, progress, and rank!
   */
  const parseMetadataChunk = (text: string) => {
    const metaMatch = text.match(/<!--META:([\s\S]*?)-->/);
    if (metaMatch && metaMatch[1]) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        if (Array.isArray(meta.completedSteps)) {
          meta.completedSteps.forEach((sId: number) => markStepCompleted(activeTopicId, sId));
        }
        if (meta.mistakeLogged) {
          logMistake(activeTopicId, meta.mistakeLogged);
        }
        if (meta.rank) {
          setCandidateRank(activeTopicId, meta.rank, meta.progressPct);
        }
        if (meta.progressPct === 100 || (Array.isArray(meta.completedSteps) && meta.completedSteps.includes(13))) {
          try {
            const { usePlanner } = require("@/lib/store");
            usePlanner.getState().markDayTasksDone(currentTopicObj.day);
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        // Silent fail on incomplete JSON chunk
      }
    }
  };

  const currentTopicObj = PRESET_TOPICS.find((t) => t.id === activeTopicId) || {
    id: activeTopicId,
    title: activeTopicContext?.title || activeTopicId,
    day: activeTopicContext?.sprintDay || 1,
  };

  const progressPct = Math.round(((currentProgress.completedSteps?.length || 1) / 13) * 100);

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100dvh-5.5rem)] min-h-[550px] w-full overflow-hidden rounded-2xl border border-hair bg-cream-base dark:bg-[#0A0C10] shadow-2xl backdrop-blur-3xl">
      {/* ==================================================================== */}
      {/* LEFT INSPECTOR SIDEBAR: LINEAR / RAYCAST ANTI-SLOP STYLE             */}
      {/* ==================================================================== */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "20rem", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex w-full lg:w-80 flex-col justify-between border-b lg:border-b-0 lg:border-r border-hair bg-cream-raised/50 dark:bg-[#0E1117]/80 p-4 overflow-y-auto shrink-0 max-h-[340px] lg:max-h-none overflow-hidden"
          >
            <div className="space-y-4">
              {/* Header & Topic Title Selector */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono font-medium text-coffee">
                  <span className="flex items-center gap-1.5 font-bold text-espresso">
                    <Brain size={16} className="text-amber-500" />
                    <span>AI Senior Mentor</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Locked</span>
                    </span>
                    <button
                      onClick={toggleSidebar}
                      title="Collapse Sidebar (Ctrl+B / ⌘B)"
                      className="p-1 text-coffee hover:text-espresso rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <SidebarSimple size={16} weight="bold" />
                    </button>
                  </div>
                </div>

              {/* Seamless Topic Dropdown Selector */}
              <div className="relative mt-2.5">
                <button
                  onClick={() => setTopicDropdownOpen(!topicDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 border-b border-hair pb-2 text-left transition-colors hover:border-amber-500"
                >
                  <div className="truncate">
                    <div className="flex items-center justify-between font-mono text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                      <span>Sprint Day {currentTopicObj.day}</span>
                      {((currentProgress.completedSteps?.length || 0) >= 13 || currentProgress.completedSteps?.includes(13)) && (
                        <span className="text-emerald-500 flex items-center gap-1 font-bold text-[8px] bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/30">
                          <CheckCircle size={10} />
                          <span>COMPLETED</span>
                        </span>
                      )}
                    </div>
                    <div className="truncate font-sans text-xs font-bold text-espresso leading-tight mt-0.5">
                      {currentTopicObj.title}
                    </div>
                  </div>
                  <CaretDown size={14} className="text-coffee flex-shrink-0" />
                </button>

                {/* Dropdown Options */}
                <AnimatePresence>
                  {topicDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-hair bg-cream-raised dark:bg-[#161922] p-1 shadow-2xl backdrop-blur-2xl divide-y divide-hair"
                    >
                      {PRESET_TOPICS.map((topic) => {
                        const topicProg = topicProgress[topic.id];
                        const isDone = (topicProg?.completedSteps?.length || 0) >= 13 || topicProg?.completedSteps?.includes(13);

                        return (
                          <button
                            key={topic.id}
                            onClick={() => {
                              setActiveTopic(topic.id, {
                                id: topic.id,
                                title: topic.title,
                                sprintDay: topic.day,
                                isDayCompleted: isDone,
                              });
                              setTopicDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${
                              activeTopicId === topic.id
                                ? "bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400"
                                : "text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="truncate">
                              <div className="font-mono text-[9px] uppercase">Day {topic.day}</div>
                              <div className="truncate text-xs">{topic.title}</div>
                            </div>
                            {isDone && (
                              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 ml-1" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>

          {/* Minimalist Linear Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-coffee">Mastery Progress</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{progressPct}%</span>
            </div>
            <div className="h-1 w-full bg-hair/60 overflow-hidden rounded-full">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-coffee pt-0.5">
              <span>{currentProgress.completedSteps?.length || 1}/13 Steps</span>
              <span className="text-emerald-500 font-medium">{currentProgress.rank || "L5 Senior"}</span>
            </div>
          </div>

          {/* Clean Segmented Tab Switcher */}
          <div className="flex border-b border-hair text-xs font-medium">
            {[
              { id: "plan8020", label: "Summary" },
              { id: "steps", label: "13 Steps" },
              { id: "rank", label: "Rank & Anti-Patterns" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id as any)}
                className={`flex-1 pb-2 text-center transition-colors relative ${
                  sidebarTab === tab.id
                    ? "text-espresso font-bold"
                    : "text-coffee hover:text-espresso"
                }`}
              >
                {tab.label}
                {sidebarTab === tab.id && (
                  <motion.div
                    layoutId="tabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* TAB 1: SUMMARY CHECKLIST */}
          {sidebarTab === "plan8020" && (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1 text-xs">
              {/* Architecture Concepts */}
              <div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-2">
                  High-ROI Core Concepts
                </div>
                <div className="space-y-2">
                  {plan8020.subtopics.map((subtopic) => {
                    const isChecked = !!currentProgress.subtopicsDone[subtopic.id];
                    return (
                      <div
                        key={subtopic.id}
                        className="border-b border-hair/60 pb-2 space-y-1 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleSubtopicDone(activeTopicId, subtopic.id)}
                            className="mt-0.5 text-coffee hover:text-amber-500 transition-colors"
                          >
                            {isChecked ? (
                              <CheckSquare size={15} className="text-emerald-500" />
                            ) : (
                              <Square size={15} />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className={`font-semibold ${isChecked ? "line-through text-coffee opacity-60" : "text-espresso"}`}>
                              {subtopic.title}
                            </div>
                            <p className="text-[11px] text-coffee leading-normal mt-0.5">
                              {subtopic.description}
                            </p>
                            <button
                              onClick={() => handleSendMessage(`Mentor, let's drill on subtopic: ${subtopic.title}. ${subtopic.practiceDrill}`)}
                              className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                            >
                              <Lightning size={11} className="text-amber-500" />
                              <span>Start Practice Drill</span>
                              <ArrowUpRight size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 45 Stored DSA Problems */}
              {plan8020.dsaProblems && plan8020.dsaProblems.length > 0 && (
                <div className="pt-2 border-t border-hair">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Lightbulb size={13} className="text-emerald-500" />
                      <span>Essential DSA Drills</span>
                    </span>
                    <span className="text-[8px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">LeetCode</span>
                  </div>
                  <div className="space-y-2">
                    {plan8020.dsaProblems.map((prob, idx) => (
                      <div key={idx} className="border-b border-hair/50 pb-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-espresso">{prob.title}</span>
                          <span className={`font-mono text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            prob.difficulty === "easy"
                              ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                              : prob.difficulty === "med"
                              ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
                              : "text-rose-500 bg-rose-500/10 border-rose-500/30"
                          }`}>
                            {prob.difficulty}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-coffee">{prob.tip}</p>
                        <button
                          onClick={() => {
                            setMode("mock-interview");
                            handleSendMessage(`Mentor, let's drill on DSA problem ${prob.title}. Guide me through optimal O(N) approach, edge cases, and code implementation.`);
                          }}
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          <Lightning size={11} className="text-emerald-500" />
                          <span>Drill DSA Problem</span>
                          <ArrowUpRight size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 13-STEP PROGRESS TRACK */}
          {sidebarTab === "steps" && (
            <div ref={stepperRef} className="space-y-1.5 max-h-64 overflow-y-auto pr-1 font-mono text-xs">
              {STRUCTURE_STEPS.map((step) => {
                const isDone = currentProgress.completedSteps?.includes(step.id);
                const isActive = currentProgress.currentStep === step.id;

                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      markStepCompleted(activeTopicId, step.id);
                      handleSendMessage(
                        `Mentor, let's focus specifically on Step ${step.id}: ${step.label} for ${currentTopicObj.title}.`
                      );
                    }}
                    className={`stepper-node w-full flex items-center justify-between py-1.5 border-b border-hair/40 transition-colors text-left group ${
                      isDone
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : isActive
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "text-coffee hover:text-espresso"
                    }`}
                  >
                    <span className="truncate">{step.short}</span>
                    {isDone ? (
                      <CheckCircle size={13} className="text-emerald-500" />
                    ) : isActive ? (
                      <Lightning size={13} className="text-amber-500 animate-pulse" />
                    ) : (
                      <Lock size={11} className="text-coffee opacity-40" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 3: RANK & MISTAKE WATCHER */}
          {sidebarTab === "rank" && (
            <div className="space-y-3 font-sans text-xs max-h-64 overflow-y-auto">
              <div className="border-b border-hair pb-2 space-y-1">
                <div className="font-mono text-[9px] uppercase tracking-wider text-coffee">Evaluated Rank</div>
                <div className="font-bold text-sm text-espresso">{currentProgress.rank || "L5 Senior Candidate"}</div>
                <p className="text-coffee text-[11px]">Assessed against YC Startups (Seed / Series A/B) & Global Senior benchmarks.</p>
              </div>

              {currentProgress.mistakesLogged?.length > 0 && (
                <div className="border-b border-hair pb-2 space-y-1 text-rose-500">
                  <div className="font-mono text-[9px] uppercase tracking-wider font-bold flex items-center gap-1">
                    <WarningOctagon size={12} />
                    <span>Anti-Pattern Watcher Flagged</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                    {currentProgress.mistakesLogged.slice(-3).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Target Brief */}
        <div className="border-t border-hair pt-3 font-mono text-[10px] text-coffee space-y-0.5">
          <div className="flex items-center gap-1 text-espresso font-semibold">
            <Trophy size={13} className="text-amber-500" />
            <span>Target: $55–70k / ₹15–20 LPA</span>
          </div>
          <div className="opacity-70">YC Startups (Seed, Series A/B) · Global Tech</div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* RIGHT STUDIO WORKSPACE: FULL-BLEED SPACIOUS CHAT & RAYCAST PROMPT BAR */}
      {/* ==================================================================== */}
      <div className="flex flex-1 flex-col justify-between bg-cream-base dark:bg-[#0A0C10] overflow-hidden min-w-0">
        {/* Studio Top Control Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-hair px-4 sm:px-6 py-3 gap-2 min-w-0">
          {/* Sidebar Toggle & Mode Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar (Ctrl+B / ⌘B)" : "Collapse Sidebar (Ctrl+B / ⌘B)"}
              className={`p-1.5 font-mono text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                sidebarCollapsed
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                  : "border-hair text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <SidebarSimple size={16} weight="bold" />
              {sidebarCollapsed && (
                <>
                  <span className="hidden sm:inline">Sidebar</span>
                  <span className="text-[10px] opacity-70 font-mono">(⌘B)</span>
                </>
              )}
            </button>
            {(["grill", "code-review", "mock-interview"] as MentorMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`px-3 py-1 font-mono text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeMode === mode
                    ? "text-espresso border-b-2 border-amber-500"
                    : "text-coffee hover:text-espresso"
                }`}
              >
                {mode === "grill" ? (
                  <>
                    <Flame size={14} className="text-amber-500" />
                    <span>Socratic Grill</span>
                  </>
                ) : mode === "code-review" ? (
                  <>
                    <Code size={14} className="text-emerald-500" />
                    <span>Code Review</span>
                  </>
                ) : (
                  <>
                    <Trophy size={14} className="text-amber-500" />
                    <span>L6 Mock Interview</span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Model & Drawer Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                const assistantMsgs = currentMessages.filter((m) => m.role === "assistant" && m.content.trim().length > 0);
                if (assistantMsgs.length > 0) {
                  setReaderMsgIndex(assistantMsgs.length - 1);
                }
                setReaderOpen(true);
              }}
              title="Open Focus Reader Mode (Ctrl+R / ⌘R)"
              className="flex items-center gap-1.5 rounded-lg border border-hair bg-cream-raised dark:bg-[#12151E] px-2.5 py-1 font-mono text-xs font-bold text-espresso hover:border-amber-500 transition-all shadow-xs"
            >
              <BookOpen size={14} className="text-amber-500" />
              <span className="hidden sm:inline">Focus Reader</span>
              <span className="text-[10px] text-coffee opacity-60 font-mono hidden sm:inline">(⌘R)</span>
            </button>

            <button
              onClick={() => setSimulatorOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-bold text-amber-500 hover:bg-amber-500/20 transition-all shadow-xs"
            >
              <Trophy size={14} weight="bold" />
              <span className="hidden sm:inline">Timed L6 Simulator</span>
            </button>
            {/* Integrated Model Picker */}
            <div className="relative">
              <button
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="flex items-center gap-1.5 font-mono text-xs font-semibold text-coffee hover:text-espresso transition-colors"
              >
                <span>{AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name}</span>
                <CaretDown size={12} />
              </button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-hair bg-cream-raised dark:bg-[#161922] p-1 shadow-2xl backdrop-blur-2xl divide-y divide-hair"
                  >
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full p-2.5 text-left transition-colors ${
                          selectedModel === model.id ? "bg-amber-500/10 font-bold text-amber-600 dark:text-amber-400" : "text-coffee hover:text-espresso"
                        }`}
                      >
                        <div className="font-mono text-xs">{model.name}</div>
                        <div className="font-sans text-[10px] text-coffee opacity-80">{model.desc}</div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => toggleCodeDrawer(true)}
              className="flex items-center gap-1 text-xs font-mono font-bold text-espresso hover:text-amber-500 transition-colors"
            >
              <Code size={14} />
              <span>Submit Code</span>
            </button>

            <button
              onClick={() => clearCurrentThread()}
              className="text-coffee hover:text-rose-500 transition-colors"
              title="Clear Thread"
            >
              <Trash size={15} />
            </button>
          </div>
        </div>

        {/* Message Stream Container */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 min-w-0">
          {currentMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center space-y-4">
              <div className="rounded-full bg-amber-500/10 p-3 text-amber-500">
                <Brain size={32} />
              </div>
              <h2 className="text-xl font-bold text-espresso tracking-tight">
                AI Senior Mentor Studio
              </h2>
              <p className="max-w-md font-sans text-xs text-coffee leading-relaxed">
                Locked on <strong className="text-espresso">{currentTopicObj.title}</strong>. Ready for first-principles Socratic drilling, system architecture trade-offs, and code reviews.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  `Mentor, let's drill on core summary concepts for ${currentTopicObj.title}`,
                  "Guide me through Step 5: Visual Mental Model",
                  "Grill me on production failure trade-offs",
                  "Run an L6 Mock Interview and rank my performance",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(preset)}
                    className="border border-hair bg-cream-raised dark:bg-[#12151E] px-3.5 py-2 font-mono text-xs text-espresso hover:border-amber-500 transition-colors rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Lightning size={12} className="text-amber-500" />
                    <span>{preset}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentMessages.map((msg: ChatMessageItem, idx: number) => (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-2xl min-w-0 break-words rounded-2xl bg-espresso text-cream-raised dark:bg-cream-raised dark:text-espresso px-4 py-2.5 text-xs font-sans font-medium shadow-sm">
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                ) : (
                  <div className="w-full max-w-3xl min-w-0 break-words py-2 text-xs font-sans leading-relaxed text-espresso overflow-x-auto group relative">
                    <RenderMentorMessage content={msg.content} />
                    <button
                      onClick={() => {
                        const assistantMsgs = currentMessages.filter((m) => m.role === "assistant" && m.content.trim().length > 0);
                        const msgIdx = assistantMsgs.findIndex((m) => m.id === msg.id);
                        if (msgIdx !== -1) setReaderMsgIndex(msgIdx);
                        setReaderOpen(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 opacity-80 hover:opacity-100 hover:underline"
                    >
                      <BookOpen size={12} />
                      <span>Read in Focus Space</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Raycast-Style Floating Command Prompt Bar */}
        <div className="p-3 sm:p-4 border-t border-hair bg-cream-raised/40 dark:bg-[#0A0C10]/80 backdrop-blur-xl min-w-0">
          <div className="flex items-center gap-3 rounded-2xl border border-hair bg-cream-raised dark:bg-[#12151E] p-2 px-4 shadow-xl focus-within:border-amber-500 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask AI Mentor on ${currentTopicObj.title}... (Enter to send, Shift + Enter for new line)`}
              rows={1}
              className="flex-1 resize-none bg-transparent font-sans text-xs text-espresso placeholder-coffee focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-coffee hidden sm:inline-block">↵ Enter</span>
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isStreaming}
                className="flex items-center justify-center rounded-xl bg-espresso text-cream-raised dark:bg-cream-raised dark:text-espresso p-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-xs active:scale-95"
              >
                <PaperPlaneTilt size={14} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CO-READING SPACE: DISTRACTION-FREE FOCUS READER OVERLAY              */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {readerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-cream-base dark:bg-[#0A0C10] p-4 sm:p-8 overflow-hidden"
          >
            {/* Top Reader Toolbar */}
            <div className="flex flex-wrap items-center justify-between border-b border-hair pb-4 gap-4 max-w-5xl mx-auto w-full">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  <BookOpen size={20} weight="bold" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-espresso leading-tight">
                    Focus Reader Space
                  </h2>
                  <p className="font-mono text-[10px] text-coffee">
                    {currentTopicObj.title}
                  </p>
                </div>
              </div>

              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Answer Nav Pager */}
                {(() => {
                  const assistantMsgs = currentMessages.filter((m) => m.role === "assistant" && m.content.trim().length > 0);
                  if (assistantMsgs.length <= 1) return null;

                  return (
                    <div className="flex items-center gap-1.5 border border-hair rounded-xl px-2 py-1 bg-cream-raised dark:bg-[#12151E] font-mono text-xs text-espresso">
                      <button
                        disabled={readerMsgIndex === 0}
                        onClick={() => setReaderMsgIndex((prev) => Math.max(0, prev - 1))}
                        className="p-1 hover:text-amber-500 disabled:opacity-30"
                        title="Previous Answer"
                      >
                        <CaretLeft size={14} />
                      </button>
                      <span>
                        Answer {readerMsgIndex + 1} of {assistantMsgs.length}
                      </span>
                      <button
                        disabled={readerMsgIndex === assistantMsgs.length - 1}
                        onClick={() => setReaderMsgIndex((prev) => Math.min(assistantMsgs.length - 1, prev + 1))}
                        className="p-1 hover:text-amber-500 disabled:opacity-30"
                        title="Next Answer"
                      >
                        <CaretRight size={14} />
                      </button>
                    </div>
                  );
                })()}

                {/* Font Sizer (A- / A+) */}
                <div className="flex items-center gap-1 border border-hair rounded-xl px-2 py-1 bg-cream-raised dark:bg-[#12151E]">
                  <TextAa size={14} className="text-coffee" />
                  <button
                    onClick={() => {
                      const sizes: Array<"xs" | "sm" | "base" | "lg" | "xl"> = ["xs", "sm", "base", "lg", "xl"];
                      const idx = sizes.indexOf(readerFontSize);
                      if (idx > 0) setReaderFontSize(sizes[idx - 1]);
                    }}
                    disabled={readerFontSize === "xs"}
                    className="px-1.5 py-0.5 text-xs font-mono font-bold text-coffee hover:text-espresso disabled:opacity-30"
                    title="Decrease Font Size (A-)"
                  >
                    A-
                  </button>
                  <span className="font-mono text-[10px] text-amber-500 uppercase px-1 font-bold">
                    {readerFontSize}
                  </span>
                  <button
                    onClick={() => {
                      const sizes: Array<"xs" | "sm" | "base" | "lg" | "xl"> = ["xs", "sm", "base", "lg", "xl"];
                      const idx = sizes.indexOf(readerFontSize);
                      if (idx < sizes.length - 1) setReaderFontSize(sizes[idx + 1]);
                    }}
                    disabled={readerFontSize === "xl"}
                    className="px-1.5 py-0.5 text-xs font-mono font-bold text-coffee hover:text-espresso disabled:opacity-30"
                    title="Increase Font Size (A+)"
                  >
                    A+
                  </button>
                </div>

                {/* Typography Font Switcher */}
                <div className="flex items-center gap-1 border border-hair rounded-xl p-1 bg-cream-raised dark:bg-[#12151E] text-xs font-mono font-bold">
                  {(["sans", "serif", "handwriting"] as const).map((fontStyle) => (
                    <button
                      key={fontStyle}
                      onClick={() => setReaderFontFamily(fontStyle)}
                      className={`px-2.5 py-1 rounded-lg transition-all capitalize ${
                        readerFontFamily === fontStyle
                          ? "bg-amber-500 text-cream-raised font-bold shadow-xs"
                          : "text-coffee hover:text-espresso"
                      }`}
                    >
                      {fontStyle === "handwriting" ? "✍️ Note" : fontStyle}
                    </button>
                  ))}
                </div>

                {/* Copy Button */}
                {(() => {
                  const assistantMsgs = currentMessages.filter((m) => m.role === "assistant" && m.content.trim().length > 0);
                  const activeMsg = assistantMsgs[readerMsgIndex] || assistantMsgs[assistantMsgs.length - 1];

                  if (!activeMsg) return null;

                  return (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeMsg.content);
                        setCopiedReaderText(true);
                        setTimeout(() => setCopiedReaderText(false), 2000);
                      }}
                      className="p-2 border border-hair rounded-xl bg-cream-raised dark:bg-[#12151E] text-coffee hover:text-espresso"
                      title="Copy Answer Text"
                    >
                      {copiedReaderText ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  );
                })()}

                <button
                  onClick={() => setReaderOpen(false)}
                  className="p-2 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] text-coffee hover:text-espresso"
                  title="Close Focus Reader (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Reading Document Canvas */}
            <div className="flex-1 overflow-y-auto py-8 px-4 sm:px-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {(() => {
                  const assistantMsgs = currentMessages.filter((m) => m.role === "assistant" && m.content.trim().length > 0);
                  const activeMsg = assistantMsgs[readerMsgIndex] || assistantMsgs[assistantMsgs.length - 1];

                  if (!activeMsg) {
                    return (
                      <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                        <BookOpen size={40} className="text-amber-500 opacity-60" />
                        <p className="font-mono text-sm text-coffee">No mentor answer available yet to read.</p>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={activeMsg.id || readerMsgIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-6 sm:p-10 shadow-2xl transition-all ${
                        readerFontFamily === "handwriting"
                          ? "font-handwriting text-amber-950 dark:text-amber-100 bg-[#FFFDF7] dark:bg-[#14120D]"
                          : readerFontFamily === "serif"
                          ? "font-reader-serif text-espresso"
                          : "font-reader-sans text-espresso"
                      } ${
                        readerFontSize === "xs"
                          ? "text-xs leading-relaxed"
                          : readerFontSize === "sm"
                          ? "text-sm leading-relaxed"
                          : readerFontSize === "base"
                          ? "text-base leading-relaxed md:text-lg"
                          : readerFontSize === "lg"
                          ? "text-lg leading-relaxed md:text-xl"
                          : "text-xl leading-relaxed md:text-2xl"
                      }`}
                    >
                      <RenderMentorMessage content={activeMsg.content} />
                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code Review Slide-Over Drawer */}
      <CodeReviewDrawer />

      {/* L6 Staff Timed Interview Simulator Modal */}
      <InterviewSimulatorModal open={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </div>
  );
}

/**
 * Message Content Parser:
 * Dynamically detects Mermaid ```mermaid ``` blocks and renders them with <MermaidRenderer />!
 */
function RenderMentorMessage({ content }: { content: string }) {
  // Strip hidden <!--META:...--> tags from visible text rendering
  const cleanContent = content.replace(/<!--META:[\s\S]*?-->/g, "");

  const mermaidRegex = /```mermaid\s*([\s\S]*?)```/g;

  // Split content by mermaid blocks
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(cleanContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: cleanContent.substring(lastIndex, match.index) });
    }
    parts.push({ type: "mermaid", value: match[1] });
    lastIndex = mermaidRegex.lastIndex;
  }

  if (lastIndex < cleanContent.length) {
    parts.push({ type: "text", value: cleanContent.substring(lastIndex) });
  }

  return (
    <div className="space-y-3">
      {parts.map((part, idx) => {
        if (part.type === "mermaid") {
          return <MermaidRenderer key={idx} chart={part.value} />;
        }
        return (
          <div
            key={idx}
            className="prose dark:prose-invert prose-xs max-w-none text-espresso leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(part.value) }}
          />
        );
      })}
    </div>
  );
}
