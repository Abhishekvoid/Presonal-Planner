import type { Note } from "./types";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

export interface RenderMarkdownOptions {
  /** code-block theme class suffix, matches NotesView's setting */
  codeTheme?: "editorial" | "midnight";
  /** notes list, used to resolve [[wikilinks]] to existing notes */
  notes?: Note[];
  /** HTML returned when the input is empty */
  emptyHtml?: string;
}

/**
 * Renders a subset of Markdown (headings, lists, checklists, tables, callouts,
 * blockquotes, code blocks, inline styles, wikilinks) to an HTML string.
 *
 * Extracted verbatim from NotesView so the notes editor and the per-day
 * Revision & Summary card share one renderer. Behaviour is unchanged; the only
 * previously-closed-over values (codeTheme, notes) are now explicit options.
 */
export function renderMarkdown(text: string, opts: RenderMarkdownOptions = {}): string {
  const codeTheme = opts.codeTheme ?? "editorial";
  const notes = opts.notes ?? [];

  // Helper to parse Markdown inline formatting (bold, italic, code, links)
  const parseInlineStyles = (str: string) => {
    let html = str;
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
      return `<code class="bg-black/5 dark:bg-white/10 text-espresso dark:text-zinc-200 text-[11px] px-1 py-0.5 rounded-sm font-mono">${codeText}</code>`;
    });
    // Standard links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-olive-deep underline font-bold hover:text-olive transition-colors">$1</a>');
    // Wikilinks (clean without emoji)
    html = html.replace(/\[\[([\s\S]+?)\]\]/g, (match, title) => {
      const targetNote = notes.find((n) => n.title.toLowerCase() === title.trim().toLowerCase());
      if (targetNote) {
        return `<span class="underline text-amber-600 dark:text-amber-400 font-bold cursor-pointer hover:underline transition-colors inline-block" data-note-id="${targetNote.id}">${title}</span>`;
      }
      return `<span class="text-coffee font-mono italic select-none" title="Note does not exist yet. Create it to link.">[[${title}]]</span>`;
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

    let html = '<div class="overflow-x-auto my-3"><table class="w-full text-left text-xs border-collapse border border-hair rounded-xl shadow-xs overflow-hidden">';

    // Header
    html += '<thead class="bg-cream-raised dark:bg-[#12151E] border-b border-hair"><tr>';
    headers.forEach((h) => {
      html += `<th class="p-2.5 font-mono font-bold text-espresso dark:text-zinc-200">${parseInlineStyles(h)}</th>`;
    });
    html += "</tr></thead>";

    // Body
    html += '<tbody class="divide-y divide-hair bg-cream-base dark:bg-[#0E1117]">';
    dataRows.forEach((row) => {
      html += '<tr className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">';
      row.forEach((cell) => {
        html += `<td class="p-2.5 text-espresso dark:text-zinc-300 font-mono">${parseInlineStyles(cell)}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  };

  if (!text) return opts.emptyHtml ?? '<p class="text-coffee-soft italic">Start typing markdown here...</p>';

  const lines = text.split("\n");
  let inCode = false;
  let currentLang = "";
  let rawCodeLines: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  const parsedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Escape raw HTML tags
    line = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Code blocks: ```code```
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        const langMatch = line.trim().match(/^```(\w+)/);
        currentLang = langMatch ? langMatch[1].toLowerCase() : "python";
        rawCodeLines = [];
      } else {
        inCode = false;
        const rawCode = rawCodeLines.join("\n");
        let highlighted = rawCode;

        try {
          const grammar = Prism.languages[currentLang] || Prism.languages.python || Prism.languages.javascript;
          if (grammar) {
            highlighted = Prism.highlight(rawCode, grammar, currentLang);
          }
        } catch {
          // Fallback to unhighlighted if Prism fails
        }

        parsedLines.push(
          `<div class="code-block-container code-theme-${codeTheme} my-4 rounded-xl border border-hair overflow-hidden shadow-sm"><div class="code-block-header flex items-center justify-between px-3 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider border-b border-hair"><span class="code-block-lang text-amber-600 dark:text-amber-400">${currentLang || "code"}</span><span class="copy-code-btn cursor-pointer hover:opacity-100 opacity-60">Copy</span></div><pre class="overflow-x-auto p-3 font-mono text-xs leading-relaxed"><code class="language-${currentLang}">${highlighted}</code></pre></div>`
        );
      }
      continue;
    }

    if (inCode) {
      rawCodeLines.push(line);
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
      const title = line.trim().substring(2);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      parsedLines.push(`<h1 id="${slug || `h1-${i}`}" class="font-display text-lg sm:text-xl font-extrabold text-espresso mt-5 mb-2 border-b border-coffee/15 pb-1">${title}</h1>`);
      continue;
    }

    // Header 2: ## Subtitle
    if (line.trim().startsWith("## ")) {
      const title = line.trim().substring(3);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      parsedLines.push(`<h2 id="${slug || `h2-${i}`}" class="font-display text-sm sm:text-base font-bold text-espresso mt-4 mb-1.5">${title}</h2>`);
      continue;
    }

    // Header 3: ### Subtitle
    if (line.trim().startsWith("### ")) {
      const title = line.trim().substring(4);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      parsedLines.push(`<h3 id="${slug || `h3-${i}`}" class="font-display text-xs sm:text-sm font-bold text-espresso mt-3.5 mb-1">${title}</h3>`);
      continue;
    }

    // Header 4: #### Subtitle
    if (line.trim().startsWith("#### ")) {
      const title = line.trim().substring(5);
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      parsedLines.push(`<h4 id="${slug || `h4-${i}`}" class="font-display text-[11.5px] sm:text-xs font-bold text-espresso mt-3 mb-1 uppercase tracking-wider">${title}</h4>`);
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
}
