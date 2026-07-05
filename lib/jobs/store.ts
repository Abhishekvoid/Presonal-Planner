"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildJobsSeed } from "./seed";
import {
  Company,
  Contact,
  JOBS_SCHEMA_VERSION,
  JobsState,
  Stage,
  Template,
} from "./types";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Stages at or beyond "contacted" — used to auto-stamp reachedOutAt. */
const CONTACTED_OR_BEYOND: Stage[] = [
  "contacted",
  "replied",
  "interviewing",
  "offer",
];

/**
 * Backfill any missing / malformed field on a stored company so a hand-edited
 * or partial localStorage blob never crashes a render.
 */
export function normalizeCompany(raw: Partial<Company>): Company {
  let contacts = Array.isArray(raw.contacts) ? raw.contacts : [];
  if (contacts.length === 0 && (raw.contactName || raw.contactLink)) {
    contacts = [
      {
        id: raw.id ? `ct-${raw.id}-0` : uid("ct"),
        name: raw.contactName ?? "",
        role: raw.contactRole ?? "",
        channel: raw.channel ?? "linkedin",
        link: raw.contactLink ?? "",
        draft: raw.draft ?? "",
      },
    ];
  }

  return {
    id: raw.id ?? uid("co"),
    name: raw.name ?? "",
    role: raw.role ?? "",
    stage: (raw.stage as Stage) ?? "lead",
    notes: raw.notes ?? "",
    contactName: raw.contactName ?? "",
    contactRole: raw.contactRole ?? "",
    channel: raw.channel ?? "linkedin",
    contactLink: raw.contactLink ?? "",
    draft: raw.draft ?? "",
    contacts,
    reachedOutAt: raw.reachedOutAt,
    followUpAt: raw.followUpAt,
    priority: raw.priority ?? "warm",
    source: raw.source ?? "",
    website: raw.website,
    jobUrl: raw.jobUrl,
    location: raw.location,
    salary: raw.salary,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    closedReason: raw.closedReason,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    order: typeof raw.order === "number" ? raw.order : 0,
  };
}

export type JobsView = "list" | "board";

interface JobsStore extends JobsState {
  hasHydrated: boolean;
  view: JobsView;

  setHasHydrated: (v: boolean) => void;
  setView: (v: JobsView) => void;

  // companies
  addCompany: (input: Partial<Company>) => string;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  setStage: (id: string, stage: Stage) => void;
  deleteCompany: (id: string) => void;

  // templates
  addTemplate: (input: Pick<Template, "name" | "body">) => void;
  updateTemplate: (id: string, patch: Partial<Pick<Template, "name" | "body">>) => void;
  deleteTemplate: (id: string) => void;

  // data management
  exportJobs: () => JobsState;
  importJobs: (data: JobsState) => void;
  resetJobs: () => void;
}

const seed = buildJobsSeed();

export const useJobs = create<JobsStore>()(
  persist(
    (set, get) => ({
      ...seed,
      hasHydrated: false,
      view: "list",

      setHasHydrated: (v) => set({ hasHydrated: v }),
      setView: (view) => set({ view }),

      addCompany: (input) => {
        const id = uid("co");
        set((s) => {
          const siblings = s.companies.filter(
            (c) => c.stage === (input.stage ?? "lead"),
          );
          const company = normalizeCompany({
            ...input,
            id,
            order: siblings.length,
            createdAt: new Date().toISOString(),
          });
          return { companies: [...s.companies, company] };
        });
        return id;
      },

      updateCompany: (id, patch) =>
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === id ? normalizeCompany({ ...c, ...patch }) : c,
          ),
        })),

      setStage: (id, stage) =>
        set((s) => ({
          companies: s.companies.map((c) => {
            if (c.id !== id) return c;
            // Auto-stamp reachedOutAt the first time we advance to contacted+.
            const reachedOutAt =
              !c.reachedOutAt && CONTACTED_OR_BEYOND.includes(stage)
                ? todayISO()
                : c.reachedOutAt;
            return { ...c, stage, reachedOutAt };
          }),
        })),

      deleteCompany: (id) =>
        set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),

      addTemplate: (input) =>
        set((s) => ({
          templates: [
            ...s.templates,
            { ...input, id: uid("tpl"), order: s.templates.length },
          ],
        })),

      updateTemplate: (id, patch) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      deleteTemplate: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

      exportJobs: () => {
        const { companies, templates } = get();
        return { version: JOBS_SCHEMA_VERSION, companies, templates };
      },

      importJobs: (data) =>
        set(() => ({
          version: data.version ?? JOBS_SCHEMA_VERSION,
          companies: (data.companies ?? []).map(normalizeCompany),
          templates: data.templates ?? [],
        })),

      resetJobs: () => {
        const fresh = buildJobsSeed();
        set({
          version: fresh.version,
          companies: fresh.companies,
          templates: fresh.templates,
        });
      },
    }),
    {
      name: "job-application-planner",
      version: JOBS_SCHEMA_VERSION,
      // Pass-through migrate, wired from day one so future field additions
      // don't wipe data. Normalization happens on rehydrate below.
      migrate: (persisted) => persisted as JobsState,
      partialize: (s) => ({
        version: s.version,
        companies: s.companies,
        templates: s.templates,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.companies = (state.companies ?? []).map(normalizeCompany);
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
