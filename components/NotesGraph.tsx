"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlass,
  ArrowsOut,
  ArrowsIn,
  ArrowClockwise,
  Stack,
  FileText,
  Sparkle,
  X,
  Code,
  ArrowUpRight,
  CheckCircle,
  Brain,
} from "@phosphor-icons/react";
import { Note, Task, Day } from "@/lib/types";

interface SpatialNode {
  id: string;
  type: "subject" | "chapter" | "concept";
  title: string;
  subtitle?: string;
  status?: string;
  sourcesCount?: number;
  chapterNumber?: number;
  x: number;
  y: number;
  parentId?: string;
  content?: string;
}

const INITIAL_SPATIAL_NODES: SpatialNode[] = [
  // Subject Root Node
  {
    id: "root-subject",
    type: "subject",
    title: "Senior Backend & Systems Engineering",
    subtitle: "10 Sprint Chapters · 48 Core Systems Architecture Concepts",
    status: "10/10 READY",
    x: 80,
    y: 220,
  },
  // Chapter Nodes
  {
    id: "ch-1",
    type: "chapter",
    title: "Ch.1 · General Backend & Systems",
    subtitle: "Distributed Systems Architecture",
    sourcesCount: 12,
    status: "ready",
    chapterNumber: 1,
    x: 480,
    y: 80,
    parentId: "root-subject",
    content: "Covers high-throughput backend design, load balancer topologies, stateless vs stateful microservices, and thread pool sizing.",
  },
  {
    id: "ch-2",
    type: "chapter",
    title: "Ch.2 · DB Internals & Indexing",
    subtitle: "B-Trees vs LSM-Trees & WAL",
    sourcesCount: 9,
    status: "ready",
    chapterNumber: 2,
    x: 480,
    y: 260,
    parentId: "root-subject",
    content: "Deep dive into page cache, buffer pools, B+Tree page splits vs LSM-Tree memtables and SSTables compaction.",
  },
  {
    id: "ch-3",
    type: "chapter",
    title: "Ch.3 · Distributed Consensus",
    subtitle: "Raft, Paxos & Leader Election",
    sourcesCount: 7,
    status: "ready",
    chapterNumber: 3,
    x: 480,
    y: 440,
    parentId: "root-subject",
    content: "Raft consensus algorithm invariants: Leader election, log replication, safety, and split-brain resolution.",
  },
  {
    id: "ch-4",
    type: "chapter",
    title: "Ch.4 · Caching & Consistency",
    subtitle: "Write-Through vs Write-Back",
    sourcesCount: 8,
    status: "ready",
    chapterNumber: 4,
    x: 480,
    y: 620,
    parentId: "root-subject",
    content: "Cache invalidation strategies, Cache Stampede prevention with probabilistic early expiration, and Redis Cluster hashing.",
  },
  // Concept Sub-Nodes (Child of Ch.2 & Ch.3)
  {
    id: "concept-wal",
    type: "concept",
    title: "WAL & Crash Recovery Guarantee",
    subtitle: "How Write-Ahead Logging prevents data loss on power failure",
    x: 850,
    y: 200,
    parentId: "ch-2",
    content: "Every modification is appended sequentially to the WAL disk file before page dirtying in RAM buffer pool.",
  },
  {
    id: "concept-lsm",
    type: "concept",
    title: "LSM Compaction & Bloom Filters",
    subtitle: "Optimizing write amplification in RocksDB/Cassandra",
    x: 850,
    y: 320,
    parentId: "ch-2",
    content: "Size-tiered vs Leveled compaction algorithms. Bloom filters avoid unnecessary disk reads for non-existent keys.",
  },
  {
    id: "concept-raft",
    type: "concept",
    title: "Raft Heartbeats & Term Numbers",
    subtitle: "Handling network partitions and stale leaders",
    x: 850,
    y: 460,
    parentId: "ch-3",
    content: "Leader sends periodic AppendEntries heartbeats. Higher term numbers instantly step down stale leaders.",
  },
];

interface NotesGraphProps {
  notes?: Note[];
  tasks?: Task[];
  days?: Day[];
  onOpenNote?: (id: string) => void;
}

export function NotesGraph({ notes = [], tasks = [], days = [], onOpenNote }: NotesGraphProps) {
  const [nodes, setNodes] = useState<SpatialNode[]>(INITIAL_SPATIAL_NODES);
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
    // If clicking directly on container background (not a card)
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
      // Dragging a specific card node
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

  // Reset View Zoom/Pan
  const handleResetView = () => {
    setPan({ x: 40, y: 30 });
    setZoom(1);
  };

  // Filter nodes by search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.subtitle && n.subtitle.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

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
        <svg className="absolute inset-0 h-[3000px] w-[3000px] overflow-visible pointer-events-none">
          {nodes.map((node) => {
            if (!node.parentId) return null;
            const parent = nodes.find((p) => p.id === node.parentId);
            if (!parent) return null;

            // Compute center connection coordinates
            const isHovered =
              hoveredNodeId === node.id || hoveredNodeId === parent.id;
            const isSelected =
              selectedNode?.id === node.id || selectedNode?.id === parent.id;

            const pX = parent.type === "subject" ? parent.x + 320 : parent.x + 260;
            const pY = parent.type === "subject" ? parent.y + 70 : parent.y + 45;
            const cX = node.x;
            const cY = node.type === "concept" ? node.y + 40 : node.y + 45;

            // Bezier Curve
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
                {/* Connector Endpoint Glowing Dot */}
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
          const isHovered = hoveredNodeId === node.id;

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
                  : "w-60"
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
                    <span>SUBJECT</span>
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
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="font-semibold text-xs tracking-tight text-espresso">
                      {node.title}
                    </h3>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10.5px] text-coffee">
                    <span>{node.sourcesCount} sources · ready</span>
                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
                  </div>
                </div>
              )}

              {/* CONCEPT NODE CARD */}
              {node.type === "concept" && (
                <div
                  className={`group relative overflow-hidden rounded-lg border p-3.5 transition-all ${
                    isSelected
                      ? "border-amber-500/80 bg-cream-raised dark:bg-[#1A2030] shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-hair bg-cream-raised dark:bg-[#141826]/85 shadow-sm hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase font-bold text-coffee">
                    <span>PINNED · CONCEPT</span>
                    <span className="text-amber-500 font-semibold">V2</span>
                  </div>
                  <h4 className="mt-1 font-semibold text-xs text-espresso leading-snug">
                    {node.title}
                  </h4>
                  <p className="mt-1 font-mono text-[10.5px] text-coffee line-clamp-2">
                    {node.subtitle}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* TOP-LEFT SEARCH BAR */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
        <MagnifyingGlass size={16} className="text-coffee" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search spatial nodes..."
          className="w-44 bg-transparent font-mono text-xs text-espresso placeholder-coffee focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-coffee hover:text-espresso">
            <X size={14} />
          </button>
        )}
      </div>

      {/* TOP-RIGHT MINIMAP WIDGET */}
      <div className="absolute top-4 right-4 z-20 h-28 w-44 rounded-xl border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 p-2 shadow-xl backdrop-blur-md overflow-hidden">
        <div className="font-mono text-[9.5px] uppercase font-bold text-coffee border-b border-hair pb-1 mb-1.5 flex items-center justify-between">
          <span>Minimap</span>
          <span>{nodes.length} nodes</span>
        </div>
        <div className="relative h-20 w-full bg-cream-deep/40 dark:bg-black/30 rounded">
          {nodes.map((n) => (
            <div
              key={`mini-${n.id}`}
              style={{
                left: `${(n.x / 1200) * 100}%`,
                top: `${(n.y / 800) * 100}%`,
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
          <span className="font-bold text-espresso">drag card</span> to arrange ·{" "}
          <span className="font-bold text-espresso">click card</span> to inspect
        </div>

        {/* Center Pill */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hair bg-cream-raised/90 dark:bg-[#12151E]/90 px-4 py-2 font-mono text-xs font-semibold text-espresso shadow-xl backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>C — Spatial Knowledge Canvas</span>
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
                  {selectedNode.type} Node
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
            </div>

            <div className="border-t border-hair pt-4 flex justify-end">
              <button
                onClick={() => setSelectedNode(null)}
                className="rounded-xl bg-amber-500 px-4 py-2 font-mono text-xs font-bold text-black hover:bg-amber-400 shadow-md"
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
