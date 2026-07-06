"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useJobs } from "@/lib/jobs/store";
import { usePlanner } from "@/lib/store";
import { overallProgress } from "@/lib/selectors";
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
import { ThemeToggle } from "@/components/ThemeToggle";

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
              <OutreachFunnel companies={companies} />
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
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 md:gap-4 px-3 sm:px-8 py-3.5">
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-clay" aria-hidden />
          <span className="font-display text-sm sm:text-base font-extrabold tracking-tightest text-espresso">
            OUTREACH
          </span>
        </div>

        <nav className="ml-1 sm:ml-2 flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/"
            className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-coffee transition-colors hover:text-espresso"
          >
            Study
          </Link>
          <span className="relative px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-espresso">
            Outreach
            <span className="absolute inset-x-1.5 sm:inset-x-2 -bottom-[15px] h-[2px] bg-espresso" />
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onTemplates}
            className="label text-coffee transition-colors hover:text-espresso px-2 py-1 text-[10px] sm:text-xs"
          >
            Templates
          </button>
          <button
            onClick={onBackup}
            className="label text-coffee transition-colors hover:text-espresso px-2 py-1 hidden md:inline-block text-[10px] sm:text-xs"
          >
            Backup
          </button>
          <ThemeToggle />
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

function OutreachFunnel({ companies }: { companies: Company[] }) {
  const plannerState = usePlanner();
  const studyPct = overallProgress(plannerState).pct;

  const wishlist = companies.filter(c => c.stage === "lead").length;
  const applied = companies.filter(c => c.stage === "to_contact").length;
  const contacted = companies.filter(c => c.stage === "contacted" || c.stage === "replied").length;
  const interviewing = companies.filter(c => c.stage === "interviewing").length;
  const offers = companies.filter(c => c.stage === "offer").length;

  const totalApplied = wishlist + applied;
  const totalInFlight = contacted + interviewing;

  const baseSalaryMultiplier = 1200000 + Math.round(studyPct * 12000); 
  const usdSalaryMultiplier = 60000 + Math.round(studyPct * 400); 
  const negotiatedEquity = 0.2 + (studyPct * 0.008); 

  const totalBaseValueINR = offers > 0 ? offers * baseSalaryMultiplier : baseSalaryMultiplier;
  const totalBaseValueUSD = offers > 0 ? offers * usdSalaryMultiplier : usdSalaryMultiplier;

  return (
    <div className="reveal border border-coffee/30 bg-cream-raised p-5 mb-6 rounded-sm shadow-sm">
      <div className="flex items-center justify-between border-b border-coffee/15 pb-2.5 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-espresso uppercase tracking-wide">📈 Outreach Funnel &amp; Equity Forecaster</h3>
          <p className="text-[10px] text-coffee mt-0.5">Tied to your study completion level ({studyPct}%)</p>
        </div>
        <span className="text-[9px] font-mono font-bold text-coffee bg-cream-deep/40 px-2 py-0.5 rounded-sm">
          Offers: {offers}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-12 lg:col-span-7 space-y-3.5 border-b lg:border-b-0 lg:border-r border-coffee/15 pb-4 lg:pb-0 lg:pr-6">
          <h4 className="label text-coffee mb-1">Pipeline Stages</h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span>📁 Applied / Wishlist</span>
                <span className="font-bold">{totalApplied} companies</span>
              </div>
              <div className="h-4 bg-cream-deep/40 border border-coffee/10 rounded-sm relative overflow-hidden">
                <div 
                  className="h-full bg-coffee/80 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (totalApplied / (companies.length || 1)) * 100))}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span>🗣 Interviewing / In-Flight</span>
                <span className="font-bold">{totalInFlight} companies</span>
              </div>
              <div className="h-4 bg-cream-deep/40 border border-coffee/10 rounded-sm relative overflow-hidden">
                <div 
                  className="h-full bg-clay transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (totalInFlight / (companies.length || 1)) * 100))}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span>🎉 Offers Secured</span>
                <span className="font-bold text-olive-deep">{offers} offers</span>
              </div>
              <div className="h-4 bg-cream-deep/40 border border-coffee/10 rounded-sm relative overflow-hidden">
                <div 
                  className="h-full bg-olive transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, (offers / (companies.length || 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col justify-between pl-0 lg:pl-2">
          <div>
            <h4 className="label text-coffee mb-2">Simulated Negotiated Value</h4>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-coffee/5">
                <span className="text-coffee-soft">Expected base (INR):</span>
                <span className="font-bold text-espresso">₹{totalBaseValueINR.toLocaleString()} / yr</span>
              </div>
              <div className="flex justify-between py-1 border-b border-coffee/5">
                <span className="text-coffee-soft">Expected base (USD):</span>
                <span className="font-bold text-espresso">${totalBaseValueUSD.toLocaleString()} / yr</span>
              </div>
              <div className="flex justify-between py-1 border-b border-coffee/5">
                <span className="text-coffee-soft">Expected equity:</span>
                <span className="font-bold text-olive-deep">{negotiatedEquity.toFixed(2)}% shares</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-coffee-soft leading-normal mt-3.5">
            {offers > 0 
              ? "🎉 Offer(s) detected! Your negotiated salary and equity variables are calculated using your full 10-day prep study completion multiplier." 
              : "No active offers logged in the board yet. Compensation and equity values show projected starting multipliers based on your current study progress."}
          </p>
        </div>
      </div>
    </div>
  );
}

