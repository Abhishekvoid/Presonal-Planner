"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import {
  Brain,
  PaperPlaneTilt,
  Code,
  Gear,
  Key,
  Flame,
  Trash,
  Stack,
  TerminalWindow,
  ArrowsClockwise,
  ArrowUpRight,
  Sparkle,
  Copy,
  Check,
  Lightning,
  CheckCircle,
} from "@phosphor-icons/react";
import { useMentorStore } from "@/lib/mentorStore";
import { MentorMode } from "@/lib/ai/prompt";
import { CodeReviewDrawer } from "./system/CodeReviewDrawer";

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
  { id: "general-backend", title: "General Backend & Systems Design", day: 1 },
  { id: "fde-01", title: "DB Internals & Indexing (B-Trees vs LSM)", day: 2 },
  { id: "fde-02", title: "Distributed Consensus (Raft & Paxos)", day: 3 },
  { id: "fde-03", title: "Caching & Consistency (Write-Through vs Write-Back)", day: 4 },
  { id: "fde-04", title: "Message Queues & Event Streaming (Kafka vs RabbitMQ)", day: 5 },
  { id: "fde-05", title: "Rate Limiting & Token Buckets at Scale", day: 6 },
  { id: "fde-06", title: "WAL & Crash Recovery Mechanisms", day: 7 },
  { id: "fde-07", title: "Memory Allocation & GC Profiling", day: 8 },
  { id: "fde-08", title: "Load Balancing & Consistency Hashing", day: 9 },
  { id: "fde-09", title: "AI Systems Infrastructure & Vector Search", day: 10 },
];

export function MentorView() {
  const {
    activeTopicId,
    activeTopicContext,
    activeMode,
    threads,
    customApiKey,
    provider,
    selectedModel,
    isStreaming,
    setActiveTopic,
    setMode,
    setCustomApiKey,
    setProvider,
    setSelectedModel,
    addMessage,
    appendToLastMessage,
    setLastMessageContent,
    setStreaming,
    toggleCodeDrawer,
    clearCurrentThread,
  } = useMentorStore();

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stepperRef = useRef<HTMLDivElement>(null);

  const currentMessages = threads[activeTopicId] || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isStreaming]);

  // GSAP animation for 13-step stepper bar track
  useEffect(() => {
    if (!stepperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stepper-node",
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: "power2.out" }
      );
    }, stepperRef);
    return () => ctx.revert();
  }, [activeTopicId]);

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
      const payloadMessages = [...currentMessages, { role: "user", content: query }].map((m) => ({
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
        if (errorData.error === "NO_API_KEY") {
          setLastMessageContent(
            "⚠️ **API Key Required**: No API key was found in environment or local settings.\n\nPlease click the **Settings ⚙️** icon in the top right to configure your OpenRouter key."
          );
        } else {
          setLastMessageContent(
            `⚠️ **API Error (${res.status})**: ${errorData.message || "Failed to reach AI service."}`
          );
        }
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body reader");

      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const contentChunk = parsed.choices?.[0]?.delta?.content || "";
                if (contentChunk) {
                  fullText += contentChunk;
                  appendToLastMessage(contentChunk);
                }
              } catch {
                // Ignore parse errors for raw stream fragments
              }
            }
          }
        }
      }

      if (!fullText) {
        setLastMessageContent(
          "I have processed your query. Let's analyze the first principles of this problem."
        );
      }
    } catch (err: any) {
      setLastMessageContent(`⚠️ Connection error: ${err.message}`);
    } finally {
      setStreaming(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSettings = () => {
    setCustomApiKey(apiKeyInput.trim());
    setShowSettings(false);
  };

  return (
    <div className="relative flex h-[calc(100vh-90px)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0A0C10]/95 text-cream font-sans shadow-2xl backdrop-blur-2xl">
      {/* Ambient Mesh Orbs Glow Background */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none animate-ambient-orb" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-ambient-orb" />

      <CodeReviewDrawer />

      {/* TOP HEADER */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#0e0f14]/80 px-6 py-3.5 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Brain size={24} weight="fill" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-cream">
                Senior Backend Engineering Mentor
              </h1>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 shadow-sm">
                10-Day Sprint
              </span>
            </div>
            <p className="text-xs text-cream/60">
              Socratic learning • First Principles • Production Code Reviews • Mock Interviews
            </p>
          </div>
        </div>

        {/* MODE TOGGLES WITH FRAMER MOTION SPRING PILL MORPHING */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center rounded-2xl border border-white/10 bg-black/60 p-1 shadow-inner backdrop-blur-md">
            {(["grill", "code-review", "mock-interview"] as MentorMode[]).map((modeKey) => {
              const isActive = activeMode === modeKey;
              const modeLabel =
                modeKey === "grill"
                  ? "Socratic Grill"
                  : modeKey === "code-review"
                  ? "Code Review"
                  : "Mock Interview";
              const ModeIcon =
                modeKey === "grill"
                  ? Flame
                  : modeKey === "code-review"
                  ? Code
                  : TerminalWindow;

              return (
                <button
                  key={modeKey}
                  onClick={() => setMode(modeKey)}
                  className={`relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                    isActive ? "text-black" : "text-cream/70 hover:text-cream"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-mentor-mode-pill"
                      className="absolute inset-0 z-[-1] rounded-xl bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <ModeIcon size={14} weight={isActive ? "bold" : "regular"} />
                  <span>{modeLabel}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => toggleCodeDrawer(true)}
            className="group flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 font-mono text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
          >
            <Code size={15} />
            <span>Code Workbench</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={10} weight="bold" />
            </span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-cream/70 hover:bg-white/10 hover:text-cream transition-colors"
            title="Configure API Key & Models"
          >
            <Gear size={18} />
          </button>

          <button
            onClick={clearCurrentThread}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-cream/50 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Clear Chat Thread"
          >
            <Trash size={18} />
          </button>
        </div>
      </header>

      {/* SUB-BAR: TOPIC CONTEXT & 13-STEP INTERACTIVE GSAP STEPPER */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-white/5 bg-[#0b0c10]/90 px-6 py-2.5 gap-3">
        <div className="flex items-center gap-2">
          <Stack size={16} className="text-amber-400" />
          <span className="font-mono text-xs font-semibold text-cream/60">Active Topic:</span>
          <select
            value={activeTopicId}
            onChange={(e) => {
              const selected = PRESET_TOPICS.find((t) => t.id === e.target.value);
              if (selected) {
                setActiveTopic(selected.id, {
                  id: selected.id,
                  title: selected.title,
                  sprintDay: selected.day,
                });
              }
            }}
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-1 font-mono text-xs text-cream focus:border-amber-400 focus:outline-none"
          >
            {PRESET_TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                Day {t.day}: {t.title}
              </option>
            ))}
          </select>
        </div>

        {/* 13-STEP INTERACTIVE STEPPER TRACK */}
        <div ref={stepperRef} className="flex items-center gap-1.5 overflow-x-auto mentor-scrollbar py-1">
          {STRUCTURE_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() =>
                handleSendMessage(
                  `Mentor, guide me step-by-step through Step ${step.id} (${step.label}) for this topic.`
                )
              }
              className="stepper-node group flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-cream/60 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300 transition-all whitespace-nowrap"
              title={`Direct Mentor to ${step.label}`}
            >
              <span>{step.short}</span>
              <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* SETTINGS MODAL OVERLAY */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12141a] p-6 text-cream shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Key size={22} className="text-amber-400" />
                <h3 className="text-lg font-bold">AI Mentor Model Settings</h3>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="font-mono text-xs font-semibold text-cream/70">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-cream"
                  >
                    <option value="openrouter">OpenRouter (DeepSeek V4 / Nemotron 3 / Qwen / Gemini)</option>
                    <option value="gemini">Google Gemini (gemini-1.5-pro / 2.0-flash)</option>
                    <option value="groq">Groq (llama-3.3-70b-versatile)</option>
                    <option value="openai">OpenAI (gpt-4o-mini / gpt-4o)</option>
                  </select>
                </div>

                {provider === "openrouter" && (
                  <div>
                    <label className="font-mono text-xs font-semibold text-cream/70">Model Assignment</label>
                    <select
                      value={selectedModel || "auto"}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-cream"
                    >
                      <option value="auto">⚡ Auto-Switch (DeepSeek v4 Flash for Reasoning, Nemotron 3 550B for Coding)</option>
                      <option value="deepseek/deepseek-v4-flash:free">deepseek/deepseek-v4-flash:free (Reasoning & Systems Grill)</option>
                      <option value="nvidia/nemotron-3-ultra-550b-a55b:free">nvidia/nemotron-3-ultra-550b-a55b:free (Coding & Intelligence)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="font-mono text-xs font-semibold text-cream/70">Custom API Key</label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-or-v1-... or gsk_..."
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-cream placeholder-cream/30 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 font-mono text-[11px] text-cream/40">
                    Optional: Reads from your `.env` file (`OPENROUTER_API_KEY`) if left blank.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-xl px-4 py-2 font-mono text-xs text-cream/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="rounded-xl bg-amber-500 px-5 py-2 font-mono text-xs font-bold text-black hover:bg-amber-400 shadow-lg"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT MESSAGES STREAM THREAD */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 space-y-6 mentor-scrollbar">
        {currentMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-md">
                <Brain size={20} weight="fill" />
              </div>
            )}

            <div
              className={`relative max-w-3xl rounded-2xl p-5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/35 text-cream shadow-md"
                  : "bg-[#11131a]/95 border border-white/10 text-cream/90 shadow-xl backdrop-blur-md"
              }`}
            >
              {msg.mode && (
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold tracking-widest text-amber-400/90">
                    {msg.mode === "code-review" && <Code size={13} weight="bold" />}
                    {msg.mode === "mock-interview" && <TerminalWindow size={13} weight="bold" />}
                    {msg.mode === "grill" && <Flame size={13} weight="bold" />}
                    <span>{msg.mode} mode</span>
                  </div>

                  {msg.role === "assistant" && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="text-cream/40 hover:text-cream/90 transition-colors p-1"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</div>

              <div className="mt-3 font-mono text-[10px] text-cream/30">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {msg.role === "user" && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cream border border-white/20 font-bold font-mono text-xs shadow-md">
                You
              </div>
            )}
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPT CHIPS WITH NESTED TRAILING ICON SHIFT */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 border-t border-white/5 bg-[#0a0b0e]/95 px-6 py-2.5">
        <span className="font-mono text-[11px] font-semibold text-cream/40">Quick Action:</span>
        <button
          onClick={() => handleSendMessage("Give me a subtle hint to solve this, don't reveal the code yet.")}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-cream/80 hover:border-amber-500/40 hover:bg-amber-500/15 hover:text-amber-300 transition-all"
        >
          <span>💡 Ask for Hint</span>
          <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
        <button
          onClick={() => handleSendMessage("What are the core computer science First Principles behind this topic?")}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-cream/80 hover:border-amber-500/40 hover:bg-amber-500/15 hover:text-amber-300 transition-all"
        >
          <span>🔬 First Principles</span>
          <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
        <button
          onClick={() => handleSendMessage("Give me an L6 Senior Backend interview question on this topic.")}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-cream/80 hover:border-amber-500/40 hover:bg-amber-500/15 hover:text-amber-300 transition-all"
        >
          <span>🎯 L6 Interview Question</span>
          <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
        <button
          onClick={() => handleSendMessage("What are the production trade-offs (latency vs memory vs throughput)?")}
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-cream/80 hover:border-amber-500/40 hover:bg-amber-500/15 hover:text-amber-300 transition-all"
        >
          <span>⚖️ Production Trade-offs</span>
          <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* INPUT AREA */}
      <div className="relative z-10 border-t border-white/10 bg-[#0e0f14]/95 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={
              activeMode === "code-review"
                ? "Ask about code optimizations, memory leaks, or open Code Workbench..."
                : activeMode === "mock-interview"
                ? "Answer the interviewer or ask a clarifying system question..."
                : "Ask or answer a first-principles question (e.g. 'How does WAL guarantee crash recovery?')"
            }
            className="w-full rounded-2xl border border-white/15 bg-black/70 py-3.5 pl-5 pr-14 font-sans text-sm text-cream placeholder-cream/30 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 transition-all shadow-lg active:scale-95"
          >
            {isStreaming ? (
              <ArrowsClockwise size={18} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={18} weight="fill" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
