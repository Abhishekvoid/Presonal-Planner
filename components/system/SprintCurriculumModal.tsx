"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle,
  Lightning,
  Sparkle,
  TreeStructure,
  CaretRight,
  Database,
  Cpu,
  ArrowsClockwise,
  CreditCard,
  Bell,
  Gauge,
  Trophy,
} from "@phosphor-icons/react";
import { TopicProgressData } from "@/lib/mentorStore";

export interface SprintModuleItem {
  id: string;
  day: number;
  title: string;
  subtitle: string;
  category: "Database Engineering" | "Distributed Systems" | "AI & ML Infra" | "High Concurrency" | "Staff L6 Exam";
  targetOrgs: string;
  icon: any;
  techStack: string[];
}

export const SPRINT_MODULES: SprintModuleItem[] = [
  {
    id: "day-1-django-orm",
    day: 1,
    title: "Django ORM & N+1 Query Optimization",
    subtitle: "Eliminating O(N) database round-trips with prefetch_related, select_related, and annotate aggregations.",
    category: "Database Engineering",
    targetOrgs: "YC Startups · Stripe · Vercel",
    icon: Database,
    techStack: ["PostgreSQL", "Django ORM", "SQL EXPLAIN"],
  },
  {
    id: "day-2-postgres-indexing",
    day: 2,
    title: "PostgreSQL Indexing & EXPLAIN ANALYZE",
    subtitle: "B-Tree, GIN, BRIN indexes, composite key ordering, and execution plan optimization.",
    category: "Database Engineering",
    targetOrgs: "OpenAI · Supabase · Datadog",
    icon: Database,
    techStack: ["PostgreSQL 16", "pghero", "Composite Indexes"],
  },
  {
    id: "day-3-redis-rate-limiter",
    day: 3,
    title: "Redis Cache-Aside & Rate Limiters",
    subtitle: "Sliding window rate-limiting algorithms, Redlock distributed locking, and cache eviction policies.",
    category: "High Concurrency",
    targetOrgs: "Cloudflare · DoorDash · Uber",
    icon: Gauge,
    techStack: ["Redis Cluster", "Lua Scripts", "Token Bucket"],
  },
  {
    id: "day-4-celery-async-reliability",
    day: 4,
    title: "Celery Task Queues & DLQ Reliability",
    subtitle: "Asynchronous task execution, idempotent workers, dead-letter queue replay, and exponential backoff.",
    category: "Distributed Systems",
    targetOrgs: "Airbnb · Robinhood · Coinbase",
    icon: ArrowsClockwise,
    techStack: ["RabbitMQ", "Celery", "Kafka DLQ"],
  },
  {
    id: "day-5-payment-system-design",
    day: 5,
    title: "Payment Gateway Idempotency & Webhooks",
    subtitle: "Transactional outbox pattern, double-charge prevention, and exactly-once payment processing.",
    category: "Distributed Systems",
    targetOrgs: "Stripe · Adyen · Square",
    icon: CreditCard,
    techStack: ["PostgreSQL", "Stripe API", "Redlock"],
  },
  {
    id: "day-6-rag-architecture",
    day: 6,
    title: "RAG Architecture & Hybrid Vector Search",
    subtitle: "Combining sparse BM25 and dense Qdrant vector retrieval with Cross-Encoder reranking.",
    category: "AI & ML Infra",
    targetOrgs: "OpenAI · Anthropic · Cohere",
    icon: Cpu,
    techStack: ["Qdrant", "text-embedding-3", "Cross-Encoder"],
  },
  {
    id: "day-7-notification-fanout",
    day: 7,
    title: "Notification Fan-Out Architecture",
    subtitle: "High-throughput message delivery pipeline across Kafka, WebSockets, and Push Gateways.",
    category: "High Concurrency",
    targetOrgs: "Discord · Slack · Twitch",
    icon: Bell,
    techStack: ["Kafka", "WebSockets", "FCM"],
  },
  {
    id: "day-8-prometheus-llm-gateway",
    day: 8,
    title: "Prometheus Metrics & LLM Gateway Middleware",
    subtitle: "Observability, rate-limit proxying, and circuit breakers for AI inference endpoints.",
    category: "AI & ML Infra",
    targetOrgs: "Datadog · Grafana · Anyscale",
    icon: Gauge,
    techStack: ["Prometheus", "OpenTelemetry", "FastAPI"],
  },
  {
    id: "day-9-mock-interview-marathon",
    day: 9,
    title: "Full L6 Staff Engineer Mock Interview",
    subtitle: "Comprehensive 60-minute simulated system architecture and live coding evaluation.",
    category: "Staff L6 Exam",
    targetOrgs: "FAANG / Staff Engineer Benchmarks",
    icon: Trophy,
    techStack: ["System Architecture", "Algorithms", "L6 Scorecard"],
  },
];

export interface SprintCurriculumModalProps {
  open: boolean;
  onClose: () => void;
  activeTopicId: string;
  topicProgress: Record<string, TopicProgressData>;
  onSelectTopic: (topicId: string, title: string, day: number) => void;
}

export function SprintCurriculumModal({
  open,
  onClose,
  activeTopicId,
  topicProgress,
  onSelectTopic,
}: SprintCurriculumModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden"
      >
        <div className="w-full max-w-4xl max-h-[85vh] bg-cream-raised dark:bg-[#12151E] border border-hair rounded-2xl shadow-2xl flex flex-col overflow-hidden text-espresso dark:text-zinc-100">
          {/* Top Header */}
          <div className="p-5 border-b border-hair flex items-center justify-between bg-cream-base dark:bg-[#0A0C10] shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-emerald-400 border border-amber-500/30">
                <TreeStructure size={22} weight="bold" />
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight">
                  Staff Engineering Curriculum Syllabus
                </h2>
                <p className="font-mono text-xs text-coffee">
                  9 High-ROI Sprint Modules Calibrated for YC & Global Staff L6 Roles
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-hair bg-cream-raised dark:bg-[#161922] text-coffee hover:text-espresso transition-all"
              title="Close Syllabus (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Module Cards Grid */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPRINT_MODULES.map((mod) => {
              const prog = topicProgress[mod.id];
              const completedCount = prog?.completedSteps?.length || 0;
              const isCompleted = completedCount >= 13 || prog?.completedSteps?.includes(13);
              const isActive = activeTopicId === mod.id;
              const IconComp = mod.icon;

              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    onSelectTopic(mod.id, mod.title, mod.day);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3 group ${
                    isActive
                      ? "border-amber-500 bg-amber-500/10 dark:bg-emerald-500/10 shadow-sm"
                      : "border-hair bg-cream-base dark:bg-[#0E1117] hover:border-amber-500/50 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase font-bold text-amber-600 dark:text-emerald-400 tracking-wider">
                        Day 0{mod.day} · {mod.category}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle size={12} />
                          <span>MASTERED</span>
                        </span>
                      ) : isActive ? (
                        <span className="font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          ACTIVE SPRINT
                        </span>
                      ) : null}
                    </div>

                    {/* Module Title */}
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-hair text-amber-600 dark:text-emerald-400 shrink-0 mt-0.5">
                        <IconComp size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-espresso dark:text-white group-hover:text-amber-600 dark:group-hover:text-emerald-400 transition-colors">
                          {mod.title}
                        </h3>
                        <p className="font-sans text-xs text-coffee leading-relaxed mt-1 line-clamp-2">
                          {mod.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="pt-3 border-t border-hair flex items-center justify-between text-[11px] font-mono">
                    <span className="text-coffee font-semibold">{mod.targetOrgs}</span>
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      <span>Select Module</span>
                      <CaretRight size={12} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
