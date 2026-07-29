"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePlanner } from "@/lib/store";
import { TodayView } from "./TodayView";
import { GoalsView } from "./GoalsView";
import { ProgressView } from "./ProgressView";
import { FocusView } from "./FocusView";
import { NotesView } from "./NotesView";
import { MentorView } from "./MentorView";
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
import { useMentorStore } from "@/lib/mentorStore";

type View = "today" | "goals" | "progress" | "focus" | "notes" | "mentor";

const ORDER: View[] = ["today", "goals", "progress", "focus", "notes", "mentor"];

import { FDETopicDrawer } from "./system/FDETopicDrawer";
import { StaffMasterclassDeck } from "./system/StaffMasterclassDeck";

export function Planner({ replayIntro }: { replayIntro?: () => void } = {}) {
  const hasHydrated = usePlanner((s) => s.hasHydrated);
  const [mounted, setMounted] = useState(false);
  const view = usePlanner((s) => (s.activeView as View) ?? "today");
  const setView = usePlanner((s) => s.setActiveView);
  const [backupOpen, setBackupOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [staffDeck, setStaffDeck] = useState<{ topicId: string | null; customTitle?: string }>({ topicId: null });
  const prevView = useRef<View>("today");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);
  const ready = mounted && hasHydrated;

  useEffect(() => {
    const handleOpenTopic = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTopicId(customEvent.detail);
      }
    };
    const handleOpenStaffMasterclass = (e: Event) => {
      const customEvent = e as CustomEvent<{ topicId: string; title?: string }>;
      if (customEvent.detail?.topicId) {
        setStaffDeck({ topicId: customEvent.detail.topicId, customTitle: customEvent.detail.title });
      }
    };

    const handleOpenAIMentor = (e: Event) => {
      const customEvent = e as CustomEvent<{ topicId?: string; title?: string; day?: number }>;
      if (customEvent.detail?.topicId) {
        useMentorStore.getState().setActiveTopic(customEvent.detail.topicId, {
          id: customEvent.detail.topicId,
          title: customEvent.detail.title,
          sprintDay: customEvent.detail.day,
        });
      }
      changeView("mentor");
    };

    window.addEventListener("open-fde-topic", handleOpenTopic);
    window.addEventListener("open-staff-masterclass", handleOpenStaffMasterclass);
    window.addEventListener("open-ai-mentor", handleOpenAIMentor);
    return () => {
      window.removeEventListener("open-fde-topic", handleOpenTopic);
      window.removeEventListener("open-staff-masterclass", handleOpenStaffMasterclass);
      window.removeEventListener("open-ai-mentor", handleOpenAIMentor);
    };
  }, []);

  const changeView = (next: View) => {
    if (next === view) return;
    prevView.current = view;
    setView(next);
    playTurn();
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
        className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 focus:outline-none"
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
            {view === "mentor" && <MentorView />}
          </ViewTransition>
        )}
      </main>

      {/* Global Slide-Over FDE Deck Drawer */}
      <FDETopicDrawer
        topicId={activeTopicId}
        onClose={() => setActiveTopicId(null)}
        onSelectTopic={(nextId) => setActiveTopicId(nextId)}
      />

      {/* SpaceX / OpenAI Staff Engineer Masterclass Deck */}
      <StaffMasterclassDeck
        topicId={staffDeck.topicId}
        customTitle={staffDeck.customTitle}
        onClose={() => setStaffDeck({ topicId: null })}
      />

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
    <header className="sticky top-0 z-30 border-b border-hair bg-cream-base/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 md:gap-4 px-4 sm:px-8 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LEARNIST // ACTIVE</span>
          </div>
          <span className="font-mono text-xs font-semibold tracking-wider text-espresso hidden sm:inline-block">
            CODEX_ENGINEER
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            onClick={onCommand}
            aria-label="Open command palette"
            className="group flex items-center gap-2 rounded border border-hair bg-cream-raised px-2.5 py-1 text-espresso transition-all hover:border-olive/30 shadow-sm"
          >
            <span className="text-[11px] font-mono text-coffee group-hover:text-espresso">Search Deck</span>
            <kbd className="rounded border border-hair bg-cream-deep px-1.5 py-[1px] font-mono text-[10px] text-coffee">⌘K</kbd>
          </button>
          <button
            onClick={onBackup}
            className="font-mono text-[11px] text-coffee hover:text-espresso transition-colors hidden md:inline-block px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            [Backup]
          </button>
          {replayIntro && (
            <button
              onClick={replayIntro}
              className="font-mono text-[11px] text-zinc-400 hover:text-slate-200 transition-colors hidden md:inline-block px-2 py-1 rounded hover:bg-white/5"
            >
              [Replay]
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
