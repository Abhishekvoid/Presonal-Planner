/**
 * Obsidian Integration Utilities for Personal Planner & AI Senior Mentor
 */

export interface ObsidianExportOptions {
  title: string;
  content: string;
  topic?: string;
  day?: number;
  tags?: string[];
  vaultName?: string;
}

/**
 * Format markdown content with Obsidian YAML frontmatter and wikilinks
 */
export function formatObsidianNote(opts: ObsidianExportOptions): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const tagList = Array.from(
    new Set(["study-assistant", "ai-mentor", ...(opts.tags || [])])
  )
    .map((t) => `  - ${t.replace(/\s+/g, "-").toLowerCase()}`)
    .join("\n");

  const frontmatter = `---
title: "${opts.title.replace(/"/g, '\\"')}"
date: ${dateStr}
${opts.day ? `sprint_day: ${opts.day}\n` : ""}${opts.topic ? `topic: "${opts.topic}"\n` : ""}tags:
${tagList}
---

# ${opts.title}

> [!NOTE] Imported from AI Senior Mentor // Learnist Engine
> Created: ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}

${opts.content}
`;

  return frontmatter;
}

/**
 * Trigger native Obsidian URI protocol (obsidian://new)
 * Opens Obsidian app and automatically creates the note in active or target vault!
 */
export function sendToObsidian(opts: ObsidianExportOptions): boolean {
  try {
    const formattedContent = formatObsidianNote(opts);
    const cleanTitle = opts.title.replace(/[\\/:\*\?"<>|]/g, "_");
    
    // Save preferred vault name in localStorage if available
    const savedVault = opts.vaultName || (typeof window !== "undefined" ? localStorage.getItem("obsidian_vault_name") : "") || "";
    const vaultParam = savedVault ? `vault=${encodeURIComponent(savedVault)}&` : "";
    
    const uri = `obsidian://new?${vaultParam}file=${encodeURIComponent(cleanTitle)}&content=${encodeURIComponent(formattedContent)}`;
    
    // Open native obsidian protocol link
    window.location.href = uri;
    return true;
  } catch (err) {
    console.error("Failed to open Obsidian URI:", err);
    return false;
  }
}

/**
 * Download clean .md file formatted for Obsidian Vaults
 */
export function downloadObsidianMarkdown(opts: ObsidianExportOptions): void {
  const formattedContent = formatObsidianNote(opts);
  const cleanTitle = opts.title.replace(/[\\/:\*\?"<>|]/g, "_");
  const filename = `${cleanTitle}.md`;

  const blob = new Blob([formattedContent], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  URL.revokeObjectURL(url);
}

export interface DailyLogSummaryData {
  dateStr: string;
  completedTasks: string[];
  activeTopicTitle?: string;
  masteryStepsDone?: number;
  notesCreated?: { title: string; folder?: string }[];
}

export function compileDailyObsidianLog(data: DailyLogSummaryData): string {
  return `---
title: "Daily Study Log - ${data.dateStr}"
date: ${data.dateStr}
tags:
  - daily-log
  - study-assistant
  - sprint-progress
---

# 📅 Daily Study Log - ${data.dateStr}

> [!NOTE] Executive Sprint Summary
> Primary Topic: **${data.activeTopicTitle || "System Architecture & Algorithms"}**
> Mastery Progress: **${data.masteryStepsDone || 1}/13 Steps Completed**

## 🎯 Completed Daily Tasks
${data.completedTasks.length > 0 ? data.completedTasks.map((t) => `- [x] ${t}`).join("\n") : "- [x] System Architecture & Deep Socratic Drill completed."}

## 📄 Created Study Notes & Wikilinks
${data.notesCreated && data.notesCreated.length > 0 ? data.notesCreated.map((n) => `- [[${n.title}]] (${n.folder || "General"})`).join("\n") : "- [[Django ORM & N+1 Optimization]]\n- [[System Architecture Design]]"}

## 💡 Key Architectural Takeaways
- [ ] *Primary mental model realization logged during study session...*
`;
}

export function syncDailyLogToObsidian(data: DailyLogSummaryData): boolean {
  const content = compileDailyObsidianLog(data);
  return sendToObsidian({
    title: `${data.dateStr}_Study_Log`,
    content,
    topic: "Daily Sprint Logs",
    tags: ["daily-log", "sprint"],
  });
}
