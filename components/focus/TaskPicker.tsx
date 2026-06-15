"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { orderedDays } from "@/lib/selectors";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Day-grouped task picker. A styled trigger that opens a scrollable panel where
 * open tasks are grouped under their day (plus a Backlog group). Custom dropdown
 * so the grouping and look match the warm-craft system; native <select> can't.
 */
export function TaskPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}) {
  const state = usePlanner();
  const days = orderedDays(state);
  const tasks = state.tasks;
  const tracks = state.tracks;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const accentFor = (trackId: string) =>
    tracks.find((t) => t.id === trackId)?.accent ?? "var(--coffee)";

  const selected = tasks.find((t) => t.id === value) ?? null;

  const { groups, backlog } = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const groups = days
      .map((d) => ({
        day: d,
        items: open
          .filter((t) => t.dayId === d.id)
          .sort((a, b) => a.order - b.order),
      }))
      .filter((g) => g.items.length > 0);
    const backlog = open.filter((t) => !t.dayId);
    return { groups, backlog };
  }, [tasks, days]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  const empty = groups.length === 0 && backlog.length === 0;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-coffee/30 bg-cream-base px-3 py-2 text-left text-sm text-espresso transition-colors hover:border-coffee/60 focus:border-olive focus:outline-none disabled:opacity-70 disabled:hover:border-coffee/30"
      >
        {selected ? (
          <span
            className="h-2 w-2 shrink-0"
            style={{ backgroundColor: accentFor(selected.trackId) }}
            aria-hidden
          />
        ) : null}
        <span className={`truncate ${selected ? "text-espresso" : "text-coffee"}`}>
          {selected ? selected.text : "No specific task"}
        </span>
        {!disabled && (
          <span
            className={`ml-auto shrink-0 text-coffee transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-72 overflow-y-auto rounded-md border border-coffee/30 bg-cream-raised shadow-[0_18px_40px_-18px_rgba(42,33,27,0.45)]"
        >
          <button
            onClick={() => pick(null)}
            className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-cream-deep/60 ${
              value === null ? "text-espresso font-medium" : "text-coffee"
            }`}
          >
            No specific task
          </button>

          {empty && (
            <p className="px-3 py-4 text-center text-sm text-coffee">
              No open tasks. Add some in Today.
            </p>
          )}

          {groups.map((g) => (
            <div key={g.day.id}>
              <div className="label sticky top-0 z-10 border-y hairline bg-cream-deep px-3 py-1.5 text-coffee">
                Day {pad2(g.day.index)} · {g.day.date}
              </div>
              {g.items.map((t) => (
                <TaskOption
                  key={t.id}
                  text={t.text}
                  accent={accentFor(t.trackId)}
                  active={t.id === value}
                  onClick={() => pick(t.id)}
                />
              ))}
            </div>
          ))}

          {backlog.length > 0 && (
            <div>
              <div className="label sticky top-0 z-10 border-y hairline bg-cream-deep px-3 py-1.5 text-coffee">
                Backlog
              </div>
              {backlog.map((t) => (
                <TaskOption
                  key={t.id}
                  text={t.text}
                  accent={accentFor(t.trackId)}
                  active={t.id === value}
                  onClick={() => pick(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskOption({
  text,
  accent,
  active,
  onClick,
}: {
  text: string;
  accent: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
        active ? "bg-olive/[0.12] text-espresso" : "text-espresso hover:bg-cream-deep/50"
      }`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <span className="truncate">{text}</span>
    </button>
  );
}
