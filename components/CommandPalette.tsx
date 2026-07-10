"use client";

/**
 * Command palette (⌘K / Ctrl+K). Fuzzy-jump to any view, open a note, or run an
 * action (new note, start timer, toggle theme, backup, replay intro). Controlled
 * by Planner. Premium-subtle spring-in, full keyboard navigation.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  MagnifyingGlass,
  CalendarCheck,
  Target,
  ChartLineUp,
  Timer,
  NotePencil,
  PaperPlaneTilt,
  Palette,
  FloppyDisk,
  ArrowClockwise,
  FileText,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { usePlanner } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { EASE_OUT_EXPO } from "@/lib/motion";

type View = "today" | "goals" | "progress" | "focus" | "notes";

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions" | "Notes";
  Icon: PhosphorIcon;
  keywords?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onClose,
  changeView,
  onBackup,
  replayIntro,
}: {
  open: boolean;
  onClose: () => void;
  changeView: (v: View) => void;
  onBackup: () => void;
  replayIntro?: () => void;
}) {
  const router = useRouter();
  const { toggle: toggleTheme } = useTheme();
  const notes = usePlanner((s) => s.notes ?? []);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = (v: View) => { changeView(v); onClose(); };
  const openNote = (id: string) => {
    usePlanner.getState().setActiveNoteId(id);
    changeView("notes");
    onClose();
  };

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: "today", label: "Today", hint: "g t", group: "Navigate", Icon: CalendarCheck, run: () => go("today") },
      { id: "goals", label: "Goals", hint: "g g", group: "Navigate", Icon: Target, run: () => go("goals") },
      { id: "progress", label: "Progress", hint: "g p", group: "Navigate", Icon: ChartLineUp, run: () => go("progress") },
      { id: "focus", label: "Focus", hint: "g f", group: "Navigate", Icon: Timer, run: () => go("focus") },
      { id: "notes", label: "Notes", hint: "g n", group: "Navigate", Icon: NotePencil, run: () => go("notes") },
      { id: "outreach", label: "Outreach", group: "Navigate", Icon: PaperPlaneTilt, keywords: "jobs companies", run: () => { router.push("/jobs"); onClose(); } },
    ];
    const actions: Command[] = [
      {
        id: "new-note", label: "New note", group: "Actions", Icon: NotePencil, keywords: "create write",
        run: () => {
          const id = usePlanner.getState().addNote("Untitled Note", "", "General");
          openNote(id);
        },
      },
      {
        id: "start-timer", label: "Start focus timer", group: "Actions", Icon: Timer, keywords: "pomodoro work",
        run: () => { usePlanner.getState().startTimer(null); go("focus"); },
      },
      { id: "theme", label: "Toggle light / dark", group: "Actions", Icon: Palette, keywords: "theme dark mode", run: () => { toggleTheme(); onClose(); } },
      { id: "backup", label: "Backup & data", group: "Actions", Icon: FloppyDisk, keywords: "export import save", run: () => { onBackup(); onClose(); } },
      ...(replayIntro ? [{ id: "replay", label: "Replay intro", group: "Actions" as const, Icon: ArrowClockwise, run: () => { replayIntro(); onClose(); } }] : []),
    ];
    const noteCmds: Command[] = notes.slice(0, 40).map((n) => ({
      id: `note-${n.id}`,
      label: n.title || "Untitled",
      group: "Notes",
      Icon: FileText,
      keywords: n.content.slice(0, 80),
      run: () => openNote(n.id),
    }));
    return [...nav, ...actions, ...noteCmds];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => (c.label + " " + (c.keywords ?? "")).toLowerCase().includes(q));
  }, [commands, query]);

  // group in display order
  const groups = useMemo(() => {
    const order: Command["group"][] = ["Navigate", "Actions", "Notes"];
    return order
      .map((g) => ({ group: g, items: filtered.filter((c) => c.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { if (open) { setQuery(""); setSel(0); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  useEffect(() => { setSel(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); flat[sel]?.run(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, sel, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="absolute inset-0 bg-scrim/50 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.8 }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-coffee/25 bg-cream-raised/95 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-coffee/15 px-4">
              <MagnifyingGlass size={17} className="shrink-0 text-coffee-soft" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to a view, note, or action…"
                className="w-full bg-transparent py-3.5 text-sm text-espresso placeholder-coffee/45 focus:outline-none"
              />
              <kbd className="hidden sm:block rounded border border-coffee/25 bg-cream-base px-1.5 py-0.5 text-[9px] font-mono text-coffee-soft">esc</kbd>
            </div>

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
              {flat.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-coffee-soft">No matches for “{query}”.</div>
              ) : (
                groups.map((g) => (
                  <div key={g.group} className="mb-1 px-2">
                    <div className="px-2 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-coffee-soft">{g.group}</div>
                    {g.items.map((c) => {
                      const idx = flat.indexOf(c);
                      const active = idx === sel;
                      return (
                        <button
                          key={c.id}
                          data-idx={idx}
                          onMouseMove={() => setSel(idx)}
                          onClick={() => c.run()}
                          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                            active ? "bg-espresso text-cream-raised" : "text-espresso hover:bg-coffee/5"
                          }`}
                        >
                          <c.Icon size={16} weight={active ? "fill" : "regular"} className={active ? "text-cream-raised" : "text-coffee"} />
                          <span className="flex-1 truncate text-[13px]">{c.label}</span>
                          {c.hint && (
                            <span className={`font-mono text-[10px] ${active ? "text-cream-raised/70" : "text-coffee-soft"}`}>{c.hint}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-coffee/15 px-4 py-2 text-[10px] text-coffee-soft">
              <span className="flex items-center gap-2">
                <Kbd>↑</Kbd><Kbd>↓</Kbd> navigate <Kbd>↵</Kbd> select
              </span>
              <span className="flex items-center gap-1"><Kbd>?</Kbd> shortcuts</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-coffee/25 bg-cream-base px-1 py-0.5 font-mono text-[9px] text-coffee">{children}</kbd>;
}
