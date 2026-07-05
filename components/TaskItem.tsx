"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Task } from "@/lib/types";
import { usePlanner } from "@/lib/store";
import { DifficultyChip } from "./primitives";
import { EASE_OUT_EXPO, spring } from "@/lib/motion";
import { playStamp } from "@/lib/sound";

export function TaskItem({
  task,
  editable,
  onEdit,
}: {
  task: Task;
  editable?: boolean;
  onEdit?: (t: Task) => void;
}) {
  const toggle = usePlanner((s) => s.toggleTask);
  const remove = usePlanner((s) => s.deleteTask);
  const notes = usePlanner((s) => s.notes ?? []);
  const setView = usePlanner((s) => s.setActiveView);
  const setActiveNoteId = usePlanner((s) => s.setActiveNoteId);

  // Find note linked to this specific task
  const linkedNote = notes.find((n) => n.taskId === task.id);

  // bumped only on false→true so the celebration plays on completion, not undo
  const [burst, setBurst] = useState(0);

  const onToggle = () => {
    if (!task.done) {
      setBurst((b) => b + 1);
      playStamp(); // no-op unless interface cues are enabled
    }
    toggle(task.id);
  };

  const handleOpenNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedNote) {
      setActiveNoteId(linkedNote.id);
      setView("notes");
    }
  };

  const handleCreateNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const addNote = usePlanner.getState().addNote;
    const noteId = addNote(`Notes: ${task.text}`, "", "Tasks", task.id, task.dayId);
    setActiveNoteId(noteId);
    setView("notes");
  };

  return (
    <div className="group flex items-start gap-3 py-2.5 border-b hairline last:border-b-0">
      <motion.button
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        whileTap={{ scale: 0.82 }}
        animate={{ scale: 1 }}
        transition={spring}
        className={`relative mt-[2px] h-[18px] w-[18px] shrink-0 border transition-colors duration-200 ${
          task.done ? "border-olive bg-olive" : "border-coffee/50 bg-cream-base hover:border-espresso"
        }`}
      >
        {/* one-shot celebration ring on completion */}
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              aria-hidden
              className="pointer-events-none absolute -inset-[3px] border border-olive"
              initial={{ scale: 0.5, opacity: 0.75 }}
              animate={{ scale: 2.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        {task.done && (
          <motion.svg
            viewBox="0 0 18 18"
            initial={{ pathLength: 0, opacity: 0, scale: 0.7 }}
            animate={{ pathLength: 1, opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
            className="absolute inset-0"
          >
            <motion.path
              d="M4 9.5 L7.5 13 L14 5"
              fill="none"
              stroke="var(--cream-raised)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.button>

      <button
        onClick={onToggle}
        className="min-w-0 flex-1 text-left"
        aria-hidden
        tabIndex={-1}
      >
        <span
          className={`relative inline text-[13.5px] leading-relaxed transition-colors duration-300 ${
            task.done ? "text-coffee/55" : "text-espresso"
          }`}
        >
          {task.text}
          <motion.span
            aria-hidden
            className="absolute left-0 top-1/2 h-px bg-coffee/55 origin-left"
            initial={false}
            animate={{ scaleX: task.done ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%" }}
          />
        </span>
        {linkedNote && (
          <button
            onClick={handleOpenNote}
            title={`Open linked note: ${linkedNote.title}`}
            className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 border border-olive/35 bg-olive/[0.04] text-[9.5px] text-olive-deep font-mono font-bold rounded-sm select-none hover:bg-olive/10 transition-colors"
          >
            📄 note
          </button>
        )}
        {task.tip && (
          <span className="mt-0.5 block text-[12px] italic leading-snug text-coffee">
            {task.tip}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {task.difficulty && <DifficultyChip d={task.difficulty} />}
        {editable && (
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {!linkedNote && (
              <button
                onClick={handleCreateNote}
                aria-label={`Create note for task: ${task.text}`}
                className="px-1.5 py-1 text-xs text-olive-deep font-bold hover:underline"
              >
                + Note
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                aria-label={`Edit task: ${task.text}`}
                className="px-1.5 py-1 text-xs text-coffee transition-colors hover:text-espresso"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => remove(task.id)}
              aria-label={`Delete task: ${task.text}`}
              className="px-1.5 py-1 text-xs text-coffee transition-colors hover:text-clay-deep"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
