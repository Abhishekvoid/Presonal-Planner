"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useJobs } from "@/lib/jobs/store";
import { actionBuckets } from "@/lib/jobs/selectors";
import { Company } from "@/lib/jobs/types";
import { Button, Modal } from "@/components/primitives";
import { ActionStrip } from "./ActionStrip";
import { CompanyList } from "./CompanyList";
import { CompanyBoard } from "./CompanyBoard";
import { CompanyForm } from "./CompanyForm";
import { CompanyDetail } from "./CompanyDetail";
import { TemplateManager } from "./TemplateManager";
import { JobsBackupPanel } from "./JobsBackupPanel";

export function JobsPlanner() {
  const hasHydrated = useJobs((s) => s.hasHydrated);
  const companies = useJobs((s) => s.companies);
  const view = useJobs((s) => s.view);
  const setView = useJobs((s) => s.setView);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ready = mounted && hasHydrated;

  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; company?: Company }>({ open: false });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);

  const buckets = useMemo(() => actionBuckets(companies, new Date()), [companies]);
  const detail = detailId ? companies.find((c) => c.id === detailId) ?? null : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <JobsHeader
          onTemplates={() => setTemplatesOpen(true)}
          onBackup={() => setBackupOpen(true)}
        />

        <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
          {!ready ? (
            <Skeleton />
          ) : companies.length === 0 ? (
            <EmptyState onAdd={() => setForm({ open: true })} />
          ) : (
            <>
              <ActionStrip buckets={buckets} onOpen={(c) => setDetailId(c.id)} />

              <div className="mb-4 flex items-center gap-3">
                <ViewToggle view={view} setView={setView} />
                <Button
                  variant="solid"
                  className="ml-auto"
                  onClick={() => setForm({ open: true })}
                >
                  + Add company
                </Button>
              </div>

              {view === "list" ? (
                <CompanyList companies={companies} onOpen={(c) => setDetailId(c.id)} />
              ) : (
                <CompanyBoard companies={companies} onOpen={(c) => setDetailId(c.id)} />
              )}
            </>
          )}
        </main>

        {/* Detail */}
        <Modal
          open={!!detail}
          onClose={() => setDetailId(null)}
          title={detail?.name ?? "Company"}
        >
          {detail && (
            <CompanyDetail
              company={detail}
              onEdit={() => {
                setForm({ open: true, company: detail });
                setDetailId(null);
              }}
              onClose={() => setDetailId(null)}
            />
          )}
        </Modal>

        {/* Add / edit */}
        <Modal
          open={form.open}
          onClose={() => setForm({ open: false })}
          title={form.company ? "Edit company" : "Add company"}
        >
          <CompanyForm
            company={form.company}
            onDone={(id) => {
              setForm({ open: false });
              if (id) setDetailId(id);
            }}
          />
        </Modal>

        {/* Templates */}
        <Modal open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Message templates">
          <TemplateManager />
        </Modal>

        {/* Backup */}
        <Modal open={backupOpen} onClose={() => setBackupOpen(false)} title="Outreach backup & data">
          <JobsBackupPanel onDone={() => setBackupOpen(false)} />
        </Modal>
      </div>
    </MotionConfig>
  );
}

function JobsHeader({
  onTemplates,
  onBackup,
}: {
  onTemplates: () => void;
  onBackup: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-cream-base/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="h-3 w-3 bg-clay" aria-hidden />
          <span className="font-display text-base font-extrabold tracking-tightest text-espresso">
            OUTREACH
          </span>
        </div>

        <nav className="ml-2 flex items-center gap-1">
          <Link
            href="/"
            className="px-3 py-1.5 text-sm font-medium text-coffee transition-colors hover:text-espresso"
          >
            Study
          </Link>
          <span className="relative px-3 py-1.5 text-sm font-medium text-espresso">
            Outreach
            <span className="absolute inset-x-3 -bottom-[15px] h-[2px] bg-espresso" />
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onTemplates}
            className="label text-coffee transition-colors hover:text-espresso px-2 py-1"
          >
            Templates
          </button>
          <button
            onClick={onBackup}
            className="label text-coffee transition-colors hover:text-espresso px-2 py-1"
          >
            Backup
          </button>
        </div>
      </div>
    </header>
  );
}

function ViewToggle({
  view,
  setView,
}: {
  view: "list" | "board";
  setView: (v: "list" | "board") => void;
}) {
  return (
    <div className="inline-flex border hairline">
      {(["list", "board"] as const).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
            view === v
              ? "bg-espresso text-cream-raised"
              : "text-coffee hover:text-espresso hover:bg-cream-deep/50"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="border hairline bg-cream-raised px-6 py-20 text-center">
      <h2 className="font-display text-2xl font-bold tracking-tightest text-espresso">
        Start your outreach pipeline.
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-coffee">
        Track every company you want to reach, who to contact, and when to follow up. Add your
        first lead and move it across the pipeline as you go.
      </p>
      <div className="mt-6">
        <Button variant="solid" onClick={onAdd}>
          + Add your first company
        </Button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-3 gap-px border hairline">
        <div className="h-20 bg-cream-deep" />
        <div className="h-20 bg-cream-deep" />
        <div className="h-20 bg-cream-deep" />
      </div>
      <div className="h-8 w-40 bg-cream-deep" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-cream-deep" />
        ))}
      </div>
    </div>
  );
}
