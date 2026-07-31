"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Sparkle,
  PencilLine,
  Highlighter,
  X,
  CaretLeft,
  CaretRight,
  TextAa,
  List,
  Copy,
  Check,
  PaperPlaneRight,
  Brain,
  ChatCircleText,
  SidebarSimple,
  Diamond,
} from "@phosphor-icons/react";
import { renderMarkdown } from "@/lib/markdown";
import { sendToObsidian, downloadObsidianMarkdown } from "@/lib/obsidian";
import { MermaidRenderer } from "./MermaidRenderer";

export interface HighlightItem {
  id: string;
  text: string;
  badge: string;
}

export interface CoReadingWorkspaceProps {
  open: boolean;
  onClose: () => void;
  topicTitle: string;
  sprintDay: number;
  content: string;
  onSendMessage: (query: string) => void;
  assistantAnswers?: string[];
  isLoading?: boolean;
}

export function CoReadingWorkspace({
  open,
  onClose,
  topicTitle,
  sprintDay,
  content,
  onSendMessage,
  assistantAnswers = [],
  isLoading = false,
}: CoReadingWorkspaceProps) {
  const [selectedText, setSelectedText] = useState("");
  const [popoverCoords, setPopoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "base" | "lg">("base");
  const [readerFontFamily, setReaderFontFamily] = useState<"sans" | "serif" | "handwriting">("sans");
  const [queryInput, setQueryInput] = useState("");
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [aiMentorCollapsed, setAiMentorCollapsed] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat stream to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assistantAnswers, isLoading]);

  // Handle native text selection on the left reading canvas
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPopoverCoords(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 3 && canvasRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setPopoverCoords({
        x: Math.min(window.innerWidth - 220, Math.max(20, rect.left + rect.width / 2 - 100)),
        y: Math.max(60, rect.top - 50),
      });
    }
  };

  // Action: Ask AI about selected text
  const handleAskAIAboutSelection = () => {
    if (!selectedText) return;
    const prompt = `Can you explain this specific concept in detail?\n\n"${selectedText}"`;
    if (aiMentorCollapsed) setAiMentorCollapsed(false);
    onSendMessage(prompt);
    setPopoverCoords(null);
  };

  // Action: Highlight selected text
  const handleAddHighlight = () => {
    if (!selectedText) return;
    const badgeNum = highlights.length + 1;
    const newHighlight: HighlightItem = {
      id: `hl-${Date.now()}`,
      text: selectedText,
      badge: `p.${117 + badgeNum}`,
    };
    setHighlights((prev) => [...prev, newHighlight]);
    setPopoverCoords(null);
  };

  // Action: Save Selection to Obsidian Note
  const handleSaveSelectionToObsidian = () => {
    if (!selectedText) return;
    sendToObsidian({
      title: `${topicTitle} - Key Concept`,
      content: selectedText,
      topic: topicTitle,
      day: sprintDay,
      tags: ["co-reading", "key-concept"],
    });
    setPopoverCoords(null);
  };

  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim() || isLoading) return;
    onSendMessage(queryInput.trim());
    setQueryInput("");
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex flex-col bg-cream-base dark:bg-[#07090E] text-espresso dark:text-[#F3F4F6] overflow-hidden"
      >
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between border-b border-hair px-4 py-3 bg-cream-raised dark:bg-[#0A0C10] shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-emerald-400 border border-amber-500/30 dark:border-emerald-500/30">
              <BookOpen size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-espresso dark:text-emerald-400">
                  {topicTitle}
                </span>
                <span className="font-mono text-[10px] text-coffee dark:text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                  Day {sprintDay}
                </span>
              </div>
              <p className="font-mono text-[10px] text-coffee dark:text-zinc-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Reading alongside you · answers cite the text
              </p>
            </div>
          </div>

          {/* Controls: Font sizer, font family, AI Mentor Toggle, Obsidian, Close */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Font sizer */}
            <div className="flex items-center gap-1 border border-hair rounded-lg px-2 py-1 bg-cream-base dark:bg-white/5">
              <TextAa size={14} className="text-coffee dark:text-zinc-400" />
              <button
                onClick={() => setReaderFontSize("sm")}
                className={`px-1.5 text-xs font-mono font-bold ${
                  readerFontSize === "sm" ? "text-amber-600 dark:text-emerald-400 font-extrabold" : "text-coffee dark:text-zinc-400 hover:text-espresso dark:hover:text-white"
                }`}
              >
                A-
              </button>
              <button
                onClick={() => setReaderFontSize("base")}
                className={`px-1.5 text-xs font-mono font-bold ${
                  readerFontSize === "base" ? "text-amber-600 dark:text-emerald-400 font-extrabold" : "text-coffee dark:text-zinc-400 hover:text-espresso dark:hover:text-white"
                }`}
              >
                BASE
              </button>
              <button
                onClick={() => setReaderFontSize("lg")}
                className={`px-1.5 text-xs font-mono font-bold ${
                  readerFontSize === "lg" ? "text-amber-600 dark:text-emerald-400 font-extrabold" : "text-coffee dark:text-zinc-400 hover:text-espresso dark:hover:text-white"
                }`}
              >
                A+
              </button>
            </div>

            {/* Typography switch */}
            <div className="flex items-center gap-1 border border-hair rounded-lg p-1 bg-cream-base dark:bg-white/5 text-xs font-mono">
              {(["sans", "serif", "handwriting"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setReaderFontFamily(style)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    readerFontFamily === style
                      ? "bg-amber-500 dark:bg-emerald-500 text-black font-bold"
                      : "text-coffee dark:text-zinc-400 hover:text-espresso dark:hover:text-white"
                  }`}
                >
                  {style === "handwriting" ? "Script" : style}
                </button>
              ))}
            </div>

            {/* AI Reading Mentor Toggle Button */}
            {aiMentorCollapsed && (
              <button
                onClick={() => setAiMentorCollapsed(false)}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-mono text-xs font-bold transition-all shadow-xs"
                title="Open AI Reading Mentor Side Panel"
              >
                <Brain size={15} />
                <span>Open AI Mentor</span>
              </button>
            )}

            {/* Obsidian Save */}
            <button
              onClick={() => {
                sendToObsidian({
                  title: `${topicTitle} - Day ${sprintDay}`,
                  content,
                  topic: topicTitle,
                  day: sprintDay,
                });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 rounded-lg font-mono text-xs font-bold transition-all"
              title="Save to Obsidian"
            >
              <Diamond size={13} />
              <span className="hidden sm:inline">Obsidian</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-hair bg-cream-base dark:bg-white/5 text-coffee dark:text-zinc-400 hover:text-espresso dark:hover:text-white transition-all"
              title="Close Workspace (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main Split-Screen Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
          {/* ================================================================ */}
          {/* LEFT PANE: DOCUMENT READING CANVAS                               */}
          {/* ================================================================ */}
          <div
            ref={canvasRef}
            onMouseUp={handleMouseUp}
            className={`flex-1 border-b md:border-b-0 border-hair overflow-y-auto p-6 sm:p-10 select-text relative transition-all duration-300 ${
              aiMentorCollapsed ? "w-full max-w-5xl mx-auto border-r-0" : "md:w-7/12 md:border-r"
            }`}
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Document Title Banner */}
              <div className="border-b border-hair pb-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-amber-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-1">
                    CORE MODULE // REVISION CANAL
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-espresso dark:text-white tracking-tight">
                    {topicTitle}
                  </h1>
                </div>

                {/* Collapsed Badge Indicator */}
                {aiMentorCollapsed && (
                  <button
                    onClick={() => setAiMentorCollapsed(false)}
                    className="font-mono text-xs text-coffee dark:text-zinc-400 hover:text-amber-500 flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-hair"
                  >
                    <span>Full Reading Width</span>
                    <SidebarSimple size={14} />
                  </button>
                )}
              </div>

              {/* Luminous Highlights Panel if highlights exist */}
              {highlights.length > 0 && (
                <div className="space-y-2 bg-amber-500/10 dark:bg-emerald-500/5 border border-amber-500/20 dark:border-emerald-500/20 p-4 rounded-xl">
                  <div className="font-mono text-[10px] uppercase font-bold text-amber-600 dark:text-emerald-400 flex items-center gap-1">
                    <Highlighter size={12} />
                    <span>Saved Focus Highlights ({highlights.length})</span>
                  </div>
                  <div className="space-y-2">
                    {highlights.map((hl) => (
                      <div
                        key={hl.id}
                        onClick={() => setActiveHighlightId(hl.id)}
                        className="flex items-start justify-between gap-3 text-xs bg-cream-raised dark:bg-black/40 p-2.5 rounded-lg border border-hair hover:border-amber-500 dark:hover:border-emerald-500/40 transition-colors cursor-pointer"
                      >
                        <p className="text-espresso dark:text-zinc-200 font-sans italic">"{hl.text}"</p>
                        <span className="font-mono text-[10px] bg-amber-500/20 dark:bg-emerald-500/20 text-amber-700 dark:text-emerald-300 px-2 py-0.5 rounded font-bold shrink-0">
                          {hl.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Document Text */}
              <div
                className={`transition-all ${
                  readerFontFamily === "handwriting"
                    ? "font-handwriting text-amber-900 dark:text-amber-100 bg-[#FDFBF7] dark:bg-[#14120D] p-6 rounded-2xl border border-amber-500/20"
                    : readerFontFamily === "serif"
                    ? "font-reader-serif text-espresso dark:text-zinc-100"
                    : "font-reader-sans text-espresso dark:text-zinc-100"
                } ${
                  readerFontSize === "sm"
                    ? "text-sm leading-relaxed"
                    : readerFontSize === "base"
                    ? "text-base leading-relaxed md:text-lg"
                    : "text-lg leading-relaxed md:text-xl"
                }`}
              >
                <RenderMarkdownContent text={content} />
              </div>
            </div>

            {/* Floating Selection Popover Toolbar */}
            <AnimatePresence>
              {popoverCoords && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  style={{
                    position: "fixed",
                    top: popoverCoords.y,
                    left: popoverCoords.x,
                  }}
                  className="z-50 flex items-center gap-1.5 bg-cream-raised dark:bg-[#181C24] border border-amber-500/40 dark:border-emerald-500/40 shadow-2xl p-1.5 rounded-xl text-xs font-mono"
                >
                  <button
                    onClick={handleAskAIAboutSelection}
                    className="flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/30 px-2.5 py-1 rounded-lg font-bold transition-all"
                  >
                    <Sparkle size={14} className="text-emerald-500 dark:text-emerald-400" />
                    <span>Ask AI</span>
                  </button>
                  <button
                    onClick={handleAddHighlight}
                    className="flex items-center gap-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 px-2 py-1 rounded-lg font-bold transition-all"
                  >
                    <Highlighter size={14} className="text-amber-500 dark:text-amber-400" />
                    <span>Highlight</span>
                  </button>
                  <button
                    onClick={handleSaveSelectionToObsidian}
                    className="flex items-center gap-1 bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-500/30 px-2 py-1 rounded-lg font-bold transition-all"
                  >
                    <Diamond size={13} className="text-purple-500 dark:text-purple-400" />
                    <span>Note</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ================================================================ */}
          {/* RIGHT PANE: LIVE AI COMPANION CHAT                               */}
          {/* ================================================================ */}
          {!aiMentorCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.2 }}
              className="flex-1 md:w-5/12 flex flex-col bg-cream-raised dark:bg-[#0E1117] overflow-hidden min-h-0 border-l border-hair"
            >
              {/* Chat Stream Header with Collapse X Button */}
              <div className="px-4 py-3 border-b border-hair flex items-center justify-between bg-black/5 dark:bg-black/20">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-espresso dark:text-zinc-300">
                  <Brain size={16} className="text-amber-500 dark:text-emerald-400" />
                  <span>AI READING MENTOR</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-coffee dark:text-zinc-500 hidden sm:inline">
                    Ling 3.0 Flash 124B MoE
                  </span>
                  <button
                    onClick={() => setAiMentorCollapsed(true)}
                    className="p-1 rounded text-coffee hover:text-espresso dark:hover:text-white transition-colors"
                    title="Collapse AI Reading Mentor Panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Stream Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {assistantAnswers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 text-coffee dark:text-zinc-500 p-6 border border-dashed border-hair rounded-2xl my-auto">
                    <ChatCircleText size={36} className="text-amber-500 dark:text-emerald-400 opacity-60" />
                    <p className="font-mono text-xs text-espresso dark:text-zinc-300 font-bold">
                      Select any sentence or concept on the left to ask AI or generate revision notes!
                    </p>
                    <p className="font-mono text-[11px] text-coffee dark:text-zinc-500">
                      Answers cite exact text passages with clickable green citation badges.
                    </p>
                  </div>
                ) : (
                  assistantAnswers.map((ans, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-cream-base dark:bg-[#141822] border border-hair p-4 rounded-xl space-y-2 text-xs font-sans text-espresso dark:text-zinc-200 leading-relaxed shadow-sm"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px] text-coffee dark:text-zinc-400 border-b border-hair pb-1.5">
                        <span className="text-amber-600 dark:text-emerald-400 font-bold">Answer #{idx + 1}</span>
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                          ↖ cited
                        </span>
                      </div>
                      <RenderMarkdownContent text={ans} />
                    </motion.div>
                  ))
                )}

                {isLoading && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 dark:bg-emerald-500/5 border border-amber-500/20 dark:border-emerald-500/20 rounded-xl text-xs font-mono text-amber-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-emerald-400 animate-ping" />
                    <span>Synthesizing citation & deep analysis...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Prompt Input Form */}
              <form
                onSubmit={handleSendChat}
                className="p-3 border-t border-hair bg-cream-base dark:bg-[#0A0C10] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Ask AI about this topic or selected concept..."
                  className="flex-1 bg-cream-raised dark:bg-white/5 border border-hair rounded-xl px-3 py-2 text-xs text-espresso dark:text-white placeholder-coffee dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 dark:focus:border-emerald-500/50 font-sans"
                />
                <button
                  type="submit"
                  disabled={!queryInput.trim() || isLoading}
                  className="p-2 bg-espresso text-cream-raised dark:bg-emerald-500 dark:text-black font-bold rounded-xl hover:opacity-90 dark:hover:bg-emerald-400 disabled:opacity-30 transition-all active:scale-95"
                  title="Send Prompt (Enter)"
                >
                  <PaperPlaneRight size={16} weight="bold" />
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Bottom Floating Control Dock */}
        <div className="py-2 bg-cream-raised dark:bg-[#0A0C10] border-t border-hair flex items-center justify-center">
          <div className="flex items-center gap-3 font-mono text-xs bg-cream-base dark:bg-[#141822] border border-hair px-4 py-1.5 rounded-full shadow-sm">
            <span className="text-amber-600 dark:text-emerald-400 font-bold">B — Co-reading workspace</span>
            <span className="text-hair">|</span>
            <span className="text-coffee dark:text-zinc-400 text-[11px]">1-4 / ← →</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function RenderMarkdownContent({ text }: { text: string }) {
  const html = renderMarkdown(text);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
