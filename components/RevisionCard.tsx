"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { Day } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";

// PrismJS for code-block highlighting inside the rendered preview.
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";

/** Seeded into an empty day so the summary starts with a light structure. */
const TEMPLATE = ["## What I learned", "## Weak spots / mistakes", "## Revisit before interview", ""].join("\n\n");

/**
 * Per-day "Revision & Summary" surface. Distinct from the freeform Scratchpad:
 * this is the distilled, review-later summary. Markdown with a Write/Preview
 * toggle, persisted to `day.revision` (which round-trips to Neon via /api/sync).
 */
export function RevisionCard({ day }: { day: Day }) {
  const updateDay = usePlanner((s) => s.updateDay);
  const notes = usePlanner((s) => s.notes ?? []);
  const codeTheme = usePlanner((s) => s.codeTheme ?? "editorial");

  const [tab, setTab] = useState<"write" | "preview">("write");
  // Seed the template into the editor when the day has no revision yet. The
  // seed only becomes persisted data once the user edits and blurs.
  const [text, setText] = useState(() => day.revision ?? TEMPLATE);
  const previewRef = useRef<HTMLDivElement>(null);

  // Re-sync when the active day changes.
  useEffect(() => {
    setText(day.revision ?? TEMPLATE);
    setTab("write");
  }, [day.id, day.revision]);

  const persist = () => {
    const next = text.trim() === TEMPLATE.trim() ? "" : text;
    if (next !== (day.revision ?? "")) {
      updateDay(day.id, { revision: next });
    }
  };

  const previewHtml = useMemo(
    () =>
      renderMarkdown(text.trim() === TEMPLATE.trim() ? "" : text, {
        codeTheme,
        notes,
        emptyHtml:
          '<p class="text-coffee/70 italic text-[13px]">Nothing distilled yet. Switch to Write and capture what stuck.</p>',
      }),
    [text, codeTheme, notes]
  );

  // Highlight code blocks once the preview HTML is in the DOM.
  useEffect(() => {
    if (tab !== "preview") return;
    const t = setTimeout(() => {
      if (previewRef.current) Prism.highlightAllUnder(previewRef.current);
    }, 10);
    return () => clearTimeout(t);
  }, [tab, previewHtml]);

  const showPreview = () => {
    persist();
    setTab("preview");
  };

  const tabClass = (active: boolean) =>
    `px-3 py-1 text-[11px] font-bold tracking-wide rounded-sm transition-colors ${
      active
        ? "bg-espresso text-cream-raised"
        : "text-coffee hover:text-espresso"
    }`;

  return (
    <div className="flex h-full flex-col border-l-2 border-olive/60 border-y border-r hairline bg-cream-raised rounded-sm shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b hairline">
        <div className="flex flex-col">
          <span className="label text-espresso">Revision &amp; Summary</span>
          <span className="text-[10px] text-coffee/70 mt-0.5">
            Distilled takeaways for Day {day.index}
          </span>
        </div>
        <div className="flex items-center gap-0.5 bg-cream-base/70 border hairline rounded-sm p-0.5">
          <button type="button" onClick={() => setTab("write")} className={tabClass(tab === "write")}>
            Write
          </button>
          <button type="button" onClick={showPreview} className={tabClass(tab === "preview")}>
            Preview
          </button>
        </div>
      </div>

      <div className="flex-grow p-4">
        {tab === "write" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={persist}
            spellCheck
            placeholder={"Summarise the day in markdown.\n\n## What I learned\n- ...\n\n## Weak spots / mistakes\n- ...\n\n## Revisit before interview\n- ..."}
            className="min-h-[240px] w-full resize-y bg-cream-base border hairline rounded-sm p-4 font-serif text-[14px] leading-relaxed text-espresso placeholder:text-coffee/60 placeholder:font-sans placeholder:text-[12px] focus:border-olive focus:outline-none"
          />
        ) : (
          <div
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            className="min-h-[240px] rounded-sm bg-cream-base border hairline p-4 overflow-y-auto max-w-none select-text"
          />
        )}
      </div>

      <p className="px-4 pb-3 -mt-1 text-[10px] text-coffee/70">
        Saved automatically. Markdown supported.
      </p>
    </div>
  );
}
