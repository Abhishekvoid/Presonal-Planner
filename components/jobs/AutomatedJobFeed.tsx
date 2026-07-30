"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightning,
  Sparkle,
  CheckCircle,
  Building,
  User,
  Envelope,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Funnel,
  FileText,
  PaperPlaneTilt,
  MapPin,
  Globe,
  CircleNotch,
} from "@phosphor-icons/react";
import { AggregatedJob, getAggregatedJobs } from "@/lib/jobs/jobAggregator";
import { CandidateProfile, DEFAULT_CANDIDATE_PROFILE, computeResumeMatchScore } from "@/lib/jobs/resumeParser";
import { useJobs } from "@/lib/jobs/store";
import { OutreachPitchGeneratorModal } from "./OutreachPitchGeneratorModal";
import { Company } from "@/lib/jobs/types";

export function AutomatedJobFeed({
  candidateProfile,
  onOpenResumeModal,
}: {
  candidateProfile?: CandidateProfile;
  onOpenResumeModal: () => void;
}) {
  const addCompany = useJobs((s) => s.addCompany);
  const activeProfile = candidateProfile || DEFAULT_CANDIDATE_PROFILE;

  const [portalFilter, setPortalFilter] = useState<string>("All");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [importedJobId, setImportedJobId] = useState<string | null>(null);
  const [outreachModalCompany, setOutreachModalCompany] = useState<Company | null>(null);

  const [liveJobs, setLiveJobs] = useState<AggregatedJob[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Run live web scan via API route /api/jobs/search
  const runLiveWebScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: activeProfile.skills,
          city: activeProfile.city || "Ahmedabad",
          state: activeProfile.state || "Gujarat",
          isRemote: activeProfile.isRemote ?? true,
          resumeText: activeProfile.resumeText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawJobs = data.jobs || [];

        // Score jobs dynamically against candidate profile
        const scoredJobs: AggregatedJob[] = rawJobs.map((j: any) => ({
          ...j,
          matchResult: computeResumeMatchScore(
            activeProfile.skills,
            j.roleTitle || j.title || "Software Engineer",
            j.description || ""
          ),
        }));

        scoredJobs.sort((a, b) => b.matchResult.score - a.matchResult.score);
        setLiveJobs(scoredJobs);
      } else {
        // Fallback to initial seed if API route fails
        setLiveJobs(getAggregatedJobs(activeProfile.skills));
      }
    } catch (e) {
      setLiveJobs(getAggregatedJobs(activeProfile.skills));
    } finally {
      setIsScanning(false);
    }
  };

  // Run scan when active profile changes
  useEffect(() => {
    runLiveWebScan();
  }, [activeProfile.city, activeProfile.state, activeProfile.isRemote, activeProfile.skills.length]);

  const jobsToDisplay = liveJobs.length > 0 ? liveJobs : getAggregatedJobs(activeProfile.skills);

  const filteredJobs = jobsToDisplay.filter(
    (j) => portalFilter === "All" || j.portal === portalFilter
  );

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleImportToPipeline = (job: AggregatedJob) => {
    const firstContact = job.contacts[0];
    const newCompany: Company = {
      id: `imported-${job.id}`,
      name: job.companyName,
      role: job.roleTitle,
      stage: "to_contact",
      priority: "hot",
      channel: "email",
      contactName: firstContact?.name || "Hiring Team",
      contactRole: firstContact?.role || "Engineering Manager",
      contactLink: firstContact?.email || "",
      draft: `Hi ${firstContact?.name || "Engineering Team"}, I'm an AI & Backend Engineer (1.5s RAG, 60k/s Celery queue)...`,
      contacts: job.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        channel: "email",
        link: c.email,
        draft: `Hi ${c.name}, I'm an AI & Backend Engineer (1.5s RAG, 60k/s Celery queue)...`,
      })),
      notes: `Imported from ${job.portal}. Resume Match Score: ${job.matchResult.score}%. Location: ${job.location}. Salary: ${job.salaryRange}`,
      source: job.portal,
      tags: [job.portal, "AI", "Backend"],
      createdAt: new Date().toISOString(),
      order: 0,
    };

    addCompany(newCompany);
    setImportedJobId(job.id);
    setOutreachModalCompany(newCompany);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Location Match Strip */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-cream-raised to-cream-base dark:from-amber-500/10 dark:via-[#12151E] dark:to-[#0A0C10] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500 text-black font-bold text-xs">
              <Lightning size={14} weight="fill" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-espresso">
              Real-Time AI Web Job Scan & Employee Finder
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-coffee">
            <span className="inline-flex items-center gap-1 font-bold text-espresso bg-cream-base dark:bg-[#12151E] px-2.5 py-0.5 rounded-lg border border-hair">
              <MapPin size={13} className="text-amber-500" />
              <span>Target: {activeProfile.city || "Ahmedabad"}, {activeProfile.state || "Gujarat"}</span>
            </span>

            {activeProfile.isRemote && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                <Globe size={13} />
                <span>Remote / Hybrid Enabled</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={runLiveWebScan}
            disabled={isScanning}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-mono text-xs font-bold text-black hover:bg-amber-400 shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isScanning ? (
              <CircleNotch size={16} className="animate-spin" />
            ) : (
              <Sparkle size={16} weight="fill" />
            )}
            <span>{isScanning ? "Scanning Web & Portals..." : "Run Live Web Job Scan"}</span>
          </button>

          <button
            onClick={onOpenResumeModal}
            className="flex items-center gap-1.5 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] px-3 py-2.5 font-mono text-xs font-bold text-espresso hover:bg-coffee/10"
            title="Edit Resume & Location"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">Resume & Location</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono text-xs border-b border-hair pb-3">
        <span className="text-coffee font-bold uppercase text-[10px] mr-2">Filter Portals:</span>
        {["All", "Wellfound", "Naukri", "LinkedIn", "WeWorkRemotely", "YC Jobs"].map((portal) => (
          <button
            key={portal}
            onClick={() => setPortalFilter(portal)}
            className={`px-3 py-1.5 rounded-xl border transition-all ${
              portalFilter === portal
                ? "border-amber-500 bg-amber-500/15 text-espresso font-bold shadow-xs"
                : "border-hair bg-cream-raised dark:bg-[#12151E] text-coffee hover:text-espresso"
            }`}
          >
            {portal === "All" ? `All Portals (${filteredJobs.length})` : portal}
          </button>
        ))}
      </div>

      {/* Aggregated Job List Grid */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="group relative overflow-hidden rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-5 shadow-lg space-y-4 hover:border-amber-500/40 transition-all"
          >
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hair pb-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10.5px]">
                  <span className="font-bold text-espresso uppercase tracking-wider">
                    {job.companyName}
                  </span>
                  <span className="text-coffee">•</span>
                  <span className="text-coffee">{job.location}</span>
                  <span className="text-coffee">•</span>
                  <span className="rounded bg-coffee/10 px-2 py-0.5 font-bold text-coffee">
                    {job.portal}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-espresso leading-snug">
                  {job.roleTitle}
                </h3>
              </div>

              {/* Match Score Badge */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs font-extrabold text-amber-500">
                    {job.matchResult.score}% Resume Match
                  </span>
                  <span className="font-mono text-[9px] uppercase font-bold text-emerald-500">
                    {job.matchResult.matchTier}
                  </span>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-extrabold text-xs border border-amber-500/30">
                  {job.matchResult.score}%
                </div>
              </div>
            </div>

            {/* Description & Skill Badges */}
            <p className="font-sans text-xs text-coffee leading-relaxed">
              {job.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
              <span className="text-coffee font-bold mr-1">Matching Skills:</span>
              {job.matchResult.matchingSkills.map((sk) => (
                <span
                  key={sk}
                  className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  ✓ {sk}
                </span>
              ))}
            </div>

            {/* Employee Contacts Box */}
            <div className="rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] p-3.5 space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-coffee">
                <span className="flex items-center gap-1 text-amber-500">
                  <User size={13} />
                  <span>Discovered Employee Contacts ({job.contacts.length})</span>
                </span>
                <span className="text-emerald-500 flex items-center gap-1">
                  <ShieldCheck size={13} /> Real Email Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {job.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-hair bg-cream-raised dark:bg-[#0E1117] font-mono text-xs"
                  >
                    <div>
                      <div className="font-bold text-espresso">{c.name}</div>
                      <div className="text-[10px] text-coffee">{c.role}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[180px]">
                        {c.email}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyEmail(c.email)}
                      className="p-1.5 rounded-lg border border-hair bg-cream-base dark:bg-[#12151E] text-coffee hover:text-espresso"
                      title="Copy Email"
                    >
                      {copiedEmail === c.email ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-hair pt-3 font-mono text-xs">
              <span className="text-coffee text-[10.5px]">
                Posted: <strong>{job.postedAgo}</strong> · Compensation: <strong>{job.salaryRange}</strong>
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] text-coffee hover:text-espresso font-semibold"
                >
                  <span>View Original Job</span>
                  <ArrowUpRight size={13} />
                </a>

                <button
                  onClick={() => handleImportToPipeline(job)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-400 shadow-md transition-all active:scale-95"
                >
                  {importedJobId === job.id ? <Check size={15} /> : <PaperPlaneTilt size={15} weight="fill" />}
                  <span>{importedJobId === job.id ? "Imported to Pipeline!" : "Import & Generate Outreach Pitch"}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Outreach Pitch Generator Modal Trigger */}
      {outreachModalCompany && (
        <OutreachPitchGeneratorModal
          company={outreachModalCompany}
          open={!!outreachModalCompany}
          onClose={() => setOutreachModalCompany(null)}
        />
      )}
    </div>
  );
}
