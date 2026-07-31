"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreeStructure,
  Sliders,
  WarningOctagon,
  CheckCircle,
  X,
  Copy,
  Check,
  Sparkle,
  ShareNetwork,
} from "@phosphor-icons/react";
import { MermaidRenderer } from "./MermaidRenderer";
import { PRESET_SYSTEM_DESIGNS, SystemArchitectureTemplate } from "@/lib/systemDesign";
import { sendToObsidian, downloadObsidianMarkdown } from "@/lib/obsidian";

export interface SystemDesignCanvasProps {
  open: boolean;
  onClose: () => void;
  onSelectDesignForMentor?: (template: SystemArchitectureTemplate) => void;
}

export function SystemDesignCanvas({
  open,
  onClose,
  onSelectDesignForMentor,
}: SystemDesignCanvasProps) {
  const [selectedDesign, setSelectedDesign] = useState<SystemArchitectureTemplate>(PRESET_SYSTEM_DESIGNS[0]);
  const [activeTab, setActiveTab] = useState<"diagram" | "tradeoffs" | "failures" | "criteria">("diagram");
  const [copiedDiagram, setCopiedDiagram] = useState(false);

  if (!open) return null;

  const handleObsidianExport = () => {
    const markdownContent = `
# ${selectedDesign.title}

## System Description
${selectedDesign.description}

## Architecture Diagram (Mermaid)
\`\`\`mermaid
${selectedDesign.mermaidChart}
\`\`\`

## Trade-off Analysis Matrix
${selectedDesign.tradeOffs
  .map(
    (t) => `### ${t.metric}
- **Option A**: ${t.optionA}
- **Option B**: ${t.optionB}
- **Verdict**: ${t.verdict}
`
  )
  .join("\n")}

## Distributed Failure Modes & Mitigations
${selectedDesign.failureModes
  .map(
    (f) => `- **${f.mode}**: Impact: *${f.impact}* → Mitigation: **${f.mitigation}**`
  )
  .join("\n")}

## Senior Staff Evaluation Criteria
${selectedDesign.seniorCriteria.map((c) => `- [ ] ${c}`).join("\n")}
`;

    sendToObsidian({
      title: `System Design - ${selectedDesign.title}`,
      content: markdownContent,
      topic: selectedDesign.category,
      tags: ["system-design", "architecture", "l6-staff"],
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#0A0C10] text-espresso dark:text-zinc-100 p-4 sm:p-6 overflow-hidden"
      >
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between border-b border-hair pb-4 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <TreeStructure size={22} weight="bold" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                System Design Architecture Canvas
              </h2>
              <p className="font-mono text-xs text-coffee">
                Interactive Distributed Architecture & Trade-off Engineering Matrix
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleObsidianExport}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 rounded-xl font-mono text-xs font-bold transition-all"
              title="Save System Design to Obsidian Vault"
            >
              <span>💎</span>
              <span className="hidden sm:inline">Export Design to Obsidian</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] text-coffee hover:text-espresso"
              title="Close Canvas (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Main Canvas Grid */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 pt-4 gap-4">
          {/* Left Design Template Explorer Sidebar */}
          <div className="w-full lg:w-72 flex flex-col border-b lg:border-b-0 lg:border-r border-hair pr-0 lg:pr-4 space-y-3 shrink-0 overflow-y-auto max-h-48 lg:max-h-none">
            <div className="font-mono text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
              Architecture Modules
            </div>
            <div className="space-y-2">
              {PRESET_SYSTEM_DESIGNS.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedDesign(template)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${
                    selectedDesign.id === template.id
                      ? "border-amber-500 bg-amber-500/10 shadow-sm"
                      : "border-hair bg-cream-raised dark:bg-[#12151E] hover:border-amber-500/40"
                  }`}
                >
                  <div className="font-mono text-[10px] text-coffee uppercase font-semibold">
                    {template.category}
                  </div>
                  <div className="font-bold text-xs text-espresso mt-0.5">
                    {template.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Center Main Diagram & Analysis Pane */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Tabs Bar */}
            <div className="flex border-b border-hair text-xs font-mono font-bold mb-4">
              {[
                { id: "diagram", label: "🗺 Architecture Diagram", icon: TreeStructure },
                { id: "tradeoffs", label: "⚖️ Trade-off Matrix", icon: Sliders },
                { id: "failures", label: "⚠️ Failure Modes", icon: WarningOctagon },
                { id: "criteria", label: "🎯 L6 Evaluation Criteria", icon: CheckCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-amber-500 text-espresso font-extrabold"
                      : "border-transparent text-coffee hover:text-espresso"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
              {/* TAB 1: DIAGRAM */}
              {activeTab === "diagram" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] space-y-2">
                    <h3 className="text-sm font-bold text-espresso">
                      {selectedDesign.title}
                    </h3>
                    <p className="font-sans text-xs text-coffee leading-relaxed">
                      {selectedDesign.description}
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] shadow-xl overflow-x-auto">
                    <MermaidRenderer chart={selectedDesign.mermaidChart} />
                  </div>
                </div>
              )}

              {/* TAB 2: TRADEOFFS */}
              {activeTab === "tradeoffs" && (
                <div className="space-y-4">
                  <div className="font-mono text-xs font-bold text-amber-500">
                    System Design Trade-off Matrix
                  </div>
                  <div className="space-y-3 font-sans text-xs">
                    {selectedDesign.tradeOffs.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] space-y-2 shadow-sm"
                      >
                        <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                          {t.metric}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-hair">
                            <span className="font-mono text-[10px] text-coffee block font-bold">Option A</span>
                            <span className="text-espresso">{t.optionA}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-hair">
                            <span className="font-mono text-[10px] text-coffee block font-bold">Option B</span>
                            <span className="text-espresso">{t.optionB}</span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-medium">
                          <span className="font-bold">Verdict: </span>
                          {t.verdict}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: FAILURE MODES */}
              {activeTab === "failures" && (
                <div className="space-y-3 font-sans text-xs">
                  <div className="font-mono text-xs font-bold text-amber-500">
                    Distributed Failure Modes & Self-Healing Mitigations
                  </div>
                  {selectedDesign.failureModes.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] space-y-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                        <WarningOctagon size={16} />
                        <span>{f.mode}</span>
                      </div>
                      <p className="text-coffee">
                        <strong className="text-espresso">Impact: </strong>
                        {f.impact}
                      </p>
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        <strong className="font-bold">Mitigation Strategy: </strong>
                        {f.mitigation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: SENIOR CRITERIA */}
              {activeTab === "criteria" && (
                <div className="space-y-3 font-sans text-xs">
                  <div className="font-mono text-xs font-bold text-amber-500">
                    Senior Candidate Evaluation Rubric
                  </div>
                  <div className="p-4 rounded-xl border border-hair bg-cream-raised dark:bg-[#12151E] space-y-2">
                    {selectedDesign.seniorCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-espresso">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
