"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlass,
  ArrowClockwise,
  X,
  ArrowUpRight,
  CheckCircle,
  Brain,
  Plus,
  BookOpen,
  CalendarCheck,
  Lightning,
} from "@phosphor-icons/react";
import { Note, Task, Day } from "@/lib/types";
import { lockTopicAndOpenMentor } from "@/lib/topicLocker";

export interface SpatialNode {
  id: string;
  type: "subject" | "chapter" | "concept";
  title: string;
  subtitle?: string;
  status?: string;
  sourcesCount?: number;
  chapterNumber?: number; // Sprint Day 1..10
  sprintDay?: number;     // Sprint Day 1..10
  topicId?: string;       // Topic ID for navigation/mentor
  x: number;
  y: number;
  parentId?: string;
  content?: string;
  noteId?: string; // Attached user Note ID
}

const BASE_SPATIAL_NODES: SpatialNode[] = [
  // Subject Root Node
  {
    id: "root-subject",
    type: "subject",
    title: "Senior Backend & Systems Engineering",
    subtitle: "10 Sprint Days · Core Architecture & Vault Notes",
    status: "10 DAYS ACTIVE",
    x: 80,
    y: 540,
  },

  // 10 SPRINT DAY CHAPTER NODES
  {
    id: "ch-1",
    type: "chapter",
    title: "Day 1 · Django ORM & Query Optimization",
    subtitle: "select_related, prefetch_related, & N+1",
    sourcesCount: 12,
    status: "Day 1",
    chapterNumber: 1,
    sprintDay: 1,
    topicId: "day-1-django-orm",
    x: 480,
    y: 60,
    parentId: "root-subject",
    content: "Covers high-throughput ORM optimization, select_related JOINs vs prefetch_related separate queries, annotate() aggregations, and F() atomic updates.",
  },
  {
    id: "ch-2",
    type: "chapter",
    title: "Day 2 · PostgreSQL Indexing & EXPLAIN",
    subtitle: "B-Trees, EXPLAIN ANALYZE, & WAL",
    sourcesCount: 9,
    status: "Day 2",
    chapterNumber: 2,
    sprintDay: 2,
    topicId: "day-2-postgres-indexing",
    x: 480,
    y: 200,
    parentId: "root-subject",
    content: "B-Tree composite index column ordering, EXPLAIN (ANALYZE, BUFFERS) execution cost analysis, and WAL append-only durability.",
  },
  {
    id: "ch-3",
    type: "chapter",
    title: "Day 3 · Redis Cache Aside & Rate Limiters",
    subtitle: "Sliding Window, Cache Stampede, & Eviction",
    sourcesCount: 8,
    status: "Day 3",
    chapterNumber: 3,
    sprintDay: 3,
    topicId: "day-3-redis-rate-limiter",
    x: 480,
    y: 340,
    parentId: "root-subject",
    content: "Cache Aside pattern, probabilistic early expiration for stampede mitigation, and Redis Lua script sliding-window rate limiters.",
  },
  {
    id: "ch-4",
    type: "chapter",
    title: "Day 4 · Celery Task Queues & DLQ Reliability",
    subtitle: "Async Worker Pools, Retries, & Dead Lettering",
    sourcesCount: 10,
    status: "Day 4",
    chapterNumber: 4,
    sprintDay: 4,
    topicId: "day-4-celery-async-reliability",
    x: 480,
    y: 480,
    parentId: "root-subject",
    content: "Celery task id-deduplication, ack_late durability, exponential backoff jitter, and Dead Letter Queue routing.",
  },
  {
    id: "ch-5",
    type: "chapter",
    title: "Day 5 · Payment Idempotency & Webhooks",
    subtitle: "Stripe Webhooks, Unique Locking, & Reconcile",
    sourcesCount: 7,
    status: "Day 5",
    chapterNumber: 5,
    sprintDay: 5,
    topicId: "day-5-payment-system-design",
    x: 480,
    y: 620,
    parentId: "root-subject",
    content: "Idempotency keys, SELECT FOR UPDATE row locks, HMAC webhook signature verification, and ledger reconciliation.",
  },
  {
    id: "ch-6",
    type: "chapter",
    title: "Day 6 · RAG Architecture & Vector Search",
    subtitle: "Qdrant HNSW Index & Cross-Encoder Re-Ranking",
    sourcesCount: 11,
    status: "Day 6",
    chapterNumber: 6,
    sprintDay: 6,
    topicId: "day-6-rag-architecture",
    x: 480,
    y: 760,
    parentId: "root-subject",
    content: "Chunking strategies (parent-child retrieval), HNSW vector index tuning, hybrid BM25 + dense search, and Cross-Encoder re-ranking.",
  },
  {
    id: "ch-7",
    type: "chapter",
    title: "Day 7 · Notification Service Fan-Out",
    subtitle: "RabbitMQ Exchanges, WS & Backpressure",
    sourcesCount: 8,
    status: "Day 7",
    chapterNumber: 7,
    sprintDay: 7,
    topicId: "day-7-notification-fanout",
    x: 480,
    y: 900,
    parentId: "root-subject",
    content: "Fan-out exchange routing, WebSocket connection state management, consumer rate shedding, and fallback push queues.",
  },
  {
    id: "ch-8",
    type: "chapter",
    title: "Day 8 · Prometheus Metrics & LLM Gateway",
    subtitle: "P99 Histograms, Semantic Cache, & Middleware",
    sourcesCount: 9,
    status: "Day 8",
    chapterNumber: 8,
    sprintDay: 8,
    topicId: "day-8-prometheus-llm-gateway",
    x: 480,
    y: 1040,
    parentId: "root-subject",
    content: "Prometheus histogram p99 metrics, OpenTelemetry distributed tracing, LLM gateway token bucket rate limiting, and semantic response caching.",
  },
  {
    id: "ch-9",
    type: "chapter",
    title: "Day 9 · Full L6 Mock Interview Sprint",
    subtitle: "System Design Scorecard & Anti-Patterns",
    sourcesCount: 15,
    status: "Day 9",
    chapterNumber: 9,
    sprintDay: 9,
    topicId: "day-9-mock-interview-marathon",
    x: 480,
    y: 1180,
    parentId: "root-subject",
    content: "Socratic grilling on production failure scenarios, trade-off evaluations, and L6 Staff Architect benchmarks.",
  },
  {
    id: "ch-10",
    type: "chapter",
    title: "Day 10 · Action & Cold Outreach Execution",
    subtitle: "Target Companies, Artifact Links, & Strategy",
    sourcesCount: 6,
    status: "Day 10",
    chapterNumber: 10,
    sprintDay: 10,
    topicId: "day-10-outreach-execution",
    x: 480,
    y: 1320,
    parentId: "root-subject",
    content: "Direct referral outreach, technical artifact proof-of-work, and company-specific architecture proposals.",
  },

  // CHILD CONCEPT NODES LINKED TO SPECIFIC SPRINT DAYS
  {
    id: "concept-day1-orm",
    type: "concept",
    title: "select_related vs prefetch_related",
    subtitle: "Single SQL JOIN vs Separate IN Query in Memory",
    sprintDay: 1,
    chapterNumber: 1,
    topicId: "day-1-django-orm",
    x: 880,
    y: 40,
    parentId: "ch-1",
    content: "select_related executes 1 INNER JOIN query for Single-Value ForeignKeys. prefetch_related executes a separate SQL query for Multi-Value ManyToMany.",
  },
  {
    id: "concept-day1-fq",
    type: "concept",
    title: "F() & Q() Expressions",
    subtitle: "Atomic DB Updates & Complex Query Logic",
    sprintDay: 1,
    chapterNumber: 1,
    topicId: "day-1-django-orm",
    x: 880,
    y: 110,
    parentId: "ch-1",
    content: "F() updates DB fields in SQL directly to avoid race conditions. Q() enables OR/AND/NOT query logic.",
  },
  {
    id: "concept-day2-wal",
    type: "concept",
    title: "WAL & Crash Recovery Guarantee",
    subtitle: "Write-Ahead Logging prevents power failure loss",
    sprintDay: 2,
    chapterNumber: 2,
    topicId: "day-2-postgres-indexing",
    x: 880,
    y: 180,
    parentId: "ch-2",
    content: "Every modification is appended sequentially to the WAL disk file before dirtying RAM buffer pool pages.",
  },
  {
    id: "concept-day2-lsm",
    type: "concept",
    title: "B-Tree Indexing vs EXPLAIN ANALYZE",
    subtitle: "Leftmost Prefix Rule & Buffer Hit Ratios",
    sprintDay: 2,
    chapterNumber: 2,
    topicId: "day-2-postgres-indexing",
    x: 880,
    y: 250,
    parentId: "ch-2",
    content: "EXPLAIN ANALYZE executes the query and returns exact execution time, row estimates vs actuals, and page buffer hits.",
  },
  {
    id: "concept-day3-stampede",
    type: "concept",
    title: "Cache Stampede & Probabilistic Expiration",
    subtitle: "XFetch algorithm for hot key recomputation",
    sprintDay: 3,
    chapterNumber: 3,
    topicId: "day-3-redis-rate-limiter",
    x: 880,
    y: 320,
    parentId: "ch-3",
    content: "Prevents thousands of concurrent requests from slamming the database when a hot key expires simultaneously.",
  },
  {
    id: "concept-day3-sliding",
    type: "concept",
    title: "Redis Sliding Window Rate Limiter",
    subtitle: "ZADD + ZREMRANGEBYSCORE Lua Scripting",
    sprintDay: 3,
    chapterNumber: 3,
    topicId: "day-3-redis-rate-limiter",
    x: 880,
    y: 390,
    parentId: "ch-3",
    content: "Uses Redis sorted set to record timestamps per request, removing expired logs outside the window in a single atomic Lua script.",
  },
  {
    id: "concept-day4-dlq",
    type: "concept",
    title: "Celery Dead Letter Queue & Exponential Jitter",
    subtitle: "Isolating poison-pill tasks with max retries",
    sprintDay: 4,
    chapterNumber: 4,
    topicId: "day-4-celery-async-reliability",
    x: 880,
    y: 460,
    parentId: "ch-4",
    content: "Failed tasks retry with randomized exponential backoff. After max retries, poison pills route to DLQ without blocking main workers.",
  },
  {
    id: "concept-day5-idempotency",
    type: "concept",
    title: "Payment Idempotency & Signature Lock",
    subtitle: "SELECT FOR UPDATE + HMAC Webhook Verification",
    sprintDay: 5,
    chapterNumber: 5,
    topicId: "day-5-payment-system-design",
    x: 880,
    y: 600,
    parentId: "ch-5",
    content: "Ensures duplicate HTTP requests or retried webhooks never double-charge a user account.",
  },
  {
    id: "concept-day6-qdrant",
    type: "concept",
    title: "RAG Vector Search & Cross-Encoder Re-Ranking",
    subtitle: "HNSW Indexing + Precision Re-Ranking",
    sprintDay: 6,
    chapterNumber: 6,
    topicId: "day-6-rag-architecture",
    x: 880,
    y: 740,
    parentId: "ch-6",
    content: "Fast initial retrieval with Qdrant HNSW vector index, followed by deep cross-encoder re-ranking for top 5 chunks.",
  },
  {
    id: "concept-day7-fanout",
    type: "concept",
    title: "Notification Fan-Out & Rate Shedding",
    subtitle: "RabbitMQ Exchange + WebSocket State Management",
    sprintDay: 7,
    chapterNumber: 7,
    topicId: "day-7-notification-fanout",
    x: 880,
    y: 880,
    parentId: "ch-7",
    content: "Broadcasts events to thousands of connected clients with backpressure handling and worker pool isolation.",
  },
  {
    id: "concept-day8-gateway",
    type: "concept",
    title: "LLM Gateway & Semantic Caching",
    subtitle: "P99 Metrics, Token Bucket & Fallbacks",
    sprintDay: 8,
    chapterNumber: 8,
    topicId: "day-8-prometheus-llm-gateway",
    x: 880,
    y: 1020,
    parentId: "ch-8",
    content: "Interprets semantic embedding distance to reuse LLM responses for similar user queries, saving cost and latency.",
  },
  {
    id: "concept-day9-scorecard",
    type: "concept",
    title: "Senior L6 System Design Scorecard",
    subtitle: "Socratic Trade-Offs & Architectural Benchmarks",
    sprintDay: 9,
    chapterNumber: 9,
    topicId: "day-9-mock-interview-marathon",
    x: 880,
    y: 1160,
    parentId: "ch-9",
    content: "Evaluation criteria for senior candidates across fault tolerance, scalability, data modeling, and clear communication.",
  },
  {
    id: "concept-day10-outreach",
    type: "concept",
    title: "Referral Strategy & Proof Links",
    subtitle: "Direct Outreach to Engineering Managers",
    sprintDay: 10,
    chapterNumber: 10,
    topicId: "day-10-outreach-execution",
    x: 880,
    y: 1300,
    parentId: "ch-10",
    content: "Structured cold outreach messages with embedded proof-of-work links to personal architecture proposals.",
  },
];

interface NotesGraphProps {
  notes?: Note[];
  tasks?: Task[];
  days?: Day[];
  onOpenNote?: (id: string) => void;
  onCreateNote?: (title: string) => void;
}

export function NotesGraph({
  notes = [],
  tasks = [],
  days = [],
  onOpenNote,
  onCreateNote,
}: NotesGraphProps) {
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);

  // Dynamically compute spatial nodes by linking user notes to their respective Sprint Days
  const dynamicNodes = useMemo(() => {
    const nodeMap = new Map<string, SpatialNode>();

    // Copy base nodes
    BASE_SPATIAL_NODES.forEach((n) => {
      nodeMap.set(n.id, { ...n });
    });

    const usedNoteIds = new Set<string>();

    // 1. Match existing user notes to base nodes by title/keyword or sprint day
    nodeMap.forEach((node) => {
      const match = notes.find((n) => {
        if (usedNoteIds.has(n.id)) return false;
        const noteTitle = n.title.toLowerCase();
        const nodeTitle = node.title.toLowerCase();
        const folderName = (n.folder || "").toLowerCase();

        // Check explicit day matching
        if (node.sprintDay && (noteTitle.includes(`day ${node.sprintDay}`) || folderName.includes(`day ${node.sprintDay}`))) {
          return true;
        }

        return (
          noteTitle.includes(nodeTitle) ||
          nodeTitle.includes(noteTitle) ||
          (node.subtitle && noteTitle.includes(node.subtitle.toLowerCase()))
        );
      });

      if (match) {
        node.noteId = match.id;
        usedNoteIds.add(match.id);
      }
    });

    // 2. For any unlinked user notes, dynamically attach them to their matching Sprint Day Chapter node or Vault
    const unlinkedNotes = notes.filter((n) => !usedNoteIds.has(n.id));

    if (unlinkedNotes.length > 0) {
      unlinkedNotes.forEach((n, idx) => {
        // Try to infer Sprint Day from note title or folder
        let targetDay = 1;
        const lowerTitle = n.title.toLowerCase();
        const lowerFolder = (n.folder || "").toLowerCase();

        for (let d = 1; d <= 10; d++) {
          if (lowerTitle.includes(`day ${d}`) || lowerFolder.includes(`day ${d}`)) {
            targetDay = d;
            break;
          }
        }

        const parentChapterId = `ch-${targetDay}`;
        const parentChapter = nodeMap.get(parentChapterId);

        const conceptId = `user-note-${n.id}`;
        nodeMap.set(conceptId, {
          id: conceptId,
          type: "concept",
          title: n.title,
          subtitle: n.folder ? `Folder: ${n.folder} · Linked to Day ${targetDay}` : `Linked to Day ${targetDay}`,
          sprintDay: targetDay,
          chapterNumber: targetDay,
          topicId: parentChapter?.topicId,
          x: 880,
          y: (parentChapter?.y ?? 500) + 70 + idx * 80,
          parentId: parentChapterId,
          noteId: n.id,
          content: n.content,
        });
      });
    }

    return Array.from(nodeMap.values());
  }, [notes]);

  const [nodes, setNodes] = useState<SpatialNode[]>(dynamicNodes);

  // Synchronize when dynamicNodes updates
  useEffect(() => {
    setNodes(dynamicNodes);
  }, [dynamicNodes]);

  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<SpatialNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });

  // Handle Mouse Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains("canvas-bg")) {
      setIsPanning(true);
      isDraggingRef.current = true;
      startMouseRef.current = { x: e.clientX, y: e.clientY };
      startPanRef.current = { ...pan };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current && !draggedNodeId) {
      const dx = e.clientX - startMouseRef.current.x;
      const dy = e.clientY - startMouseRef.current.y;
      setPan({
        x: startPanRef.current.x + dx,
        y: startPanRef.current.y + dy,
      });
    } else if (draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNodeId
            ? { ...n, x: mouseCanvasX - dragOffset.x, y: mouseCanvasY - dragOffset.y }
            : n
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    isDraggingRef.current = false;
    setDraggedNodeId(null);
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.2);
    setZoom(newZoom);
  };

  // Start Node Dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: SpatialNode) => {
    e.stopPropagation();
    setDraggedNodeId(node.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
    setDragOffset({
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y,
    });
  };

  const handleResetView = () => {
    setPan({ x: 40, y: 30 });
    setZoom(1);
    setSelectedDayFilter(null);
  };

  // Jump to Day Workspace Action
  const handleJumpToDayWorkspace = (topicId?: string, sprintDay?: number) => {
    const targetTopicId = topicId || (sprintDay ? `day-${sprintDay}-django-orm` : "day-1-django-orm");
    window.dispatchEvent(
      new CustomEvent("open-fde-topic", {
        detail: targetTopicId,
      })
    );
  };

  const filteredNodes = useMemo(() => {
    let result = nodes;

    // Apply Sprint Day Filter
    if (selectedDayFilter !== null) {
      result = result.filter(
        (n) =>
          n.type === "subject" ||
          n.sprintDay === selectedDayFilter ||
          n.chapterNumber === selectedDayFilter
      );
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.subtitle && n.subtitle.toLowerCase().includes(q))
      );
    }

    return result;
  }, [nodes, searchQuery, selectedDayFilter]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="canvas-bg relative h-[calc(100vh-140px)] w-full overflow-hidden rounded-[1.75rem] border border-hair bg-cream-base dark:bg-[#0A0C10] shadow-2xl select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `radial-gradient(var(--hair) 1.2px, transparent 1.2px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* SPATIAL CANVAS TRANSFORM CONTAINER */}
      <div
        className="absolute inset-0 origin-top-left pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG BEZIER CONNECTOR THREADS */}
        <svg className="absolute inset-0 h-[4000px] w-[4000px] overflow-visible pointer-events-none">
          {nodes.map((node) => {
            if (!node.parentId) return null;
            const parent = nodes.find((p) => p.id === node.parentId);
            if (!parent) return null;

            // Don't render link if parent or child is filtered out
            const isChildVisible = filteredNodes.some((f) => f.id === node.id);
            const isParentVisible = filteredNodes.some((f) => f.id === parent.id);
            if (!isChildVisible || !isParentVisible) return null;

            const isHovered =
              hoveredNodeId === node.id || hoveredNodeId === parent.id;
            const isSelected =
              selectedNode?.id === node.id || selectedNode?.id === parent.id;

            const pX = parent.type === "subject" ? parent.x + 320 : parent.x + 260;
            const pY = parent.type === "subject" ? parent.y + 70 : parent.y + 45;
            const cX = node.x;
            const cY = node.type === "concept" ? node.y + 45 : node.y + 45;

            const controlOffsetX = Math.abs(cX - pX) * 0.5;
            const pathD = `M ${pX} ${pY} C ${pX + controlOffsetX} ${pY}, ${cX - controlOffsetX} ${cY}, ${cX} ${cY}`;

            return (
              <g key={`link-${node.id}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    isSelected
                      ? "#f59e0b"
                      : isHovered
                      ? "#38bdf8"
                      : "var(--hair)"
                  }
                  strokeWidth={isSelected || isHovered ? 2.5 : 1.5}
                  strokeDasharray={node.type === "concept" ? "5,5" : "none"}
                  className="transition-all duration-300"
                />
                <circle
                  cx={cX}
                  cy={cY}
                  r={3.5}
                  fill={isSelected ? "#f59e0b" : "#38bdf8"}
                  className="transition-all"
                />
              </g>
            );
          })}
        </svg>

        {/* NODES CARDS GRID */}
        {filteredNodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const hasNote = !!node.noteId;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
              }}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
              className={`pointer-events-auto absolute cursor-pointer transition-shadow duration-300 ${
                node.type === "subject"
                  ? "w-80"
                  : node.type === "chapter"
                  ? "w-64"
                  : "w-64"
              }`}
            >
              {/* SUBJECT ROOT NODE CARD */}
              {node.type === "subject" && (
                <div
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? "border-amber-500/80 bg-cream-raised dark:bg-[#141824] shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                      : "border-hair bg-cream-raised dark:bg-[#12151E]/95 shadow-xl hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] font-bold tracking-widest text-amber-500 uppercase">
                    <span>ROOT SUBJECT</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 border border-amber-500/30 text-amber-500">
                      {node.status}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-espresso leading-snug">
                    {node.title}
                  </h2>
                  <p className="mt-1.5 font-mono text-xs text-coffee">
                    {node.subtitle}
                  </p>
                </div>
              )}

              {/* CHAPTER NODE CARD */}
              {node.type === "chapter" && (
                <div
                  className={`group relative overflow-hidden rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-amber-500/80 bg-cream-raised dark:bg-[#161B28] shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : "border-hair bg-cream-raised dark:bg-[#12151E]/90 shadow-md hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                      <h3 className="font-semibold text-xs tracking-tight text-espresso">
                        {node.title}
                      </h3>
                    </div>
                    {node.sprintDay && (
                      <span className="font-mono text-[9px] uppercase font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                        Day {node.sprintDay}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 font-mono text-[11px] text-coffee">
                    {node.subtitle}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-hair pt-2 font-mono text-[10.5px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToDayWorkspace(node.topicId, node.sprintDay);
                      }}
                      className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      <Lightning size={12} className="text-amber-500" />
                      <span>Jump to Day {node.sprintDay}</span>
                    </button>

                    {hasNote ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.noteId && onOpenNote) onOpenNote(node.noteId);
                        }}
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      >
                        <BookOpen size={12} />
                        <span>Note</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCreateNote) onCreateNote(node.title);
                        }}
                        className="inline-flex items-center gap-1 text-coffee hover:text-espresso transition-colors"
                      >
                        <Plus size={12} />
                        <span>+ Note</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CONCEPT NODE CARD (CHILD NOTE NODE) */}
              {node.type === "concept" && (
                <div
                  className={`group relative overflow-hidden rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-amber-500/80 bg-cream-raised dark:bg-[#1A2030] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-hair bg-cream-raised dark:bg-[#141826]/85 shadow-sm hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase font-bold text-coffee">
                    <span className="flex items-center gap-1 text-amber-500">
                      <CalendarCheck size={11} /> Day {node.sprintDay || 1} Note
                    </span>
                    {hasNote ? (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <CheckCircle size={11} /> Linked
                      </span>
                    ) : (
                      <span className="text-amber-500 font-semibold">Ready</span>
                    )}
                  </div>

                  <h4 className="mt-1 font-semibold text-xs text-espresso leading-snug">
                    {node.title}
                  </h4>
                  <p className="mt-1 font-mono text-[10.5px] text-coffee line-clamp-2">
                    {node.subtitle}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-hair pt-2 font-mono text-[10.5px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToDayWorkspace(node.topicId, node.sprintDay);
                      }}
                      className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      <Lightning size={12} className="text-amber-500" />
                      <span>Day {node.sprintDay || 1} Space</span>
                    </button>

                    {hasNote ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (node.noteId && onOpenNote) onOpenNote(node.noteId);
                        }}
                        className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      >
                        <BookOpen size={12} />
                        <span>Open Note</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCreateNote) onCreateNote(node.title);
                        }}
                        className="inline-flex items-center gap-1 text-coffee hover:text-espresso transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add Note</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TOP-LEFT SEARCH BAR & SPRINT DAY FILTER BAR */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="flex items-center gap-2 rounded-xl border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <MagnifyingGlass size={16} className="text-coffee" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spatial nodes..."
            className="w-40 bg-transparent font-mono text-xs text-espresso placeholder-coffee focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-coffee hover:text-espresso">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sprint Day Filter Segmented Bar */}
        <div className="flex items-center gap-1 rounded-xl border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 p-1 shadow-lg backdrop-blur-md font-mono text-[10px]">
          <button
            onClick={() => setSelectedDayFilter(null)}
            className={`px-2 py-1 rounded transition-colors ${
              selectedDayFilter === null
                ? "bg-amber-500 text-black font-bold"
                : "text-coffee hover:text-espresso"
            }`}
          >
            All Days
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDayFilter(selectedDayFilter === d ? null : d)}
              className={`px-2 py-1 rounded transition-colors ${
                selectedDayFilter === d
                  ? "bg-amber-500 text-black font-bold"
                  : "text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              D{d}
            </button>
          ))}
        </div>
      </div>

      {/* TOP-RIGHT MINIMAP WIDGET */}
      <div className="absolute top-4 right-4 z-20 h-28 w-44 rounded-xl border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 p-2 shadow-xl backdrop-blur-md overflow-hidden">
        <div className="font-mono text-[9.5px] uppercase font-bold text-coffee border-b border-hair pb-1 mb-1.5 flex items-center justify-between">
          <span>Minimap</span>
          <span>{filteredNodes.length} nodes</span>
        </div>
        <div className="relative h-20 w-full bg-cream-deep/40 dark:bg-black/30 rounded">
          {filteredNodes.map((n) => (
            <div
              key={`mini-${n.id}`}
              style={{
                left: `${(n.x / 1200) * 100}%`,
                top: `${(n.y / 1500) * 100}%`,
              }}
              className={`absolute h-2 w-3 rounded-xs ${
                n.type === "subject"
                  ? "bg-amber-500 w-5"
                  : n.type === "chapter"
                  ? "bg-amber-400/80"
                  : "bg-sky-400/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* FLOATING BOTTOM SPATIAL CONTROL BAR */}
      <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Instruction Strip */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-4 py-2 font-mono text-xs text-coffee shadow-xl backdrop-blur-md">
          <span className="font-bold text-espresso">drag</span> to pan ·{" "}
          <span className="font-bold text-espresso">scroll</span> to zoom ·{" "}
          <span className="font-bold text-espresso">click node for Sprint Day Jump</span>
        </div>

        {/* Center Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-4 py-2 font-mono text-xs font-semibold text-espresso shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>C — Spatial Knowledge Canvas (Linked to Days 1–10)</span>
        </div>

        {/* Right Zoom Indicator & Reset */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-3 py-1.5 font-mono text-xs text-espresso shadow-xl backdrop-blur-md">
          <span>{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleResetView}
            className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10 text-coffee hover:text-espresso transition-colors"
            title="Reset View"
          >
            <ArrowClockwise size={14} />
          </button>
        </div>
      </div>

      {/* SELECTED NODE INSPECTOR DRAWER */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 z-30 h-full w-80 border-l border-hair bg-cream-raised/95 dark:bg-[#12151E]/95 p-6 shadow-2xl backdrop-blur-2xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-hair pb-3">
                <span className="font-mono text-xs uppercase font-bold text-amber-500">
                  {selectedNode.sprintDay ? `Sprint Day ${selectedNode.sprintDay}` : selectedNode.type} Node
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="rounded-lg p-1 text-coffee hover:text-espresso hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="mt-4 text-lg font-bold text-espresso leading-snug">
                {selectedNode.title}
              </h2>
              {selectedNode.subtitle && (
                <p className="mt-1 font-mono text-xs text-coffee">
                  {selectedNode.subtitle}
                </p>
              )}

              {selectedNode.content && (
                <div className="mt-4 rounded-xl border border-hair bg-cream-deep/60 dark:bg-black/40 p-4 font-sans text-xs leading-relaxed text-espresso">
                  <p>{selectedNode.content}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {/* Jump to Sprint Day Workspace Button */}
                <button
                  onClick={() => handleJumpToDayWorkspace(selectedNode.topicId, selectedNode.sprintDay)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 font-mono text-xs font-bold text-black hover:from-amber-400 hover:to-amber-500 shadow-lg transition-all active:scale-95"
                >
                  <Lightning size={16} weight="fill" />
                  <span>Jump to Day {selectedNode.sprintDay || 1} Workspace</span>
                </button>

                {/* Drill in AI Senior Mentor */}
                <button
                  onClick={() => {
                    lockTopicAndOpenMentor({
                      id: selectedNode.id,
                      title: selectedNode.title,
                      sprintDay: selectedNode.sprintDay ?? selectedNode.chapterNumber ?? 1,
                      description: selectedNode.content,
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-hair bg-cream-deep px-4 py-2.5 font-mono text-xs font-bold text-espresso hover:bg-coffee/10 shadow-sm transition-all"
                >
                  <Brain size={16} weight="fill" className="text-amber-500" />
                  <span>Drill Topic in AI Mentor</span>
                </button>

                {selectedNode.noteId ? (
                  <button
                    onClick={() => {
                      if (selectedNode.noteId && onOpenNote) onOpenNote(selectedNode.noteId);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-mono text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-all"
                  >
                    <BookOpen size={16} />
                    <span>Open Attached Note</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (onCreateNote) onCreateNote(selectedNode.title);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-hair bg-cream-deep px-4 py-2.5 font-mono text-xs font-bold text-espresso hover:bg-coffee/10 shadow-sm transition-all"
                  >
                    <Plus size={16} />
                    <span>Create Note for Day {selectedNode.sprintDay || 1}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-hair pt-4 flex justify-end">
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-xl px-4 py-2 font-mono text-xs text-coffee hover:text-espresso"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotesGraph;
