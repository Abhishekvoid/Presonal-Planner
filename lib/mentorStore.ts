"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MentorMode, TopicContext } from "@/lib/ai/prompt";

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  mode?: MentorMode;
}

export interface ThreadSession {
  topicId: string;
  topicTitle: string;
  messages: ChatMessageItem[];
  lastUpdated: number;
}

export interface TopicProgressData {
  topicId: string;
  completedSteps: number[]; // e.g. [1, 2, 3]
  currentStep: number;
  subtopicsDone: Record<string, boolean>;
  mistakesLogged: string[];
  rank?: string;
  scorePct?: number;
}

interface MentorState {
  activeTopicId: string;
  activeTopicContext: TopicContext | null;
  activeMode: MentorMode;
  customApiKey: string;
  provider: "gemini" | "openai" | "groq" | "openrouter";
  selectedModel: string;

  // Thread per topic map
  threads: Record<string, ChatMessageItem[]>;

  // Progress per topic map
  topicProgress: Record<string, TopicProgressData>;

  // Code review drawer state
  codeForReview: string;
  codeLanguage: string;
  isCodeDrawerOpen: boolean;

  // Stream status
  isStreaming: boolean;

  // Actions
  setActiveTopic: (id: string, context?: TopicContext) => void;
  setMode: (mode: MentorMode) => void;
  setCustomApiKey: (key: string) => void;
  setProvider: (provider: "gemini" | "openai" | "groq" | "openrouter") => void;
  setSelectedModel: (model: string) => void;
  setCodeForReview: (code: string, language?: string) => void;
  toggleCodeDrawer: (open?: boolean) => void;
  
  // Message actions
  addMessage: (role: "user" | "assistant", content: string, mode?: MentorMode) => string;
  appendToLastMessage: (chunk: string) => void;
  setLastMessageContent: (content: string) => void;
  clearCurrentThread: () => void;
  setStreaming: (streaming: boolean) => void;

  // Progress & 13-Step tracking actions
  markStepCompleted: (topicId: string, stepId: number) => void;
  toggleSubtopicDone: (topicId: string, subtopicId: string) => void;
  logMistake: (topicId: string, mistake: string) => void;
  setCandidateRank: (topicId: string, rank: string, scorePct?: number) => void;
}

export const useMentorStore = create<MentorState>()(
  persist(
    (set, get) => ({
      activeTopicId: "day-1-django-orm",
      activeTopicContext: {
        id: "day-1-django-orm",
        title: "Day 1: Django ORM & N+1 Optimization",
        trackTitle: "10-Day Sprint",
        sprintDay: 1,
        description: "select_related, prefetch_related, annotate, F(), Q(), and N+1 query debugging.",
      },
      activeMode: "grill",
      customApiKey: "",
      provider: "openrouter",
      selectedModel: "deepseek/deepseek-v4-flash",

      threads: {
        "day-1-django-orm": [
          {
            id: "init-welcome",
            role: "assistant",
            content:
              "Welcome to your 10-day intensive Senior Backend Engineering interview sprint. I am your Senior Backend Mentor.\n\nI will not hand you easy answers. I will test your first-principles understanding of distributed systems, concurrency, low-level data structures, and production trade-offs.\n\nWhat backend topic or architecture concept are we grilling today? State the problem or topic, and let's get started.",
            timestamp: Date.now(),
            mode: "grill",
          },
        ],
      },

      topicProgress: {
        "day-1-django-orm": {
          topicId: "day-1-django-orm",
          completedSteps: [1, 2],
          currentStep: 3,
          subtopicsDone: {},
          mistakesLogged: [],
          rank: "L5 Senior Candidate",
          scorePct: 45,
        },
      },

      codeForReview: "",
      codeLanguage: "typescript",
      isCodeDrawerOpen: false,
      isStreaming: false,

      setActiveTopic: (id, context) =>
        set((state) => {
          const currentThread = state.threads[id] || [
            {
              id: `init-${id}`,
              role: "assistant",
              content: `Ready to dive into **${context?.title || id}**. Let's start from first principles: what production problem does this solve and what naive approaches fail at scale?`,
              timestamp: Date.now(),
              mode: state.activeMode,
            },
          ];

          const currentProgress = state.topicProgress[id] || {
            topicId: id,
            completedSteps: [1],
            currentStep: 1,
            subtopicsDone: {},
            mistakesLogged: [],
            rank: "In Progress",
            scorePct: 10,
          };

          return {
            activeTopicId: id,
            activeTopicContext: context || { id, title: id },
            threads: { ...state.threads, [id]: currentThread },
            topicProgress: { ...state.topicProgress, [id]: currentProgress },
          };
        }),

      setMode: (mode) => set({ activeMode: mode }),
      setCustomApiKey: (key) => set({ customApiKey: key }),
      setProvider: (provider) => set({ provider }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setCodeForReview: (code, language) =>
        set({ codeForReview: code, codeLanguage: language || "typescript" }),
      toggleCodeDrawer: (open) =>
        set((state) => ({ isCodeDrawerOpen: open !== undefined ? open : !state.isCodeDrawerOpen })),
      setStreaming: (streaming) => set({ isStreaming: streaming }),

      addMessage: (role, content, mode) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newItem: ChatMessageItem = {
          id,
          role,
          content,
          timestamp: Date.now(),
          mode: mode || get().activeMode,
        };
        const topicId = get().activeTopicId;
        const currentThread = get().threads[topicId] || [];

        set((state) => ({
          threads: {
            ...state.threads,
            [topicId]: [...currentThread, newItem],
          },
        }));
        return id;
      },

      appendToLastMessage: (chunk) => {
        const topicId = get().activeTopicId;
        const currentThread = get().threads[topicId] || [];
        if (currentThread.length === 0) return;

        const lastIdx = currentThread.length - 1;
        const updated = [...currentThread];
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: updated[lastIdx].content + chunk,
        };

        set((state) => ({
          threads: { ...state.threads, [topicId]: updated },
        }));
      },

      setLastMessageContent: (content) => {
        const topicId = get().activeTopicId;
        const currentThread = get().threads[topicId] || [];
        if (currentThread.length === 0) return;

        const lastIdx = currentThread.length - 1;
        const updated = [...currentThread];
        updated[lastIdx] = {
          ...updated[lastIdx],
          content,
        };

        set((state) => ({
          threads: { ...state.threads, [topicId]: updated },
        }));
      },

      clearCurrentThread: () => {
        const topicId = get().activeTopicId;
        set((state) => ({
          threads: {
            ...state.threads,
            [topicId]: [],
          },
        }));
      },

      markStepCompleted: (topicId, stepId) =>
        set((state) => {
          const current = state.topicProgress[topicId] || {
            topicId,
            completedSteps: [],
            currentStep: 1,
            subtopicsDone: {},
            mistakesLogged: [],
          };
          if (current.completedSteps.includes(stepId)) return state;

          const nextCompleted = [...current.completedSteps, stepId].sort((a, b) => a - b);
          const nextScorePct = Math.round((nextCompleted.length / 13) * 100);

          // AUTO-SYNC TO MAIN PLANNER STORE (Today View & Progress Area!)
          if (nextCompleted.length >= 13 || stepId === 13) {
            try {
              const { usePlanner } = require("./store");
              const dayMatch = topicId.match(/day-(\d+)/);
              if (dayMatch && dayMatch[1]) {
                const sprintDay = parseInt(dayMatch[1], 10);
                usePlanner.getState().markDayTasksDone(sprintDay);
              }
            } catch (e) {
              // Ignore
            }
          }

          return {
            topicProgress: {
              ...state.topicProgress,
              [topicId]: {
                ...current,
                completedSteps: nextCompleted,
                currentStep: Math.min(stepId + 1, 13),
                scorePct: nextScorePct,
              },
            },
          };
        }),

      toggleSubtopicDone: (topicId, subtopicId) =>
        set((state) => {
          const current = state.topicProgress[topicId] || {
            topicId,
            completedSteps: [],
            currentStep: 1,
            subtopicsDone: {},
            mistakesLogged: [],
          };

          const nextSubtopics = {
            ...current.subtopicsDone,
            [subtopicId]: !current.subtopicsDone[subtopicId],
          };

          // AUTO-SYNC TO MAIN PLANNER STORE (Today View & Progress Area!)
          if (nextSubtopics[subtopicId]) {
            try {
              const { usePlanner } = require("./store");
              usePlanner.getState().markTaskDoneByTitle(subtopicId);
            } catch (e) {
              // Ignore
            }
          }

          return {
            topicProgress: {
              ...state.topicProgress,
              [topicId]: {
                ...current,
                subtopicsDone: nextSubtopics,
              },
            },
          };
        }),

      logMistake: (topicId, mistake) =>
        set((state) => {
          const current = state.topicProgress[topicId] || {
            topicId,
            completedSteps: [],
            currentStep: 1,
            subtopicsDone: {},
            mistakesLogged: [],
          };

          if (current.mistakesLogged.includes(mistake)) return state;

          return {
            topicProgress: {
              ...state.topicProgress,
              [topicId]: {
                ...current,
                mistakesLogged: [...current.mistakesLogged, mistake],
              },
            },
          };
        }),

      setCandidateRank: (topicId, rank, scorePct) =>
        set((state) => {
          const current = state.topicProgress[topicId] || {
            topicId,
            completedSteps: [],
            currentStep: 1,
            subtopicsDone: {},
            mistakesLogged: [],
          };

          return {
            topicProgress: {
              ...state.topicProgress,
              [topicId]: {
                ...current,
                rank,
                scorePct: scorePct !== undefined ? scorePct : current.scorePct,
              },
            },
          };
        }),
    }),
    {
      name: "study-assistant-mentor-store-v2",
    }
  )
);
