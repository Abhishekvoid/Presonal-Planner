"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Copy,
  Check,
  Download,
  ShareNetwork,
  Lightning,
  Sparkle,
  Code,
  X,
  ArrowUpRight,
  Brain,
  ShieldCheck,
  Stack,
} from "@phosphor-icons/react";
import { MermaidRenderer } from "./MermaidRenderer";

export interface SystemBlueprint {
  id: string;
  title: string;
  category: string;
  metrics: string;
  description: string;
  mermaidChart: string;
  pitchSummary: string;
  technicalHighlights: string[];
}

export const SYSTEM_BLUEPRINTS: SystemBlueprint[] = [
  {
    id: "rag-architecture",
    title: "1.5s Low-Latency RAG & Vector Search Pipeline",
    category: "RAG & AI Systems",
    metrics: "P99 < 1.5s · Qdrant HNSW · Cross-Encoder",
    description: "Production RAG architecture combining Qdrant dense vector search with BM25 keyword search and Cross-Encoder re-ranking for ultra-precise context retrieval.",
    mermaidChart: `graph TD
    A[User Query] --> B[Embedding Model text-embedding-3-small]
    B --> C[Qdrant HNSW Dense Vector Index]
    A --> D[BM25 Sparse Keyword Index]
    C --> E[Hybrid Reciprocal Rank Fusion RRF]
    D --> E
    E --> F[Top 20 Chunks]
    F --> G[Cross-Encoder Re-Ranker ms-marco-MiniLM]
    G --> H[Top 5 Precision Context Chunks]
    H --> I[DeepSeek-V4 LLM Generator]
    I --> J[Streaming Response 1.5s]`,
    pitchSummary: "Architected a hybrid RAG pipeline using Qdrant HNSW vector search + BM25 keyword matching with Cross-Encoder re-ranking, cutting context retrieval latency down to 1.5s while reducing hallucination by 40%.",
    technicalHighlights: [
      "Parent-Child Document Chunking (512 token child, 1024 parent window)",
      "Reciprocal Rank Fusion (RRF) for hybrid dense + sparse retrieval",
      "ms-marco-MiniLM-L-6-v2 Cross-Encoder for precision top-5 re-ranking",
      "Semantic Response Caching with Redis to serve repeated queries under 50ms",
    ],
  },
  {
    id: "celery-async-queue",
    title: "Celery Async Worker Pool & Dead Letter Queue",
    category: "Distributed Systems & Celery",
    metrics: "60k Tags/sec · Exponential Jitter · Zero Data Loss",
    description: "High-throughput Celery task processing architecture using RabbitMQ exchanges, atomic task deduplication, and isolated Poison-Pill DLQ routing.",
    mermaidChart: `graph LR
    Producer[Django API Producer] -->|Task Payload| Exchange[RabbitMQ Topic Exchange]
    Exchange -->|Route Key| MainQueue[Primary Celery Queue]
    MainQueue --> Workers[Celery Worker Pool - ack_late=True]
    Workers -->|Task Fail < 3 retries| Backoff[Exponential Backoff + Jitter]
    Backoff -->|Retry| MainQueue
    Workers -->|Max Retries Exceeded| DLQ[Dead Letter Queue DLQ]
    DLQ --> Alert[Prometheus Alert + Sentry Log]
    Workers -->|Success| DB[(PostgreSQL Ledger)]`,
    pitchSummary: "Built a reliable Celery task pipeline handling 60,000 industrial data tags/sec with ack_late=True durability, randomized exponential jitter retries, and isolated DLQ routing for poison-pill tasks.",
    technicalHighlights: [
      "Atomic Task Deduplication using Redis locks before worker dispatch",
      "ack_late=True + prefetch_multiplier=1 to prevent unacknowledged task loss",
      "Randomized Exponential Jitter (base 2s, max 60s) to avoid thundering herds",
      "Isolated Dead Letter Queue (DLQ) with Prometheus alert triggers",
    ],
  },
  {
    id: "redis-rate-limiter",
    title: "Redis Sliding Window Rate Limiter & Stampede Guard",
    category: "Redis & Caching",
    metrics: "100k Req/min · Lua Atomic · XFetch Stampede Guard",
    description: "Sliding-window rate limiter driven by Redis sorted sets and Lua scripts, paired with XFetch probabilistic early expiration to solve cache stampedes.",
    mermaidChart: `graph TD
    Req[Incoming HTTP Request] --> Lua[Redis Atomic Lua Script]
    Lua -->|ZADD timestamp| ZSet[Redis Sorted Set - Key: IP/Token]
    Lua -->|ZREMRANGEBYSCORE| Expired[Prune Timestamps < NOW - Window]
    Lua -->|ZCARD <= Limit| Pass[ALLOW Request]
    Lua -->|ZCARD > Limit| Block[BLOCK 429 Too Many Requests]
    Pass --> CacheCheck{Redis Cache Hit?}
    CacheCheck -->|Yes| FastReturn[Return Cached Payload 2ms]
    CacheCheck -->|No - Near Expire| XFetch[Probabilistic Early Recompute XFetch]
    XFetch --> DB[(Postgres Backend)]`,
    pitchSummary: "Implemented an atomic Redis sliding-window rate limiter using Lua scripts and sorted sets, alongside XFetch probabilistic early expiration to eliminate cache stampedes on high-traffic endpoints.",
    technicalHighlights: [
      "Atomic execution via Redis Lua scripts (zero concurrency race conditions)",
      "ZREMRANGEBYSCORE sliding window pruning for exact millisecond limits",
      "XFetch algorithm (beta = 1.0) for background early cache recomputation",
      "Graceful 429 response handling with Retry-After HTTP headers",
    ],
  },
  {
    id: "payment-idempotency",
    title: "Payment System Idempotency & Webhook Engine",
    category: "System Design & Payments",
    metrics: "0 Double Charges · SELECT FOR UPDATE · HMAC SHA256",
    description: "Fault-tolerant payment processing architecture utilizing HTTP Idempotency-Key headers, SELECT FOR UPDATE row locks, and HMAC webhook verification.",
    mermaidChart: `graph TD
    Client[Client App] -->|POST /pay Idempotency-Key: XYZ| API[Payment API Gateway]
    API -->|Lock Idempotency Key| RedisLock[Redis Key Lock: XYZ]
    RedisLock -->|Key Exists - In Flight| Wait[Return 409 Conflict / Poll]
    RedisLock -->|New Request| DBTx[(Postgres Transaction)]
    DBTx -->|SELECT FOR UPDATE| RowLock[Row Lock Wallet Balance]
    RowLock --> Stripe[Stripe Payment Intent API]
    Stripe -->|Webhook Event| Webhook[Webhook Handler]
    Webhook -->|HMAC SHA256 Verify| Signature[Valid Signature Check]
    Signature -->|Save Idempotency Record| Ledger[(Ledger Audit DB)]`,
    pitchSummary: "Designed an idempotent payment integration with Stripe using Redis locks, SELECT FOR UPDATE database transaction locks, and HMAC SHA256 webhook signature validation to guarantee zero double charges.",
    technicalHighlights: [
      "Unique HTTP Idempotency-Key enforcement with 24-hour key expiration",
      "PostgreSQL SELECT FOR UPDATE row locking for atomic balance updates",
      "HMAC SHA-256 signature verification against replay attacks",
      "Double-entry bookkeeping ledger for automatic reconciliation",
    ],
  },
];

export function ArchitectureArtifactGenerator() {
  const [selectedBlueprint, setSelectedBlueprint] = useState<SystemBlueprint>(SYSTEM_BLUEPRINTS[0]);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(selectedBlueprint.pitchSummary);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(selectedBlueprint.mermaidChart);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div className="w-full rounded-2xl border border-hair bg-cream-raised dark:bg-[#0E1117] p-4 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hair pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Stack size={16} weight="bold" />
            </span>
            <h2 className="text-base font-bold text-espresso leading-tight">
              System Architecture Proof Artifact Generator
            </h2>
          </div>
          <p className="mt-1 font-mono text-xs text-coffee">
            Export production blueprints & 1-sentence technical pitches to attach to cold emails for Sarvam AI, Krutrim, Observe.AI.
          </p>
        </div>

        <span className="self-start sm:self-center font-mono text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
          Portfolio Artifact Ready
        </span>
      </div>

      {/* Blueprint Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {SYSTEM_BLUEPRINTS.map((bp) => (
          <button
            key={bp.id}
            onClick={() => setSelectedBlueprint(bp)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedBlueprint.id === bp.id
                ? "border-amber-500 bg-amber-500/10 text-espresso font-bold shadow-md"
                : "border-hair bg-cream-base dark:bg-[#12151E] text-coffee hover:text-espresso hover:border-amber-500/40"
            }`}
          >
            <div className="font-mono text-[9px] uppercase font-bold text-amber-500">
              {bp.category}
            </div>
            <div className="font-sans text-xs font-semibold mt-1 truncate">
              {bp.title}
            </div>
            <div className="font-mono text-[10px] text-coffee opacity-80 mt-0.5 truncate">
              {bp.metrics}
            </div>
          </button>
        ))}
      </div>

      {/* Selected Blueprint Content & Mermaid Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Diagram & Highlights (col 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-hair bg-cream-base dark:bg-[#0A0C10] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-espresso flex items-center gap-1.5">
                <Brain size={16} className="text-amber-500" />
                <span>{selectedBlueprint.title}</span>
              </h3>
              <span className="font-mono text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                {selectedBlueprint.metrics}
              </span>
            </div>
            <p className="font-sans text-xs text-coffee leading-relaxed">
              {selectedBlueprint.description}
            </p>

            <div className="pt-2 border-t border-hair">
              <div className="font-mono text-[10px] uppercase font-bold text-coffee mb-2">
                Key Technical Highlights & Implementation Invariants
              </div>
              <ul className="space-y-1.5 text-xs font-mono text-espresso">
                {selectedBlueprint.technicalHighlights.map((hl, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{hl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mermaid Diagram Render */}
          <div className="rounded-xl border border-hair bg-cream-base dark:bg-[#0A0C10] p-2">
            <MermaidRenderer chart={selectedBlueprint.mermaidChart} />
          </div>
        </div>

        {/* Right Outreach Pitch Card & Export Box (col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pitch Card */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-transparent p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-amber-500">
              <span className="flex items-center gap-1">
                <Sparkle size={13} />
                <span>Cold Outreach Pitch Snippet</span>
              </span>
              <span>1-Click Copy</span>
            </div>

            <div className="rounded-lg border border-hair bg-cream-raised dark:bg-[#12151E] p-3 font-sans text-xs leading-relaxed text-espresso font-medium italic">
              "{selectedBlueprint.pitchSummary}"
            </div>

            <button
              onClick={handleCopyPitch}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-mono text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-md active:scale-95"
            >
              {copiedPitch ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedPitch ? "Pitch Snippet Copied!" : "Copy Pitch Snippet for Email"}</span>
            </button>
          </div>

          {/* Code Export */}
          <div className="rounded-xl border border-hair bg-cream-base dark:bg-[#0A0C10] p-4 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs text-espresso font-semibold">
              <span className="flex items-center gap-1.5">
                <Code size={15} className="text-emerald-500" />
                <span>Mermaid Source Vector Code</span>
              </span>
              <button
                onClick={handleCopyMermaid}
                className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                {copiedMermaid ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedMermaid ? "Copied" : "Copy Code"}</span>
              </button>
            </div>
            <pre className="p-3 bg-cream-deep/60 dark:bg-black/50 rounded-lg text-[10.5px] font-mono text-coffee overflow-x-auto max-h-48">
              {selectedBlueprint.mermaidChart}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
