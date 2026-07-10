"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanner } from "@/lib/store";
import { Note } from "@/lib/types";
import { Button, Field, inputClass } from "./primitives";
import { NotesGraph } from "./NotesGraph";

// PrismJS imports for syntax highlighting
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-go";
import "prismjs/components/prism-bash";

export function NotesView() {
  const state = usePlanner();
  const notes = state.notes ?? [];
  const addNote = state.addNote;
  const updateNote = state.updateNote;
  const deleteNote = state.deleteNote;
  const tasks = state.tasks ?? [];
  const days = state.days ?? [];
  const tracks = state.tracks ?? [];
  const activeNoteId = state.activeNoteId;
  const setActiveNoteId = state.setActiveNoteId;
  const codeTheme = state.codeTheme ?? "editorial";
  const setCodeTheme = state.setCodeTheme;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"editor" | "graph">("editor");
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderInput, setNewFolderInput] = useState("");
  const [folders, setFolders] = useState<string[]>(["General", "DSA", "Backend", "System Design"]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Editor/Preview tab state
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");

  // Slash command popup states
  const [slashIndex, setSlashIndex] = useState<number | null>(null);
  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-save visual indicator status states
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSaveIndicator = () => {
    setSaveStatus("saving");
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus("saved");
    }, 1200);
  };
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sync state activeNoteId selection changes from TodayView or GoalsView
  useEffect(() => {
    if (activeNoteId) {
      setActiveId(activeNoteId);
    }
  }, [activeNoteId]);

  // Set default active note if notes exist and no active note is selected
  useEffect(() => {
    if (notes.length > 0 && !activeId) {
      const firstId = notes[0].id;
      setActiveId(firstId);
      setActiveNoteId(firstId);
    }
  }, [notes, activeId, setActiveNoteId]);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeId) ?? null;
  }, [notes, activeId]);

  // Trigger Prism highlighting whenever notes preview tab is shown, content changes, or theme changes.
  useEffect(() => {
    if (editorTab === "preview") {
      // Small timeout to let the DOM settle before Prism scans it
      const timer = setTimeout(() => {
        Prism.highlightAll();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [editorTab, activeNote?.content, activeNote?.id, codeTheme]);

  // Auto-map folder names to track IDs by fuzzy-matching folder name against track name/tag
  const folderToTrackId = useMemo(() => {
    const map: Record<string, string> = {};
    const folderAliases: Record<string, string[]> = {
      // folder name → keywords that match track names or tags
      "DSA": ["dsa"],
      "Backend": ["django", "backend"],
      "System Design": ["system", "system design"],
      "Interview": ["interview"],
    };
    for (const track of tracks) {
      const tName = track.name.toLowerCase();
      const tTag = track.tag.toLowerCase();
      for (const [folder, aliases] of Object.entries(folderAliases)) {
        if (aliases.some((a) => tName.includes(a) || tTag.includes(a))) {
          map[folder] = track.id;
        }
      }
    }
    return map;
  }, [tracks]);

  // Get the track ID for the active note's folder (null = show all)
  const activeTrackId = useMemo(() => {
    if (!activeNote?.folder) return null;
    return folderToTrackId[activeNote.folder] ?? null;
  }, [activeNote?.folder, folderToTrackId]);

  // Filter tasks by the active note's folder/track
  const tasksForFolder = useMemo(() => {
    if (!activeTrackId) return tasks;
    return tasks.filter((t) => t.trackId === activeTrackId);
  }, [tasks, activeTrackId]);

  // Filter days to only those that have tasks from the active track
  const daysForFolder = useMemo(() => {
    if (!activeTrackId) return days;
    const dayIdsWithTrack = new Set(
      tasks.filter((t) => t.trackId === activeTrackId && t.dayId).map((t) => t.dayId!)
    );
    return days.filter((d) => dayIdsWithTrack.has(d.id));
  }, [days, tasks, activeTrackId]);

  // Group tasks by day for organized dropdown rendering
  const tasksByDay = useMemo(() => {
    const groups: { dayId: string | null; dayLabel: string; tasks: typeof tasksForFolder }[] = [];
    const dayMap = new Map(days.map((d) => [d.id, d]));
    const grouped = new Map<string | null, typeof tasksForFolder>();

    for (const task of tasksForFolder) {
      const key = task.dayId || null;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    }

    // Sort days by their index, then add backlog at the end
    const sortedDayIds = [...grouped.keys()]
      .filter((k): k is string => k !== null)
      .sort((a, b) => (dayMap.get(a)?.index ?? 0) - (dayMap.get(b)?.index ?? 0));

    for (const dayId of sortedDayIds) {
      const day = dayMap.get(dayId);
      groups.push({
        dayId,
        dayLabel: day ? `Day ${day.index}: ${day.title}` : `Day (${dayId})`,
        tasks: grouped.get(dayId)!,
      });
    }

    // Backlog tasks (no dayId)
    if (grouped.has(null) && grouped.get(null)!.length > 0) {
      groups.push({ dayId: null, dayLabel: "Backlog", tasks: grouped.get(null)! });
    }

    return groups;
  }, [tasksForFolder, days]);



  const handleSetActiveNote = (id: string | null) => {
    setActiveId(id);
    setActiveNoteId(id);
  };

  // Opening a note from the graph flips back to the editor with it active.
  const handleOpenNoteFromGraph = (id: string) => {
    handleSetActiveNote(id);
    setViewMode("editor");
  };

  // Task-selection handler: auto-create or navigate to the note for the selected task
  const handleTaskSelect = (taskId: string) => {
    if (!activeNote) return;

    if (!taskId) {
      // Unlinking: just clear the taskId on the current note
      updateNote(activeNote.id, { taskId: null });
      return;
    }

    // Check if a note already exists for this task
    const existingNote = notes.find((n) => n.taskId === taskId);
    if (existingNote) {
      // Navigate to the existing note
      handleSetActiveNote(existingNote.id);
    } else {
      // Find the task name and create a new blank note for it
      const task = tasks.find((t) => t.id === taskId);
      const taskName = task?.text || "Untitled";
      const newId = addNote(taskName, "", activeNote.folder, taskId, activeNote.dayId);
      handleSetActiveNote(newId);
    }
  };

  // Folders list derived from notes + predefined folders list
  const allFolders = useMemo(() => {
    const fromNotes = notes.map((n) => n.folder).filter((f): f is string => !!f);
    return Array.from(new Set([...folders, ...fromNotes]));
  }, [notes, folders]);

  // Filtered notes list based on search and folder criteria
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchSearch =
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase());
      const matchFolder = selectedFolder ? note.folder === selectedFolder : true;
      return matchSearch && matchFolder;
    });
  }, [notes, search, selectedFolder]);

  // Backlinks resolver: find all notes that link to the active note via [[Title]] tags
  const backlinks = useMemo(() => {
    if (!activeNote) return [];
    return notes.filter((n) => {
      if (n.id === activeNote.id) return false;
      return n.content.includes(`[[${activeNote.title}]]`);
    });
  }, [notes, activeNote]);

  const handleCreateNote = () => {
    const id = addNote("Untitled Note", "", selectedFolder);
    handleSetActiveNote(id);
  };

  const handleCreateFolder = () => {
    if (newFolderInput.trim() && !folders.includes(newFolderInput.trim())) {
      setFolders([...folders, newFolderInput.trim()]);
      setSelectedFolder(newFolderInput.trim());
      setNewFolderInput("");
      setShowFolderModal(false);
    }
  };

  // Helper to parse Markdown inline formatting (bold, italic, code, links)
  const parseInlineStyles = (text: string) => {
    let html = text;
    // Bold
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");
    // Inline code (checking for difficulty tags)
    html = html.replace(/`([^`]+)`/g, (match, codeText) => {
      const trimmed = codeText.trim();
      if (trimmed === "Easy") {
        return '<code class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] px-1.5 py-0.5 rounded-sm font-mono font-bold">Easy</code>';
      }
      if (trimmed === "Medium") {
        return '<code class="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] px-1.5 py-0.5 rounded-sm font-mono font-bold">Medium</code>';
      }
      if (trimmed === "Hard") {
        return '<code class="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] px-1.5 py-0.5 rounded-sm font-mono font-bold">Hard</code>';
      }
      return `<code class="bg-coffee/10 text-espresso text-[11px] px-1 rounded-sm font-mono">${codeText}</code>`;
    });
    // Standard links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-olive-deep underline font-bold hover:text-olive transition-colors">$1</a>');
    // Wikilinks
    html = html.replace(/\[\[([\s\S]+?)\]\]/g, (match, title) => {
      const targetNote = notes.find((n) => n.title.toLowerCase() === title.trim().toLowerCase());
      if (targetNote) {
        return `<span class="underline text-olive-deep font-bold cursor-pointer hover:text-olive transition-colors inline-block" data-note-id="${targetNote.id}">📄 ${title}</span>`;
      }
      return `<span class="text-clay font-mono italic select-none" title="Note does not exist yet. Create it to link.">[[${title} (Broken Link)]]</span>`;
    });
    return html;
  };

  // Helper to render Markdown Table rows to HTML
  const renderTableHTML = (rows: string[]) => {
    const cells = rows.map((r) =>
      r
        .split("|")
        .map((cell) => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    );
    if (cells.length === 0) return "";

    const headers = cells[0];
    const hasDivider = cells[1] && cells[1].every((cell) => cell.startsWith("-"));
    const dataRows = hasDivider ? cells.slice(2) : cells.slice(1);

    let html = '<div class="overflow-x-auto my-3"><table class="w-full text-left text-xs border-collapse border border-coffee/20 rounded-sm">';
    
    // Header
    html += '<thead class="bg-coffee/10 border-b border-coffee/20"><tr>';
    headers.forEach((h) => {
      html += `<th class="p-2 font-mono font-bold text-espresso">${parseInlineStyles(h)}</th>`;
    });
    html += "</tr></thead>";

    // Body
    html += '<tbody class="divide-y divide-coffee/10 bg-cream-base/30">';
    dataRows.forEach((row) => {
      html += "<tr>";
      row.forEach((cell) => {
        html += `<td class="p-2 text-espresso font-mono">${parseInlineStyles(cell)}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  };

  // Line-by-line Markdown parsing
  const renderMarkdown = (text: string) => {
    if (!text) return '<p class="text-coffee-soft italic">Start typing markdown here...</p>';

    const lines = text.split("\n");
    let inCode = false;
    let inTable = false;
    let tableRows: string[] = [];
    const parsedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Escape raw HTML tags
      line = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Code blocks: ```code```
      if (line.trim().startsWith("```")) {
        inCode = !inCode;
        if (inCode) {
          const langMatch = line.trim().match(/^```(\w+)/);
          const lang = langMatch ? langMatch[1] : "";
          parsedLines.push(`<div class="code-block-container code-theme-${codeTheme} my-4"><div class="code-block-header"><span class="code-block-lang">${lang || "code"}</span><span class="copy-code-btn">Copy</span></div><pre class="overflow-x-auto"><code class="language-${lang || "none"}">`);
        } else {
          parsedLines.push("</code></pre></div>");
        }
        continue;
      }

      if (inCode) {
        parsedLines.push(line);
        continue;
      }

      // We are NOT in a code block. Check for indentation
      const indentMatch = line.match(/^(\s+)(.*)/);
      let lineText = line;
      let leadingSpaces = "";
      if (indentMatch) {
        leadingSpaces = indentMatch[1];
        lineText = indentMatch[2];
      }

      // Parse inline styles for line contents
      const parsedLineText = parseInlineStyles(lineText);
      // Reassemble the line with its original leading spaces
      line = leadingSpaces + parsedLineText;

      // Markdown Tables
      if (line.trim().startsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        continue;
      } else if (inTable) {
        inTable = false;
        parsedLines.push(renderTableHTML(tableRows));
        tableRows = [];
      }

      // Obsidian/Notion Callout Blocks: > [!NOTE] Callout content
      if (line.trim().startsWith("&gt; [!")) {
        const match = line.match(/&gt; \[\!(NOTE|WARNING|TIP|IMPORTANT)\](.*)/i);
        if (match) {
          const type = match[1].toUpperCase();
          const content = match[2].trim();
          const colors: Record<string, string> = {
            NOTE: "border-olive bg-olive/[0.04] text-olive-deep",
            WARNING: "border-clay bg-clay/[0.04] text-clay-deep",
            TIP: "border-coffee bg-coffee/[0.04] text-espresso",
            IMPORTANT: "border-accent bg-accent/[0.04] text-accent",
          };
          const colorClass = colors[type] || "border-coffee bg-coffee/[0.04] text-espresso";
          parsedLines.push(`<div class="border-l-4 p-3 rounded-r-sm text-xs my-3 ${colorClass}"><strong>${type}</strong>: ${content || "(Callout)"}</div>`);
          continue;
        }
      }

      // Standard Blockquotes: > quote content
      if (line.trim().startsWith("&gt;")) {
        const content = line.substring(line.indexOf("&gt;") + 4).trim();
        parsedLines.push(`<blockquote class="border-l-4 border-coffee/20 bg-coffee/[0.02] pl-3 py-1.5 text-xs text-coffee italic my-2">${content}</blockquote>`);
        continue;
      }

      // Header 1: # Title
      if (line.trim().startsWith("# ")) {
        parsedLines.push(`<h1 class="font-display text-lg sm:text-xl font-extrabold text-espresso mt-5 mb-2 border-b border-coffee/15 pb-1">${line.trim().substring(2)}</h1>`);
        continue;
      }

      // Header 2: ## Subtitle
      if (line.trim().startsWith("## ")) {
        parsedLines.push(`<h2 class="font-display text-sm sm:text-base font-bold text-espresso mt-4 mb-1.5">${line.trim().substring(3)}</h2>`);
        continue;
      }

      // Header 3: ### Subtitle
      if (line.trim().startsWith("### ")) {
        parsedLines.push(`<h3 class="font-display text-xs sm:text-sm font-bold text-espresso mt-3.5 mb-1">${line.trim().substring(4)}</h3>`);
        continue;
      }

      // Header 4: #### Subtitle
      if (line.trim().startsWith("#### ")) {
        parsedLines.push(`<h4 class="font-display text-[11.5px] sm:text-xs font-bold text-espresso mt-3 mb-1 uppercase tracking-wider">${line.trim().substring(5)}</h4>`);
        continue;
      }

      // Header 5: ##### Subtitle
      if (line.trim().startsWith("##### ")) {
        parsedLines.push(`<h5 class="font-display text-[10.5px] sm:text-[11px] font-bold text-coffee mt-2.5 mb-1 uppercase tracking-wider">${line.trim().substring(6)}</h5>`);
        continue;
      }

      // Header 6: ###### Subtitle
      if (line.trim().startsWith("###### ")) {
        parsedLines.push(`<h6 class="font-display text-[9.5px] sm:text-[10px] font-bold text-coffee-soft mt-2 mb-1 uppercase tracking-wider">${line.trim().substring(7)}</h6>`);
        continue;
      }

      // Checklist tasks (supporting indentation): - [ ] and - [x]
      const checklistMatch = line.match(/^(\s*)-\s+\[([ xX])\]\s+(.*)/);
      if (checklistMatch) {
        const indentLevel = Math.floor(checklistMatch[1].length / 2);
        const checked = checklistMatch[2].toLowerCase() === "x";
        const content = checklistMatch[3];
        const checkedAttr = checked ? "checked" : "";
        const textClass = checked ? "line-through text-coffee-soft" : "text-espresso";
        const indentStyle = indentLevel > 0 ? `style="margin-left: ${indentLevel * 16}px;"` : "";
        parsedLines.push(`<div class="flex items-center gap-2 text-xs py-1 ${textClass}" ${indentStyle}><input type="checkbox" ${checkedAttr} data-line-index="${i}" class="preview-todo-checkbox accent-olive cursor-pointer" /> <span>${content}</span></div>`);
        continue;
      }

      // Unordered lists (supporting indentation): - item
      const listMatch = line.match(/^(\s*)-\s+(.*)/);
      if (listMatch) {
        const indentLevel = Math.floor(listMatch[1].length / 2);
        const content = listMatch[2];
        const indentClass = indentLevel === 0 ? "ml-4 list-disc" :
                            indentLevel === 1 ? "ml-8 list-[circle]" :
                            indentLevel === 2 ? "ml-12 list-[square]" :
                            "ml-16 list-disc";
        parsedLines.push(`<li class="text-xs text-espresso leading-relaxed ${indentClass} py-0.5">${content}</li>`);
        continue;
      }

      // Horizontal dividers: ---
      if (line.trim() === "---") {
        parsedLines.push('<hr class="border-t border-coffee/15 my-4" />');
        continue;
      }

      // Indented lines (e.g. for Example Input/Output blocks):
      if (indentMatch) {
        const indentLevel = leadingSpaces.length;
        const indentStyle = `style="margin-left: ${indentLevel * 8}px;"`;
        
        let formattedContent = parsedLineText;
        // Check if the text matches LeetCode keys (e.g. Input:, Output:, Explanation:, Constraints:)
        if (parsedLineText.startsWith("Input:") || parsedLineText.startsWith("Output:") || parsedLineText.startsWith("Explanation:") || parsedLineText.startsWith("Constraints:")) {
          const colonIdx = parsedLineText.indexOf(":");
          const key = parsedLineText.substring(0, colonIdx);
          const val = parsedLineText.substring(colonIdx + 1);
          formattedContent = `<strong class="text-espresso font-mono">${key}:</strong><span class="font-mono text-coffee-soft">${val}</span>`;
        }
        
        parsedLines.push(`<div class="border-l-2 border-coffee/15 pl-2.5 my-1 text-xs font-mono" ${indentStyle}>${formattedContent}</div>`);
        continue;
      }

      // Regular paragraph
      parsedLines.push(line.trim() ? `<p class="text-xs sm:text-[13.5px] leading-relaxed text-espresso my-1">${line}</p>` : "");
    }

    if (inTable && tableRows.length > 0) {
      parsedLines.push(renderTableHTML(tableRows));
    }

    return parsedLines.join("\n");
  };

  // Preview click handler mapping for wikilinks, copy buttons, and interactive checkboxes
  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Handle Wikilinks
    const targetId = target.getAttribute("data-note-id");
    if (targetId) {
      handleSetActiveNote(targetId);
      return;
    }

    // Handle Copy Code Button
    if (target.classList.contains("copy-code-btn")) {
      const container = target.closest(".code-block-container");
      const code = container?.querySelector("code");
      if (code) {
        const codeText = code.textContent || "";
        navigator.clipboard.writeText(codeText).then(() => {
          target.textContent = "Copied!";
          target.classList.add("text-olive-deep");
          setTimeout(() => {
            target.textContent = "Copy";
            target.classList.remove("text-olive-deep");
          }, 2000);
        }).catch((err) => {
          console.error("Clipboard copy failed: ", err);
        });
      }
      return;
    }

    // Handle Preview Todo Checkbox Toggle
    if (target.classList.contains("preview-todo-checkbox")) {
      const checkbox = target as HTMLInputElement;
      const lineIndexStr = checkbox.getAttribute("data-line-index");
      if (lineIndexStr !== null && activeNote) {
        const lineIndex = parseInt(lineIndexStr, 10);
        const lines = activeNote.content.split("\n");
        const line = lines[lineIndex];
        
        // Toggle the markdown checkbox syntax
        if (line.trim().startsWith("- [ ] ")) {
          lines[lineIndex] = line.replace("- [ ] ", "- [x] ");
        } else if (line.trim().startsWith("- [x] ")) {
          lines[lineIndex] = line.replace("- [x] ", "- [ ] ");
        } else if (line.trim().startsWith("- [X] ")) {
          lines[lineIndex] = line.replace("- [X] ", "- [ ] ");
        }
        
        // Save back to state and trigger saving status indicator
        updateNote(activeNote.id, { content: lines.join("\n") });
        triggerSaveIndicator();
      }
    }
  };

  // Input listener monitoring slash actions
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return;
    const val = e.target.value;
    const cursor = e.target.selectionStart;

    updateNote(activeNote.id, { content: val });
    triggerSaveIndicator();

    const lastChar = val[cursor - 1];
    if (lastChar === "/") {
      setSlashIndex(cursor);

      const rect = e.target.getBoundingClientRect();
      const rowsCount = val.substring(0, cursor).split("\n").length;
      setSlashCoords({
        top: Math.min(rect.height - 180, rowsCount * 18 + 10),
        left: 20,
      });
    } else {
      setSlashIndex(null);
    }
  };

  // Keyboard listener to intercept Tab/Shift+Tab for custom indentation
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (!activeNote) return;

      const textarea = e.currentTarget;
      const content = activeNote.content;
      const cursor = textarea.selectionStart;

      // Find the start of the current line
      const lastNewline = content.lastIndexOf("\n", cursor - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

      let updatedContent = "";
      let newCursorPos = cursor;

      if (!e.shiftKey) {
        // Indent: Add 2 spaces at the beginning of the line
        const beforeLine = content.substring(0, lineStart);
        const restOfContent = content.substring(lineStart);
        updatedContent = `${beforeLine}  ${restOfContent}`;
        newCursorPos = cursor + 2;
      } else {
        // Outdent: Remove up to 2 spaces from the start of the line
        const beforeLine = content.substring(0, lineStart);
        const restOfLine = content.substring(lineStart);
        let spacesToRemove = 0;
        if (restOfLine.startsWith("  ")) {
          spacesToRemove = 2;
        } else if (restOfLine.startsWith(" ")) {
          spacesToRemove = 1;
        }
        updatedContent = beforeLine + restOfLine.substring(spacesToRemove);
        newCursorPos = Math.max(lineStart, cursor - spacesToRemove);
      }

      updateNote(activeNote.id, { content: updatedContent });
      triggerSaveIndicator();

      // Maintain cursor position and focus
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 10);
    }
  };

  const handleInsertSlashOption = (syntax: string) => {
    if (!activeNote || !textareaRef.current || slashIndex === null) return;

    const textarea = textareaRef.current;
    const content = activeNote.content;
    const cursor = textarea.selectionStart;

    // Handle Indent / Outdent
    if (syntax === "indent" || syntax === "outdent") {
      const beforeSlash = content.substring(0, slashIndex - 1);
      const afterSlash = content.substring(slashIndex);
      const contentWithoutSlash = `${beforeSlash}${afterSlash}`;

      const adjustedCursor = cursor - 1;
      const adjLastNewline = contentWithoutSlash.lastIndexOf("\n", adjustedCursor - 1);
      const adjLineStart = adjLastNewline === -1 ? 0 : adjLastNewline + 1;

      let updatedContent = "";
      let newCursorPos = adjustedCursor;

      if (syntax === "indent") {
        const lineText = contentWithoutSlash.substring(adjLineStart);
        updatedContent = contentWithoutSlash.substring(0, adjLineStart) + "  " + lineText;
        newCursorPos = adjustedCursor + 2;
      } else {
        const restOfLine = contentWithoutSlash.substring(adjLineStart);
        let spacesToRemove = 0;
        if (restOfLine.startsWith("  ")) {
          spacesToRemove = 2;
        } else if (restOfLine.startsWith(" ")) {
          spacesToRemove = 1;
        }
        updatedContent = contentWithoutSlash.substring(0, adjLineStart) + restOfLine.substring(spacesToRemove);
        newCursorPos = Math.max(adjLineStart, adjustedCursor - spacesToRemove);
      }

      updateNote(activeNote.id, { content: updatedContent });
      triggerSaveIndicator();
      setSlashIndex(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
      return;
    }

    // Default Insert blocks
    const before = content.substring(0, slashIndex - 1);
    const after = content.substring(slashIndex);
    const updatedContent = `${before}${syntax}${after}`;

    updateNote(activeNote.id, { content: updatedContent });
    triggerSaveIndicator();
    setSlashIndex(null);

    let selStart = before.length + syntax.length;
    let selEnd = before.length + syntax.length;

    // Custom selection ranges for placeholders
    if (syntax === "**Bold**") {
      selStart = before.length + 2;
      selEnd = before.length + 6;
    } else if (syntax === "*Italic*") {
      selStart = before.length + 1;
      selEnd = before.length + 7;
    } else if (syntax === "```\n\n```") {
      selStart = before.length + 3;
      selEnd = before.length + 3;
    } else if (syntax === "\n**Example 1:**\n  Input: \n  Output: \n  Explanation: \n") {
      selStart = before.length + 25;
      selEnd = before.length + 25;
    } else if (syntax === "\n**Constraints:**\n- `1 <= s.length <= 10^4`\n") {
      selStart = before.length + 21;
      selEnd = before.length + 43;
    } else if (syntax === "[Title](url)") {
      selStart = before.length + 1;
      selEnd = before.length + 6;
    } else if (syntax === "\n> [!NOTE]\n> Content\n") {
      selStart = before.length + 14;
      selEnd = before.length + 21;
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(selStart, selEnd);
      }
    }, 50);
  };

  // Extract day and task titles for linked badge displays
  const linkedTask = useMemo(() => {
    if (!activeNote?.taskId) return null;
    return tasks.find((t) => t.id === activeNote.taskId) ?? null;
  }, [activeNote, tasks]);

  const linkedDay = useMemo(() => {
    if (!activeNote?.dayId) return null;
    return days.find((d) => d.id === activeNote.dayId) ?? null;
  }, [activeNote, days]);

  return (
    <div className="reveal flex flex-col gap-3">

      {/* ── Mode toggle: Editor / Graph ───────────────────────── */}
      <div className="flex items-center gap-0.5 border border-coffee/25 bg-cream-raised rounded-sm p-0.5 self-start shadow-sm">
        {([
          { id: "editor", label: "✏️ Editor" },
          { id: "graph", label: "🕸 Graph" },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-sm transition-colors ${
              viewMode === m.id
                ? "bg-espresso text-cream-raised shadow-sm"
                : "text-coffee hover:text-espresso hover:bg-coffee/5"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {viewMode === "graph" ? (
        <NotesGraph
          notes={notes}
          tasks={tasks}
          days={days}
          onOpenNote={handleOpenNoteFromGraph}
        />
      ) : (
      <div className="flex items-stretch gap-0 min-h-[520px]">

      {/* ── Push Sidebar ──────────────────────────────────────── */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 272 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.8 }}
        className="overflow-hidden shrink-0"
        style={{ originX: 0 }}
      >
        <div className="w-[272px] h-full border border-coffee/30 bg-cream-raised rounded-sm shadow-sm mr-3 flex flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-coffee/15 pb-2">
            <span className="label text-coffee">EXPLORER</span>
            <button
              onClick={() => setShowFolderModal(true)}
              className="text-[10px] font-bold text-olive-deep hover:underline"
              aria-label="Add Folder"
            >
              + Folder
            </button>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-cream-base border hairline px-2.5 py-1.5 text-xs text-espresso focus:outline-none rounded-sm placeholder-coffee/40"
          />

          {/* Folders navigation list */}
          <div className="space-y-1">
            <span className="label text-[9px] text-coffee-soft block uppercase font-bold tracking-wider mb-1">Folders</span>
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-2 py-1 text-[11px] font-mono rounded-sm transition-colors ${
                selectedFolder === null ? "bg-coffee/10 text-espresso font-bold" : "text-coffee hover:text-espresso hover:bg-coffee/5"
              }`}
            >
              📁 All Pages ({notes.length})
            </button>
            {allFolders.map((folder) => {
              const count = notes.filter((n) => n.folder === folder).length;
              return (
                <div
                  key={folder}
                  className={`group relative flex items-center justify-between rounded-sm transition-colors ${
                    selectedFolder === folder ? "bg-coffee/10 text-espresso font-bold" : "text-coffee hover:text-espresso hover:bg-coffee/5"
                  }`}
                >
                  <button
                    onClick={() => setSelectedFolder(folder)}
                    className="w-full text-left px-2 py-1.5 text-[11px] font-mono flex justify-between items-center pr-8"
                  >
                    <span>📁 {folder}</span>
                    <span className="opacity-60 text-[10px] mr-1">({count})</span>
                  </button>
                  {folder !== "General" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete folder "${folder}"? Notes in this folder will be moved to General.`)) {
                          setFolders(folders.filter((f) => f !== folder));
                          notes.forEach((n) => {
                            if (n.folder === folder) updateNote(n.id, { folder: "General" });
                          });
                          if (selectedFolder === folder) setSelectedFolder(null);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-clay-deep text-coffee-soft p-1 transition-opacity text-[10px]"
                      title="Delete Folder"
                    >
                      🗑
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* File item lists */}
          <div className="space-y-1 pt-2 border-t border-coffee/10">
            <span className="label text-[9px] text-coffee-soft block uppercase font-bold tracking-wider mb-1">Files</span>
            {filteredNotes.length === 0 ? (
              <p className="text-[10px] text-coffee-soft italic p-2">No notes found.</p>
            ) : (
              <div className="space-y-1 max-h-[320px] overflow-y-auto no-scrollbar">
                {filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    className={`group w-full relative rounded-sm transition-colors border ${
                      note.id === activeId
                        ? "bg-cream-base border-coffee/35 text-espresso font-bold shadow-sm"
                        : "border-transparent text-coffee hover:text-espresso hover:bg-coffee/5"
                    }`}
                  >
                    <button
                      onClick={() => handleSetActiveNote(note.id)}
                      className="w-full text-left px-2.5 py-2 text-xs flex flex-col gap-0.5 pr-8"
                    >
                      <span className="truncate w-full">📄 {note.title || "Untitled Note"}</span>
                      <span className="text-[9px] text-coffee-soft font-mono truncate w-full">
                        {note.content.substring(0, 30) || "Empty content..."}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete "${note.title || "Untitled Note"}"?`)) {
                          deleteNote(note.id);
                          if (activeId === note.id) {
                            handleSetActiveNote(notes.find((n) => n.id !== note.id)?.id ?? null);
                          }
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-clay-deep text-coffee-soft p-1 transition-opacity text-xs"
                      title="Delete Note"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-coffee/10">
          <Button variant="solid" className="w-full justify-center py-2 text-xs" onClick={handleCreateNote}>
            + Add New Page
          </Button>
        </div>
        </div>
      </motion.div>

      {/* ── Editor & Preview Pane ─────────────────────────────── */}
      <div className="flex-1 min-w-0 border border-coffee/30 bg-cream-raised p-5 flex flex-col justify-between min-h-[520px] rounded-sm shadow-sm relative">
        {/* Sidebar toggle button — top-left of editor */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Close Explorer" : "Open Explorer"}
          className={`absolute top-4 left-4 z-10 p-1.5 rounded-sm transition-colors ${
            sidebarOpen
              ? "text-espresso bg-coffee/10"
              : "text-coffee hover:text-espresso hover:bg-coffee/5"
          }`}
          aria-label="Toggle file explorer"
        >
          {/* Two-rectangle sidebar icon (VS Code / Figma style) */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1" y="1" width="4" height="14" rx="1" fill="currentColor" opacity="0.9" />
            <rect x="7" y="1" width="8" height="14" rx="1" fill="currentColor" opacity="0.4" />
          </svg>
        </button>

        {activeNote ? (
          <div className="space-y-4 flex-grow flex flex-col justify-between pt-8">
            {/* Note title and quick fields */}
            <div className="flex flex-col gap-3 border-b border-coffee/15 pb-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => {
                    updateNote(activeNote.id, { title: e.target.value });
                    triggerSaveIndicator();
                  }}
                  placeholder="Note Title"
                  className="font-display text-xl font-extrabold tracking-tightest text-espresso bg-transparent border-b border-transparent hover:border-coffee/15 focus:border-coffee focus:outline-none w-full sm:w-2/3 pb-0.5 transition-colors"
                />
                <div className="flex items-center gap-3 shrink-0 select-none">
                  <span className="text-[10px] font-mono text-coffee-soft transition-opacity duration-200">
                    {saveStatus === "saving" ? "● Saving..." : "✓ Saved"}
                  </span>
                  <button
                    onClick={() => {
                      deleteNote(activeNote.id);
                      handleSetActiveNote(notes.find((n) => n.id !== activeNote.id)?.id ?? null);
                    }}
                    className="text-xs font-bold text-clay-deep hover:underline"
                  >
                    🗑 Delete Page
                  </button>
                </div>
              </div>

              {/* Linking selectors (Folder, Task, Day) */}
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-coffee-soft">Folder</span>
                  <select
                    value={activeNote.folder || ""}
                    onChange={(e) => updateNote(activeNote.id, { folder: e.target.value || null })}
                    className="bg-cream-base border hairline px-2.5 py-1 text-[11px] font-mono text-espresso focus:outline-none rounded-sm min-w-[130px]"
                  >
                    <option value="">📁 Select Folder...</option>
                    {allFolders.map((f) => (
                      <option key={f} value={f}>
                        📁 {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-coffee-soft">
                    {activeNote.folder && folderToTrackId[activeNote.folder]
                      ? `📌 ${activeNote.folder} Problem / Task`
                      : "📌 Problem / Task"}
                  </span>
                  <select
                    value={activeNote.taskId || ""}
                    onChange={(e) => handleTaskSelect(e.target.value)}
                    className="bg-cream-base border hairline px-2.5 py-1.5 text-[11px] font-mono text-espresso focus:outline-none rounded-sm min-w-[240px]"
                  >
                    <option value="">— Select problem —</option>
                    {tasksByDay.map((group) => (
                      <optgroup key={group.dayId ?? "__backlog"} label={`📅 ${group.dayLabel}`}>
                        {group.tasks.map((t) => {
                          const hasNote = notes.some((n) => n.taskId === t.id);
                          return (
                            <option key={t.id} value={t.id}>
                              {t.done ? "✅" : "⬜"} {t.text.substring(0, 38)}{hasNote ? " 📄" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                  {activeNote.folder && folderToTrackId[activeNote.folder] && (
                    <span className="text-[8px] text-coffee-soft italic mt-0.5">
                      {tasksForFolder.length} problems · {tasksForFolder.filter((t) => notes.some((n) => n.taskId === t.id)).length} have notes
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase font-bold text-coffee-soft">
                    {activeNote.folder && folderToTrackId[activeNote.folder]
                      ? `📅 ${activeNote.folder} Day`
                      : "📅 Day"}
                  </span>
                  <select
                    value={activeNote.dayId || ""}
                    onChange={(e) => updateNote(activeNote.id, { dayId: e.target.value || null })}
                    className="bg-cream-base border hairline px-2.5 py-1.5 text-[11px] font-mono text-espresso focus:outline-none rounded-sm min-w-[200px]"
                  >
                    <option value="">— Select day —</option>
                    {daysForFolder.map((d) => {
                      const dayTaskCount = tasks.filter((t) => t.dayId === d.id && (!activeTrackId || t.trackId === activeTrackId)).length;
                      return (
                        <option key={d.id} value={d.id}>
                          Day {d.index}: {d.title.substring(0, 22)} ({dayTaskCount} tasks)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Link metadata tags/badges */}
              {(linkedTask || linkedDay) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {linkedTask && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-olive/35 bg-olive/[0.04] text-[10px] text-olive-deep font-mono font-bold rounded-sm select-none">
                      📌 Connected Task: {linkedTask.text}
                    </span>
                  )}
                  {linkedDay && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-coffee/35 bg-coffee/[0.04] text-[10px] text-espresso font-mono font-bold rounded-sm select-none">
                      📅 Connected Day {linkedDay.index}: {linkedDay.title}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Full-width tabbed editor/preview */}
            <div className="flex-grow flex flex-col min-h-[440px]">
              {/* Tab bar */}
              <div className="flex items-center gap-0 border border-coffee/15 border-b-0 rounded-t-sm overflow-hidden">
                <button
                  onClick={() => setEditorTab("write")}
                  className={`px-4 py-2 text-[11px] uppercase tracking-wider font-bold transition-colors ${
                    editorTab === "write"
                      ? "bg-cream-base text-espresso border-b-2 border-olive"
                      : "bg-cream-deep/30 text-coffee hover:text-espresso"
                  }`}
                >
                  ✏️ Write
                </button>
                <button
                  onClick={() => setEditorTab("preview")}
                  className={`px-4 py-2 text-[11px] uppercase tracking-wider font-bold transition-colors ${
                    editorTab === "preview"
                      ? "bg-cream-base text-espresso border-b-2 border-olive"
                      : "bg-cream-deep/30 text-coffee hover:text-espresso"
                  }`}
                >
                  👁️ Preview
                </button>
                <div className="flex-grow bg-cream-deep/30 px-3 py-2 flex items-center justify-end gap-3 h-full">
                  {editorTab === "preview" && (
                    <div className="flex items-center gap-1.5 border border-coffee/20 rounded-sm p-0.5 bg-cream-base text-[10px] font-mono select-none">
                      <span className="text-coffee-soft px-1">Theme:</span>
                      <button
                        onClick={() => setCodeTheme("editorial")}
                        className={`px-1.5 py-0.5 rounded-sm transition-all font-bold ${
                          codeTheme === "editorial"
                            ? "bg-espresso text-cream-raised shadow-sm"
                            : "text-coffee hover:text-espresso"
                        }`}
                      >
                        Editorial
                      </button>
                      <button
                        onClick={() => setCodeTheme("midnight")}
                        className={`px-1.5 py-0.5 rounded-sm transition-all font-bold ${
                          codeTheme === "midnight"
                            ? "bg-espresso text-cream-raised shadow-sm"
                            : "text-coffee hover:text-espresso"
                        }`}
                      >
                        Midnight
                      </button>
                    </div>
                  )}
                  <span className="text-[9px] font-mono text-coffee-soft hidden sm:inline">
                    {"Type '/' for blocks · [[Title]] for links"}
                  </span>
                </div>
              </div>

              {/* Editor / Preview content area */}
              <div className="relative border border-coffee/15 bg-cream-base/30 rounded-b-sm flex flex-col flex-grow min-h-[400px]">
                {editorTab === "write" ? (
                  <>
                    <textarea
                      ref={textareaRef}
                      value={activeNote.content}
                      onChange={handleTextareaChange}
                      onKeyDown={handleTextareaKeyDown}
                      placeholder={"Start writing notes for \"" + activeNote.title + "\"...\n\nUse markdown:\n# Heading\n- Bullet point\n- [ ] Checklist item\n```code block```\n> [!NOTE] Callout\n[[Link to another note]]"}
                      className="w-full flex-grow p-5 bg-transparent text-sm font-mono leading-[1.8] text-espresso focus:outline-none resize-none min-h-[400px]"
                    />

                    {/* Slash commands absolute overlay dropdown */}
                    {slashIndex !== null && (
                      <div
                        style={{ top: `${slashCoords.top}px`, left: `${slashCoords.left}px` }}
                        className="absolute bg-espresso text-cream-raised border border-coffee/30 rounded-sm shadow-md py-1.5 w-52 z-50 animate-fadeIn max-h-[260px] overflow-y-auto"
                      >
                        <div className="px-2.5 pb-1 mb-1 border-b border-cream-raised/10 text-[8px] uppercase tracking-wider text-cream-raised/50 font-bold">
                          Insert Block
                        </div>
                        {[
                          { label: "H1 Header", syntax: "# ", hint: "#" },
                          { label: "H2 Subheading", syntax: "## ", hint: "##" },
                          { label: "H3 Subheading", syntax: "### ", hint: "###" },
                          { label: "Bold Text", syntax: "**Bold**", hint: "**bold**" },
                          { label: "Italic Text", syntax: "*Italic*", hint: "*italic*" },
                          { label: "Indent Line", syntax: "indent", hint: "Tab" },
                          { label: "Outdent Line", syntax: "outdent", hint: "Shift+Tab" },
                          { label: "LeetCode Example", syntax: "\n**Example 1:**\n  Input: \n  Output: \n  Explanation: \n", hint: "/ex" },
                          { label: "Constraints List", syntax: "\n**Constraints:**\n- `1 <= s.length <= 10^4`\n", hint: "/const" },
                          { label: "Complexity Analysis", syntax: "\n**Complexity Analysis:**\n- **Time Complexity:** `O(N)`\n- **Space Complexity:** `O(1)`\n", hint: "/comp" },
                          { label: "Easy Badge", syntax: "`Easy` ", hint: "/easy" },
                          { label: "Medium Badge", syntax: "`Medium` ", hint: "/medium" },
                          { label: "Hard Badge", syntax: "`Hard` ", hint: "/hard" },
                          { label: "Solution (Python)", syntax: "```python\ndef solve(self):\n    pass\n```", hint: "/py" },
                          { label: "Solution (Java)", syntax: "```java\npublic class Solution {\n    // code\n}\n```", hint: "/java" },
                          { label: "Solution (C++)", syntax: "```cpp\nclass Solution {\npublic:\n    // code\n};\n```", hint: "/cpp" },
                          { label: "Checklist", syntax: "- [ ] ", hint: "- [ ]" },
                          { label: "Code Block", syntax: "```\n\n```", hint: "```" },
                          { label: "Inline Code", syntax: "`code`", hint: "`code`" },
                          { label: "Table", syntax: "\n| Col 1 | Col 2 |\n|---|---|\n| ... | ... |\n", hint: "|--|" },
                          { label: "Callout", syntax: "\n> [!NOTE]\n> Content\n", hint: "> [!]" },
                          { label: "Blockquote", syntax: "\n> ", hint: ">" },
                          { label: "Link", syntax: "[Title](url)", hint: "[]()" },
                          { label: "Divider", syntax: "\n---\n", hint: "---" },
                        ].map((block) => (
                          <button
                            key={block.label}
                            onClick={() => handleInsertSlashOption(block.syntax)}
                            className="w-full text-left px-2.5 py-1.5 text-[11px] font-mono hover:bg-cream-raised/10 flex justify-between items-center"
                          >
                            <span>{block.label}</span>
                            <span className="opacity-40 text-[10px]">{block.hint}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    onClick={handlePreviewClick}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(activeNote.content) }}
                    className="flex-grow p-5 overflow-y-auto prose max-w-none text-sm leading-[1.8] select-text"
                  />
                )}
              </div>
            </div>

            {/* Backlinks feed */}
            <div className="mt-4 border-t border-coffee/15 pt-3.5 space-y-2">
              <span className="label text-[9px] text-coffee-soft block uppercase font-bold tracking-wider">
                🔗 Bi-directional References (Backlinks)
              </span>
              {backlinks.length === 0 ? (
                <p className="text-[10px] text-coffee-soft italic">No other notes link to this page.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {backlinks.map((linkNote) => (
                    <button
                      key={linkNote.id}
                      onClick={() => handleSetActiveNote(linkNote.id)}
                      className="border border-olive/35 bg-olive/[0.04] text-[10px] text-olive-deep font-mono font-bold px-2 py-0.5 rounded-sm hover:bg-olive/10 transition-colors"
                    >
                      📄 {linkNote.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-cream-base/10">
            <span className="text-3xl mb-2 select-none">📄</span>
            <h3 className="font-display text-base font-bold text-espresso uppercase tracking-wide">No Note Selected</h3>
            <p className="text-xs text-coffee mt-1 max-w-xs">
              Select an existing page from the file explorer or create a new Markdown note template.
            </p>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Add Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-cream-raised border border-coffee/30 p-5 rounded-sm shadow-md max-w-sm w-full space-y-4 text-espresso">
            <div className="flex justify-between items-center border-b border-coffee/15 pb-2">
              <h4 className="font-display text-sm font-bold uppercase tracking-wider">Create New Folder</h4>
              <button onClick={() => setShowFolderModal(false)} className="text-xs font-bold text-coffee-soft hover:text-espresso">
                Close
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Folder Name">
                <input
                  type="text"
                  value={newFolderInput}
                  onChange={(e) => setNewFolderInput(e.target.value)}
                  placeholder="e.g. System Design"
                  className={inputClass}
                />
              </Field>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setShowFolderModal(false)}>
                  Cancel
                </Button>
                <Button variant="solid" onClick={handleCreateFolder}>
                  Create Folder
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default NotesView;
