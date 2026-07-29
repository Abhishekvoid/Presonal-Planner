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

interface MentorState {
  activeTopicId: string;
  activeTopicContext: TopicContext | null;
  activeMode: MentorMode;
  customApiKey: string;
  provider: "gemini" | "openai" | "groq" | "openrouter";
  selectedModel: string;

  // Thread per topic map
  threads: Record<string, ChatMessageItem[]>;

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
}

export const useMentorStore = create<MentorState>()(
  persist(
    (set, get) => ({
      activeTopicId: "general-backend",
      activeTopicContext: {
        id: "general-backend",
        title: "Senior Backend Engineering & System Design",
        trackTitle: "10-Day Sprint",
        sprintDay: 1,
        description: "General system engineering, data structures, concurrency & scalability grill.",
      },
      activeMode: "grill",
      customApiKey: "",
      provider: "openrouter",
      selectedModel: "deepseek/deepseek-v4-flash:free",

      threads: {
        "general-backend": [
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
          return {
            activeTopicId: id,
            activeTopicContext: context || { id, title: id },
            threads: { ...state.threads, [id]: currentThread },
          };
        }),

      setMode: (activeMode) => set({ activeMode }),
      setCustomApiKey: (customApiKey) => set({ customApiKey }),
      setProvider: (provider) => set({ provider }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),

      setCodeForReview: (codeForReview, codeLanguage = "typescript") =>
        set({ codeForReview, codeLanguage }),

      toggleCodeDrawer: (open) =>
        set((state) => ({ isCodeDrawerOpen: open ?? !state.isCodeDrawerOpen })),

      setStreaming: (isStreaming) => set({ isStreaming }),

      addMessage: (role, content, mode) => {
        const id = `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        set((state) => {
          const topicId = state.activeTopicId;
          const currentMsgs = state.threads[topicId] || [];
          const newMsg: ChatMessageItem = {
            id,
            role,
            content,
            timestamp: Date.now(),
            mode: mode || state.activeMode,
          };
          return {
            threads: {
              ...state.threads,
              [topicId]: [...currentMsgs, newMsg],
            },
          };
        });
        return id;
      },

      appendToLastMessage: (chunk) =>
        set((state) => {
          const topicId = state.activeTopicId;
          const currentMsgs = state.threads[topicId] || [];
          if (currentMsgs.length === 0) return state;

          const last = currentMsgs[currentMsgs.length - 1];
          if (last.role !== "assistant") return state;

          const updatedLast = { ...last, content: last.content + chunk };
          const updatedMsgs = [...currentMsgs.slice(0, -1), updatedLast];

          return {
            threads: {
              ...state.threads,
              [topicId]: updatedMsgs,
            },
          };
        }),

      setLastMessageContent: (content) =>
        set((state) => {
          const topicId = state.activeTopicId;
          const currentMsgs = state.threads[topicId] || [];
          if (currentMsgs.length === 0) return state;

          const last = currentMsgs[currentMsgs.length - 1];
          const updatedLast = { ...last, content };
          const updatedMsgs = [...currentMsgs.slice(0, -1), updatedLast];

          return {
            threads: {
              ...state.threads,
              [topicId]: updatedMsgs,
            },
          };
        }),

      clearCurrentThread: () =>
        set((state) => {
          const topicId = state.activeTopicId;
          return {
            threads: {
              ...state.threads,
              [topicId]: [
                {
                  id: `reset-${Date.now()}`,
                  role: "assistant",
                  content: "Thread reset. What topic or problem statement should we explore next?",
                  timestamp: Date.now(),
                  mode: state.activeMode,
                },
              ],
            },
          };
        }),
    }),
    {
      name: "goals-learning-mentor-store",
      partialize: (s) => ({
        threads: s.threads,
        customApiKey: s.customApiKey,
        provider: s.provider,
        activeTopicId: s.activeTopicId,
        activeTopicContext: s.activeTopicContext,
        activeMode: s.activeMode,
      }),
    }
  )
);
