"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { TodayView } from "./TodayView";
import { GoalsView } from "./GoalsView";
import { ProgressView } from "./ProgressView";
import { FocusView } from "./FocusView";
import { NotesView } from "./NotesView";
import { BackupPanel } from "./BackupPanel";
import { Modal } from "./primitives";
import { ThemeToggle } from "./ThemeToggle";
import { AccountabilitySync } from "./AccountabilitySync";
import { ViewTransition } from "./transitions/ViewTransition";
import { DockNav } from "./DockNav";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsOverlay } from "./ShortcutsOverlay";
import { ToastProvider } from "./system/Toaster";
import { CelebrationProvider } from "./system/Celebration";
import { useGlobalShortcuts } from "@/lib/useGlobalShortcuts";
import { playTurn } from "@/lib/sound";

type View = "today" | "goals" | "progress" | "focus" | "notes";

const ORDER: View[] = ["today", "goals", "progress", "focus", "notes"];

export function Planner({ replayIntro }: { replayIntro?: () => void } = {}) {
  const hasHydrated = usePlanner((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(false);
  const view = usePlanner((s) => (s.activeView as View) ?? "today");
  const setView = usePlanner((s) => s.setActiveView);
  const [backupOpen, setBackupOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const prevView = useRef<View>("today");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);
  const ready = mounted && hasHydrated;

  const changeView = (next: View) => {
    if (next === view) return;
    prevView.current = view;
    setView(next);
    playTurn(); // no-op unless interface cues are enabled
    // Move focus into the freshly-revealed view for keyboard/SR users.
    requestAnimationFrame(() => mainRef.current?.focus());
  };

  useGlobalShortcuts({
    openPalette: () => setPaletteOpen(true),
    toggleShortcuts: () => setShortcutsOpen((v) => !v),
    changeView,
  });

  const direction: 1 | -1 =
    ORDER.indexOf(view) >= ORDER.indexOf(prevView.current) ? 1 : -1;

  return (
    <MotionConfig reducedMotion="user">
    <ToastProvider>
    <CelebrationProvider>
    <div className="min-h-screen">
      <Header
        onBackup={() => setBackupOpen(true)}
        onCommand={() => setPaletteOpen(true)}
        replayIntro={replayIntro}
      />

      <main
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 sm:px-8 focus:outline-none"
      >
        {!ready ? (
          <Skeleton />
        ) : (
          <ViewTransition viewKey={view} direction={direction}>
            {view === "today" && <TodayView />}
            {view === "goals" && <GoalsView />}
            {view === "progress" && <ProgressView />}
            {view === "focus" && <FocusView />}
            {view === "notes" && <NotesView />}
          </ViewTransition>
        )}
      </main>

      <Modal open={backupOpen} onClose={() => setBackupOpen(false)} title="Backup & data">
        <BackupPanel onDone={() => setBackupOpen(false)} />
      </Modal>

      {/* Bottom navigation dock */}
      <DockNav view={view} setView={changeView} />

      {/* Command palette (⌘K) + shortcuts (?) */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        changeView={changeView}
        onBackup={() => setBackupOpen(true)}
        replayIntro={replayIntro}
      />
      <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Real-time Accountability Partner Sync */}
      <AccountabilitySync />
    </div>
    </CelebrationProvider>
    </ToastProvider>
    </MotionConfig>
  );
}

function Header({
  onBackup,
  onCommand,
  replayIntro,
}: {
  onBackup: () => void;
  onCommand: () => void;
  replayIntro?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-cream-base/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 md:gap-4 px-3 sm:px-8 py-3.5">
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-olive" aria-hidden />
          <span className="font-display text-sm sm:text-base font-extrabold tracking-tightest text-espresso">
            PLANNER
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={onCommand}
            aria-label="Open command palette"
            className="group flex items-center gap-1.5 rounded-md border border-coffee/25 bg-cream-raised/60 px-2 py-1 text-coffee transition-colors hover:border-coffee/40 hover:text-espresso"
          >
            <span className="text-[11px]">Search</span>
            <kbd className="rounded border border-coffee/25 bg-cream-base px-1 py-[1px] font-mono text-[9px] text-coffee-soft group-hover:text-coffee">⌘K</kbd>
          </button>
          <button
            onClick={onBackup}
            className="label text-coffee hover:text-espresso transition-colors hidden md:inline-block text-[10px] sm:text-xs"
          >
            Backup
          </button>
          {replayIntro && (
            <button
              onClick={replayIntro}
              className="label text-coffee hover:text-espresso transition-colors hidden md:inline-block text-[10px] sm:text-xs"
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
