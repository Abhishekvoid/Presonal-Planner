"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PaperPlaneTilt,
  Copy,
  Check,
  Building,
  User,
  Sparkle,
  X,
  LinkBreak,
  Lightning,
  Calendar,
} from "@phosphor-icons/react";
import { Company } from "@/lib/jobs/types";
import { useJobs } from "@/lib/jobs/store";

export function OutreachPitchGeneratorModal({
  company,
  open,
  onClose,
}: {
  company: Company;
  open: boolean;
  onClose: () => void;
}) {
  const updateCompany = useJobs((s) => s.updateCompany);
  const [copied, setCopied] = useState(false);

  // Determine tailored pitch template based on company name
  const companyName = company.name.toLowerCase();

  let tailoredPitch = {
    subject: `Senior AI Backend Engineer (1.5s RAG, Celery 60k/s, ROS2 Latency Reduction)`,
    body: `Hi Engineering Team at ${company.name},

I’m Abhishek Rajput, an AI & Robotics Backend Engineer (1.5 years production experience) specializing in high-throughput Django, Redis, Celery, and Qdrant RAG systems.

Given ${company.name}'s focus on high-scale backend infrastructure and AI systems, I thought you might find two of my recent production benchmarks relevant:

1. RAG & Vector Search: Designed a hybrid Qdrant HNSW + Cross-Encoder re-ranking pipeline bringing P99 context retrieval latency down to 1.5s while reducing hallucination by 40%.
2. High-Throughput Celery Queues: Built an async Celery worker pool processing 60,000 industrial data tags/sec with ack_late=True durability and Dead Letter Queue (DLQ) poison-pill isolation.

I’ve put together a live architecture proof artifact deck detailing the Redis sliding-window rate limiter, Celery retry jitter, and payment idempotency models here:
https://github.com/Abhishekvoid/Presonal-Planner

I'd love to jump on a brief 10-minute call this week to share how I can help accelerate your backend roadmap.

Best regards,
Abhishek Rajput
Ahmedabad, Gujarat · Open for Remote / On-Site
GitHub: https://github.com/Abhishekvoid`,
  };

  if (companyName.includes("sarvam") || companyName.includes("krutrim")) {
    tailoredPitch.subject = `AI Backend Engineer — Qdrant HNSW, Cross-Encoders, & 1.5s RAG Pipeline`;
    tailoredPitch.body = `Hi Team ${company.name},

I’ve been closely following ${company.name}’s work in Indian LLMs & AI infrastructure. As an AI Backend Engineer with hands-on experience in Qdrant vector search and high-throughput Python backends, I wanted to reach out directly.

Recently, I built a hybrid RAG retrieval pipeline using Qdrant HNSW vector search + BM25 keyword matching with Cross-Encoder re-ranking, cutting context retrieval down to 1.5s.

Here is my technical proof artifact & architecture deck:
https://github.com/Abhishekvoid/Presonal-Planner

Would you be open to a 10-minute chat this week?

Best regards,
Abhishek Rajput`;
  } else if (companyName.includes("observe") || companyName.includes("ripik")) {
    tailoredPitch.subject = `AI Backend Engineer — 60k tags/sec Celery Queues & P99 Latency Monitoring`;
    tailoredPitch.body = `Hi Engineering Team at ${company.name},

I'm an AI & Backend Engineer with production experience scaling high-concurrency systems (Celery, Redis, PostgreSQL) and robotics data feeds (500ms -> 150ms latency optimization).

At ${company.name}, where scale and observability are paramount, my experience building a 60,000 tags/sec Celery worker pool with exponential jitter retries and Prometheus P99 metrics would align directly with your current infrastructure challenges.

Architecture Proof Artifact Deck:
https://github.com/Abhishekvoid/Presonal-Planner

Let me know if you'd be available for a brief 10-minute introduction call this week.

Best,
Abhishek Rajput`;
  }

  const handleCopyAndLogOutreach = () => {
    navigator.clipboard.writeText(`Subject: ${tailoredPitch.subject}\n\n${tailoredPitch.body}`);
    setCopied(true);
    // Set 3-day follow-up automatic reminder
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    updateCompany(company.id, {
      followUpAt: followUpDate.toISOString().slice(0, 10),
      stage: "contacted",
    });
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hair pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shadow-md">
                <PaperPlaneTilt size={20} weight="fill" />
              </div>
              <div>
                <h2 className="text-base font-bold text-espresso leading-tight">
                  Tailored Cold Outreach Pitch — {company.name}
                </h2>
                <p className="font-mono text-xs text-coffee">
                  Automated high-conversion technical pitch with embedded proof artifact links.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Subject Box */}
          <div className="space-y-1 font-mono text-xs">
            <label className="text-[10px] uppercase font-bold text-amber-500">
              Email Subject Line
            </label>
            <div className="rounded-lg border border-hair bg-cream-base dark:bg-[#12151E] p-2.5 font-semibold text-espresso">
              {tailoredPitch.subject}
            </div>
          </div>

          {/* Body Box */}
          <div className="space-y-1 font-mono text-xs">
            <label className="text-[10px] uppercase font-bold text-coffee">
              Email Body (With Proof Links & Metrics)
            </label>
            <textarea
              readOnly
              value={tailoredPitch.body}
              rows={11}
              className="w-full rounded-xl border border-hair bg-cream-base dark:bg-[#12151E] p-3 text-xs font-mono text-espresso leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-hair">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-coffee">
              <Calendar size={13} className="text-amber-500" />
              <span>Copies text & automatically sets a 3-day follow-up reminder</span>
            </div>

            <button
              onClick={handleCopyAndLogOutreach}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-mono text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-all active:scale-95"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "Copied & Follow-up Logged!" : "Copy Pitch & Set 3-Day Follow-Up"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
