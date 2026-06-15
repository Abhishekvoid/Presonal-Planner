"use client";

import { motion } from "framer-motion";
import { Task } from "@/lib/types";
import { usePlanner } from "@/lib/store";
import { DifficultyChip } from "./primitives";

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

  return (
    <div className="group flex items-start gap-3 py-2.5 border-b hairline last:border-b-0">
      <button
        onClick={() => toggle(task.id)}
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        className={`relative mt-[2px] h-[18px] w-[18px] shrink-0 border transition-colors duration-200 ${
          task.done ? "border-olive bg-olive" : "border-coffee/50 bg-cream-base hover:border-espresso"
        }`}
      >
        {task.done && (
          <motion.svg
            viewBox="0 0 18 18"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
      </button>

      <button
        onClick={() => toggle(task.id)}
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
