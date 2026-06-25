"use client";

import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePlanner } from "@/lib/store";
import { TodayView } from "./TodayView";
import { GoalsView } from "./GoalsView";
import { ProgressView } from "./ProgressView";
import { FocusView } from "./FocusView";
import { BackupPanel } from "./BackupPanel";
import { Modal } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";

type View = "today" | "goals" | "progress" | "focus";

const NAV: { id: View; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "goals", label: "Goals" },
  { id: "progress", label: "Progress" },
  { id: "focus", label: "Focus" },
];

export function Planner({ replayIntro }: { replayIntro?: () => void } = {}) {
  const hasHydrated = usePlanner((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>("today");
  const [backupOpen, setBackupOpen] = useState(false);

  useEffect(() => setMounted(true), []);
  const ready = mounted && hasHydrated;

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen">
      <Header
        view={view}
        setView={setView}
        onBackup={() => setBackupOpen(true)}
        replayIntro={replayIntro}
      />

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 sm:px-8">
        {!ready ? (
          <Skeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {view === "today" && <TodayView />}
              {view === "goals" && <GoalsView />}
              {view === "progress" && <ProgressView />}
              {view === "focus" && <FocusView />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <Modal open={backupOpen} onClose={() => setBackupOpen(false)} title="Backup & data">
        <BackupPanel onDone={() => setBackupOpen(false)} />
      </Modal>
    </div>
    </MotionConfig>
  );
}

function Header({
  view,
  setView,
  onBackup,
  replayIntro,
}: {
  view: View;
  setView: (v: View) => void;
  onBackup: () => void;
  replayIntro?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-cream-base/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="h-3 w-3 bg-olive" aria-hidden />
          <span className="font-display text-base font-extrabold tracking-tightest text-espresso">
            PLANNER
          </span>
        </div>

        <nav className="ml-2 flex items-center gap-1">
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "text-espresso" : "text-coffee hover:text-espresso"
                }`}
              >
                {n.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-[15px] h-[2px] bg-espresso"
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/jobs"
            className="label text-coffee hover:text-espresso transition-colors"
          >
            Outreach →
          </Link>
          <button
            onClick={onBackup}
            className="label text-coffee hover:text-espresso transition-colors"
          >
            Backup
          </button>
          {replayIntro && (
            <button
              onClick={replayIntro}
              className="label text-coffee hover:text-espresso transition-colors"
            >
              Replay intro
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 pt-8">
      <div className="h-24 w-40 bg-cream-deep" />
      <div className="h-8 w-2/3 bg-cream-deep" />
      <div className="grid grid-cols-12 gap-3 pt-4">
        <div className="col-span-7 h-28 bg-cream-deep" />
        <div className="col-span-5 h-28 bg-cream-deep" />
        <div className="col-span-6 h-48 bg-cream-deep" />
        <div className="col-span-6 h-48 bg-cream-deep" />
      </div>
    </div>
  );
}
