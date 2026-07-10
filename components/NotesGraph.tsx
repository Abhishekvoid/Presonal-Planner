"use client";

/**
 * NotesGraph — a crisp, professional graph of the notes vault.
 *
 * Premium-dark surface, razor-sharp nodes (filled circle + thin ring + a soft
 * tinted shadow for gentle elevation), gently curved edges, and "smart" labels
 * that only show for hubs and whatever you're hovering/focused on, in small
 * pills that never collide. Rendering is Canvas 2D in screen space so every
 * circle, line, and glyph stays sharp at any zoom. No bloom, no particles.
 *
 * Layout is a 2D d3-force simulation. Signature interaction is the focus lens:
 * hovering or focusing a node illuminates its neighbourhood and recedes the rest.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import { Note, Task, Day } from "@/lib/types";
import { buildGraph, neighbourhood, type GNode, type GLink, type LinkKind, type NodeType } from "@/lib/graphModel";

// ── design tokens (crisp premium dark) ────────────────────────────────────
const BG = "#0F1115";
const NODE: Record<NodeType, string> = {
  note: "#CDD3DC", // cool near-white — the substance
  task: "#7FB88A", // muted sage
  day: "#D2A05A", // muted amber
  tag: "#8AA0BE", // muted slate
};
const ACCENT = "#6EA8FE"; // single interaction accent (hover / focus / selection)
const ACCENT_WARM = "#E0B15E"; // recency marker only
const HUB_DEGREE = 3;
const DIM = 0.14;

const radiusFor = (degree: number) => Math.max(4.5, Math.min(4.5 + Math.sqrt(degree) * 2.6, 18));
const edgeGroup = (k: LinkKind) =>
  k === "wikilink" ? "wiki" : k === "folder" ? "folder" : k === "note-tag" ? "tag" : "plan";

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

interface Filters {
  note: boolean;
  task: boolean;
  day: boolean;
  tag: boolean;
  wiki: boolean;
  plan: boolean;
  folder: boolean;
  etag: boolean;
  orphans: boolean;
  folderPick: string | null;
}
const DEFAULT_FILTERS: Filters = {
  note: true, task: true, day: true, tag: true,
  wiki: true, plan: true, folder: true, etag: true,
  orphans: true, folderPick: null,
};

interface Transform { x: number; y: number; k: number }
interface Rect { x: number; y: number; w: number; h: number }

interface NotesGraphProps {
  notes: Note[];
  tasks: Task[];
  days: Day[];
  onOpenNote: (id: string) => void;
}

export function NotesGraph({ notes, tasks, days, onOpenNote }: NotesGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const graph = useMemo(() => buildGraph(notes, tasks, days), [notes, tasks, days]);
  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showRail, setShowRail] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // refs mirror state for the render/interaction code
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;
  const searchRef = useRef("");
  const selectedRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const focusRef = useRef<string | null>(null);
  const depthRef = useRef(1);
  const filtersRef = useRef<Filters>(DEFAULT_FILTERS);
  const visibleRef = useRef<Set<string>>(new Set());
  const transformRef = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const drawRef = useRef<() => void>(() => {});
  const recomputeRef = useRef<() => void>(() => {});
  const easeToRef = useRef<(t: Transform) => void>(() => {});
  const fitRef = useRef<(ids?: Set<string> | null, tight?: boolean) => void>(() => {});
  const exportRef = useRef<() => void>(() => {});

  useEffect(() => { searchRef.current = search.trim().toLowerCase(); drawRef.current(); }, [search]);
  useEffect(() => { selectedRef.current = selectedId; recomputeRef.current(); drawRef.current(); }, [selectedId]);
  useEffect(() => { hoverRef.current = hoverId; drawRef.current(); }, [hoverId]);
  useEffect(() => {
    focusRef.current = focusId; depthRef.current = depth;
    recomputeRef.current();
    fitRef.current(focusId ? visibleRef.current : null, !!focusId);
    drawRef.current();
  }, [focusId, depth]);
  useEffect(() => { filtersRef.current = filters; recomputeRef.current(); drawRef.current(); }, [filters]);

  useEffect(() => { setSelectedId(null); setFocusId(null); setHoverId(null); }, [graph]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const { nodes, links, neighbours } = graph;
    let w = wrap.clientWidth || 800;
    let h = wrap.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      w = wrap.clientWidth || w;
      h = wrap.clientHeight || h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    sizeCanvas();

    for (const n of nodes) {
      if (n.x == null) n.x = w / 2 + (Math.random() - 0.5) * Math.min(w, h) * 0.7;
      if (n.y == null) n.y = h / 2 + (Math.random() - 0.5) * Math.min(w, h) * 0.7;
    }

    // gentle folder clustering
    const folderNotes = nodes.filter((n) => n.type === "note" && n.folder);
    const clusterForce = (alpha: number) => {
      if (!folderNotes.length) return;
      const cx = new Map<string, [number, number, number]>();
      for (const n of folderNotes) {
        const a = cx.get(n.folder!) ?? [0, 0, 0];
        a[0] += n.x ?? 0; a[1] += n.y ?? 0; a[2] += 1;
        cx.set(n.folder!, a);
      }
      for (const n of folderNotes) {
        const a = cx.get(n.folder!)!;
        n.vx = (n.vx ?? 0) + (a[0] / a[2] - (n.x ?? 0)) * 0.05 * alpha;
        n.vy = (n.vy ?? 0) + (a[1] / a[2] - (n.y ?? 0)) * 0.05 * alpha;
      }
    };

    const sim: Simulation<GNode, GLink> = forceSimulation<GNode, GLink>(nodes)
      .force("link", forceLink<GNode, GLink>(links).id((d) => d.id)
        .distance((l) => (l.kind === "folder" ? 80 : l.kind === "note-tag" ? 48 : 58))
        .strength((l) => (l.kind === "folder" ? 0.05 : l.kind === "note-tag" ? 0.13 : 0.2)))
      .force("charge", forceManyBody<GNode>().strength(-300).distanceMax(640))
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide<GNode>().radius((d) => radiusFor(d.degree) + 14).strength(0.9))
      .force("x", forceX<GNode>(w / 2).strength(0.035))
      .force("y", forceY<GNode>(h / 2).strength(0.035))
      .force("cluster", clusterForce);

    // ── visibility from filters + focus ───────────────────────────────
    const computeVisible = () => {
      const f = filtersRef.current;
      const focus = focusRef.current;
      const allow = focus ? neighbourhood(neighbours, focus, depthRef.current) : null;
      let folderAllow: Set<string> | null = null;
      if (f.folderPick) {
        folderAllow = new Set();
        for (const n of nodes) if (n.type === "note" && n.folder === f.folderPick) {
          folderAllow.add(n.id);
          for (const nb of neighbours.get(n.id) ?? []) folderAllow.add(nb);
        }
      }
      const vis = new Set<string>();
      for (const n of nodes) {
        if (allow && !allow.has(n.id)) continue;
        if (folderAllow && !folderAllow.has(n.id)) continue;
        if (n.type === "note" && !f.note) continue;
        if (n.type === "task" && !f.task) continue;
        if (n.type === "day" && !f.day) continue;
        if (n.type === "tag" && !f.tag) continue;
        if (!f.orphans && n.degree === 0) continue;
        vis.add(n.id);
      }
      visibleRef.current = vis;
    };
    recomputeRef.current = computeVisible;
    computeVisible();

    const edgeVisible = (l: GLink) => {
      const f = filtersRef.current;
      const g = edgeGroup(l.kind);
      if (g === "wiki" && !f.wiki) return false;
      if (g === "plan" && !f.plan) return false;
      if (g === "folder" && !f.folder) return false;
      if (g === "tag" && !f.etag) return false;
      const vis = visibleRef.current;
      return vis.has((l.source as GNode).id) && vis.has((l.target as GNode).id);
    };

    // ── coordinate + view helpers ─────────────────────────────────────
    const toWorld = (sx: number, sy: number) => {
      const t = transformRef.current;
      return { x: (sx - t.x) / t.k, y: (sy - t.y) / t.k };
    };
    const pickNode = (sx: number, sy: number): GNode | null => {
      const p = toWorld(sx, sy);
      const vis = visibleRef.current;
      let best: GNode | null = null, bestD = Infinity;
      for (const n of nodes) {
        if (n.x == null || !vis.has(n.id)) continue;
        const r = radiusFor(n.degree) + 6;
        const d = (n.x - p.x) ** 2 + (n.y! - p.y) ** 2;
        if (d < r * r && d < bestD) { bestD = d; best = n; }
      }
      return best;
    };

    const fit = (ids?: Set<string> | null, tight?: boolean) => {
      const set = ids ?? visibleRef.current;
      const list = nodes.filter((n) => n.x != null && set.has(n.id));
      if (!list.length) return;
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      for (const n of list) {
        minx = Math.min(minx, n.x!); maxx = Math.max(maxx, n.x!);
        miny = Math.min(miny, n.y!); maxy = Math.max(maxy, n.y!);
      }
      const bw = Math.max(maxx - minx, 40), bh = Math.max(maxy - miny, 40);
      const pad = tight ? 2.2 : 1.4;
      const k = Math.max(0.35, Math.min(Math.min(w / (bw * pad), h / (bh * pad)), tight ? 1.6 : 1.25));
      const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
      easeTo({ x: w / 2 - cx * k, y: h / 2 - cy * k, k });
    };
    fitRef.current = fit;

    // ── camera easing ─────────────────────────────────────────────────
    let easeRaf = 0;
    let target: Transform | null = null;
    const easeTo = (t: Transform) => {
      target = t;
      if (reduce) { transformRef.current = { ...t }; target = null; draw(); return; }
      if (easeRaf) return;
      const step = () => {
        const tr = transformRef.current;
        if (!target) { easeRaf = 0; return; }
        tr.x += (target.x - tr.x) * 0.16;
        tr.y += (target.y - tr.y) * 0.16;
        tr.k += (target.k - tr.k) * 0.16;
        if (Math.abs(target.x - tr.x) < 0.4 && Math.abs(target.y - tr.y) < 0.4 && Math.abs(target.k - tr.k) < 0.001) {
          transformRef.current = { ...target }; target = null; draw(); easeRaf = 0; return;
        }
        draw();
        easeRaf = requestAnimationFrame(step);
      };
      easeRaf = requestAnimationFrame(step);
    };
    easeToRef.current = easeTo;

    // ── active sets (soft dim) ────────────────────────────────────────
    const activeSets = () => {
      const focus = hoverRef.current ?? selectedRef.current;
      let lit: Set<string> | null = null;
      if (focus) { lit = new Set([focus]); neighbours.get(focus)?.forEach((id) => lit!.add(id)); }
      const q = searchRef.current;
      let matched: Set<string> | null = null;
      if (q) {
        matched = new Set();
        for (const n of nodes) if (n.label.toLowerCase().includes(q)) {
          matched.add(n.id); neighbours.get(n.id)?.forEach((id) => matched!.add(id));
        }
      }
      return { lit, matched };
    };

    // ── draw ──────────────────────────────────────────────────────────
    const draw = () => {
      const tr = transformRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      // subtle center-weighted vignette
      const vg = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, "rgba(120,140,180,0.05)");
      vg.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      const { lit, matched } = activeSets();
      const vis = visibleRef.current;
      const hov = hoverRef.current;
      const sel = selectedRef.current;

      const iv = (id: string) => {
        if (!vis.has(id)) return 0;
        let v = 1;
        if (lit && !lit.has(id)) v = DIM;
        if (matched && !matched.has(id)) v = Math.min(v, DIM);
        return v;
      };
      const S = (n: GNode) => ({ x: n.x! * tr.k + tr.x, y: n.y! * tr.k + tr.y });
      const rScreen = (n: GNode) => Math.max(2.5, Math.min(radiusFor(n.degree) * (0.55 + 0.45 * tr.k), 44));

      // edges (curved, behind nodes)
      ctx.lineCap = "round";
      for (const l of links) {
        if (!edgeVisible(l)) continue;
        const s = l.source as GNode, t = l.target as GNode;
        const e = Math.min(iv(s.id), iv(t.id));
        if (e <= 0) continue;
        const a = S(s), b = S(t);
        const active = e >= 1 && (!!lit || !!matched);
        const baseA = l.kind === "folder" ? 0.05 : l.kind === "wikilink" ? 0.14 : 0.1;
        const alpha = active ? 0.42 : baseA * (lit || matched ? 0.4 : 1) * e;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const cx = mx + (-dy / len) * len * 0.07;
        const cy = my + (dx / len) * len * 0.07;
        ctx.strokeStyle = active ? hexA(ACCENT, alpha) : hexA("#8FA0BC", alpha);
        ctx.lineWidth = l.kind === "wikilink" ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.stroke();
      }

      // nodes
      for (const n of nodes) {
        const v = iv(n.id);
        if (v <= 0) continue;
        const p = S(n);
        const r = rScreen(n);
        const isHov = hov === n.id;
        const isSel = sel === n.id;
        const litNeighbor = v >= 1 && (!!lit || !!matched);

        // soft elevation shadow
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.5 * v})`;
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = hexA(NODE[n.type], v);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // recency inner brightening (subtle, static)
        if (n.recency > 0.4 && v >= 1) {
          ctx.fillStyle = hexA("#FFFFFF", 0.14 * n.recency);
          ctx.beginPath();
          ctx.arc(p.x - r * 0.22, p.y - r * 0.22, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // ring
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = isHov || isSel
          ? ACCENT
          : litNeighbor
          ? hexA(ACCENT, 0.5)
          : hexA("#FFFFFF", 0.12 * v);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // hover/selection halo
        if (isHov || isSel) {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = hexA(ACCENT, 0.4);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        // recency marker dot
        if (n.recency > 0.4 && v >= 1) {
          ctx.fillStyle = ACCENT_WARM;
          ctx.beginPath();
          ctx.arc(p.x + r * 0.72, p.y - r * 0.72, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // smart labels (pills, collision-avoided)
      ctx.font = '500 11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textBaseline = "middle";
      const zoomAlpha = Math.max(0, Math.min((tr.k - 0.7) / 0.5, 1));
      const placed: Rect[] = [];
      const focusSet = lit ?? null;
      const ranked = [...nodes].sort((a, b) => {
        const pa = (hov === a.id ? 3 : focusSet?.has(a.id) ? 2 : a.degree >= HUB_DEGREE ? 1 : 0);
        const pb = (hov === b.id ? 3 : focusSet?.has(b.id) ? 2 : b.degree >= HUB_DEGREE ? 1 : 0);
        return pb - pa || b.degree - a.degree;
      });
      for (const n of ranked) {
        const v = iv(n.id);
        if (v <= 0) continue;
        const isPriority = hov === n.id || (focusSet?.has(n.id) ?? false) || n.degree >= HUB_DEGREE;
        let alpha = v;
        if (!isPriority) alpha = v * zoomAlpha;
        // hide labels on dimmed nodes so the focus lens stays clean
        if (alpha < 0.35) continue;
        const p = S(n);
        const r = rScreen(n);
        const raw = n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label;
        const tw = ctx.measureText(raw).width;
        const pad = 6;
        const bw = tw + pad * 2, bh = 18;
        const bx = p.x - bw / 2;
        const by = p.y + r + 5;
        const rect: Rect = { x: bx - 2, y: by - 2, w: bw + 4, h: bh + 4 };
        // collision-avoid ALL labels (ranked), except always keep the hovered one
        if (hov !== n.id && placed.some((q) => overlaps(q, rect))) continue;
        placed.push(rect);
        // pill
        ctx.fillStyle = hexA("#151922", 0.9 * Math.min(1, alpha + 0.25));
        roundRect(ctx, bx, by, bw, bh, 5);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = hexA("#FFFFFF", 0.07 * alpha);
        ctx.stroke();
        ctx.fillStyle = hexA(hov === n.id ? "#EAF0FA" : "#C4CBD6", Math.min(1, alpha + 0.15));
        ctx.textAlign = "center";
        ctx.fillText(raw, p.x, by + bh / 2 + 0.5);
      }

      drawMinimap();
    };
    drawRef.current = draw;

    const drawMinimap = () => {
      const mw = 128, mh = 88, m = 14;
      const x0 = w - mw - m, y0 = h - mh - m;
      const vis = visibleRef.current;
      const list = nodes.filter((n) => n.x != null && vis.has(n.id));
      ctx.fillStyle = hexA("#12151B", 0.9);
      roundRect(ctx, x0, y0, mw, mh, 7);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = hexA("#FFFFFF", 0.08);
      ctx.stroke();
      if (!list.length) return;
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      for (const n of list) {
        minx = Math.min(minx, n.x!); maxx = Math.max(maxx, n.x!);
        miny = Math.min(miny, n.y!); maxy = Math.max(maxy, n.y!);
      }
      const bw = Math.max(maxx - minx, 1), bh = Math.max(maxy - miny, 1);
      const s = Math.min((mw - 16) / bw, (mh - 16) / bh);
      const mX = (x: number) => x0 + 8 + (x - minx) * s;
      const mY = (y: number) => y0 + 8 + (y - miny) * s;
      ctx.save();
      roundRect(ctx, x0, y0, mw, mh, 7);
      ctx.clip();
      for (const n of list) {
        ctx.fillStyle = hexA(NODE[n.type], 0.85);
        ctx.beginPath();
        ctx.arc(mX(n.x!), mY(n.y!), n.degree >= HUB_DEGREE ? 1.9 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const tr = transformRef.current;
      const tl = { x: -tr.x / tr.k, y: -tr.y / tr.k };
      const br = { x: (w - tr.x) / tr.k, y: (h - tr.y) / tr.k };
      ctx.strokeStyle = hexA(ACCENT, 0.7);
      ctx.lineWidth = 1;
      ctx.strokeRect(mX(tl.x), mY(tl.y), (br.x - tl.x) * s, (br.y - tl.y) * s);
      ctx.restore();
    };

    sim.on("tick", draw);
    if (reduce) { sim.stop(); sim.tick(400); }
    const fitTimer = setTimeout(() => fit(null), reduce ? 0 : 550);
    draw();

    // ── interaction ───────────────────────────────────────────────────
    let dragNode: GNode | null = null;
    let panning = false, pointerDown = false, moved = false;
    let downX = 0, downY = 0;
    let pending: { id: string; refId: string; timer: number } | null = null;

    const localXY = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    };
    const onDown = (e: PointerEvent) => {
      const { sx, sy } = localXY(e);
      pointerDown = true; moved = false; downX = sx; downY = sy;
      target = null;
      const hit = pickNode(sx, sy);
      canvas.setPointerCapture(e.pointerId);
      if (hit) {
        dragNode = hit;
        if (!reduce) sim.alphaTarget(0.3).restart();
        const p = toWorld(sx, sy); hit.fx = p.x; hit.fy = p.y;
      } else panning = true;
    };
    const onMove = (e: PointerEvent) => {
      const { sx, sy } = localXY(e);
      if (pointerDown && Math.abs(sx - downX) + Math.abs(sy - downY) > 4) moved = true;
      if (dragNode) { const p = toWorld(sx, sy); dragNode.fx = p.x; dragNode.fy = p.y; return; }
      if (panning) {
        const tr = transformRef.current; tr.x += sx - downX; tr.y += sy - downY;
        downX = sx; downY = sy; draw(); return;
      }
      const hit = pickNode(sx, sy);
      const id = hit?.id ?? null;
      if (id !== hoverRef.current) {
        hoverRef.current = id; setHoverId(id);
        canvas.style.cursor = hit ? "pointer" : "grab";
      }
      if (hit) setHoverPos({ x: sx, y: sy });
    };
    const onUp = (e: PointerEvent) => {
      const { sx, sy } = localXY(e);
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      if (dragNode) { dragNode.fx = null; dragNode.fy = null; if (!reduce) sim.alphaTarget(0); }
      if (!moved) {
        const hit = pickNode(sx, sy);
        if (hit) {
          if (hit.type === "note") {
            if (pending && pending.id === hit.id) {
              clearTimeout(pending.timer); pending = null; onOpenNoteRef.current(hit.refId);
            } else {
              const timer = window.setTimeout(() => { setFocusId(hit.id); pending = null; }, 240);
              pending = { id: hit.id, refId: hit.refId, timer };
            }
          } else setSelectedId((c) => (c === hit.id ? null : hit.id));
        } else setSelectedId(null);
      }
      dragNode = null; panning = false; pointerDown = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      target = null;
      const r = canvas.getBoundingClientRect();
      const sx = e.clientX - r.left, sy = e.clientY - r.top;
      const tr = transformRef.current;
      const k = Math.max(0.3, Math.min(tr.k * Math.exp(-e.deltaY * 0.0015), 4));
      tr.x = sx - ((sx - tr.x) / tr.k) * k;
      tr.y = sy - ((sy - tr.y) / tr.k) * k;
      tr.k = k; draw();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (focusRef.current) setFocusId(null); else setSelectedId(null); }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    canvas.style.cursor = "grab";

    exportRef.current = () => {
      const a = document.createElement("a");
      a.download = "notes-graph.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };

    const ro = new ResizeObserver(() => {
      sizeCanvas();
      sim.force("center", forceCenter(w / 2, h / 2));
      draw();
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(easeRaf);
      clearTimeout(fitTimer);
      sim.stop();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
    };
  }, [graph]);

  const counts = useMemo(() => {
    let note = 0, task = 0, day = 0, tag = 0;
    for (const n of graph.nodes) {
      if (n.type === "note") note++; else if (n.type === "task") task++;
      else if (n.type === "day") day++; else tag++;
    }
    return { note, task, day, tag };
  }, [graph]);

  const resetView = () => {
    setSearch(""); setSelectedId(null); setFocusId(null); setFilters(DEFAULT_FILTERS);
    fitRef.current(null);
  };

  const hoverNode = hoverId ? graph.nodes.find((n) => n.id === hoverId) ?? null : null;
  const hoverNote = hoverNode?.type === "note" ? noteById.get(hoverNode.refId) ?? null : null;

  return (
    <div className="reveal relative h-[620px] rounded-md overflow-hidden border border-white/[0.06] bg-[#0F1115] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.6)]">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block touch-none" />
      </div>

      {/* toolbar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-3.5 py-2.5 bg-gradient-to-b from-[#0F1115] via-[#0F1115]/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <button
            onClick={() => setShowRail((v) => !v)}
            className={`flex items-center gap-1.5 text-[11px] font-medium tracking-wide px-2.5 py-1.5 rounded-md border transition-colors ${
              showRail ? "bg-[#6EA8FE]/12 border-[#6EA8FE]/35 text-[#cfe0ff]" : "border-white/10 text-[#9aa4b5] hover:text-[#dfe4ec] hover:bg-white/[0.04]"
            }`}
          >
            <FiltersGlyph /> Filters
          </button>
          <div className="hidden md:flex items-center gap-3.5 text-[11px] text-[#7c8698] select-none">
            <Legend color={NODE.note} label={`${counts.note}`} name="notes" />
            <Legend color={NODE.task} label={`${counts.task}`} name="tasks" />
            <Legend color={NODE.day} label={`${counts.day}`} name="days" />
            {counts.tag > 0 && <Legend color={NODE.tag} label={`${counts.tag}`} name="tags" />}
          </div>
        </div>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
            className="bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-[11px] text-[#dfe4ec] focus:outline-none focus:border-[#6EA8FE]/50 rounded-md placeholder-[#5c6675] w-28 sm:w-40 transition-colors"
          />
          <button onClick={() => exportRef.current()} className="text-[11px] font-medium text-[#9aa4b5] hover:text-[#dfe4ec] px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors">Export</button>
          <button onClick={resetView} className="text-[11px] font-medium text-[#9aa4b5] hover:text-[#dfe4ec] px-2 py-1.5 rounded-md hover:bg-white/[0.04] transition-colors">Reset</button>
        </div>
      </div>

      {/* filter rail */}
      {showRail && (
        <div className="absolute top-14 left-3.5 w-48 rounded-lg border border-white/[0.08] bg-[#12151B]/95 backdrop-blur-md p-3 space-y-3.5 text-[#c3cad6] shadow-2xl">
          <RailGroup title="Nodes">
            <Toggle on={filters.note} onClick={() => setFilters((f) => ({ ...f, note: !f.note }))} dot={NODE.note} label="Notes" />
            <Toggle on={filters.task} onClick={() => setFilters((f) => ({ ...f, task: !f.task }))} dot={NODE.task} label="Tasks" />
            <Toggle on={filters.day} onClick={() => setFilters((f) => ({ ...f, day: !f.day }))} dot={NODE.day} label="Days" />
            <Toggle on={filters.tag} onClick={() => setFilters((f) => ({ ...f, tag: !f.tag }))} dot={NODE.tag} label="Tags" />
          </RailGroup>
          <RailGroup title="Links">
            <Toggle on={filters.wiki} onClick={() => setFilters((f) => ({ ...f, wiki: !f.wiki }))} label="Wikilinks" />
            <Toggle on={filters.plan} onClick={() => setFilters((f) => ({ ...f, plan: !f.plan }))} label="Task / Day" />
            <Toggle on={filters.folder} onClick={() => setFilters((f) => ({ ...f, folder: !f.folder }))} label="Folder" />
            <Toggle on={filters.etag} onClick={() => setFilters((f) => ({ ...f, etag: !f.etag }))} label="Tag links" />
          </RailGroup>
          <RailGroup title="Options">
            <Toggle on={filters.orphans} onClick={() => setFilters((f) => ({ ...f, orphans: !f.orphans }))} label="Show orphans" />
          </RailGroup>
          {graph.folders.length > 0 && (
            <RailGroup title="Focus folder">
              <select
                value={filters.folderPick ?? ""} onChange={(e) => setFilters((f) => ({ ...f, folderPick: e.target.value || null }))}
                className="w-full bg-white/[0.04] border border-white/10 px-2 py-1.5 text-[11px] text-[#dfe4ec] rounded-md focus:outline-none"
              >
                <option value="">All folders</option>
                {graph.folders.map((fd) => <option key={fd} value={fd}>{fd}</option>)}
              </select>
            </RailGroup>
          )}
        </div>
      )}

      {/* focus banner */}
      {focusId && (
        <div className="absolute bottom-3.5 left-3.5 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-[#12151B]/95 backdrop-blur-md px-3 py-2 text-[#c3cad6] shadow-2xl">
          <span className="text-[11px] font-medium text-[#6EA8FE]">Local graph</span>
          <label className="flex items-center gap-1.5 text-[11px] text-[#9aa4b5]">
            depth
            <input type="range" min={1} max={3} value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="accent-[#6EA8FE] w-16" />
            <span className="w-3 text-center text-[#dfe4ec]">{depth}</span>
          </label>
          <button onClick={() => setFocusId(null)} className="text-[11px] font-medium text-[#9aa4b5] hover:text-[#dfe4ec]">Exit</button>
        </div>
      )}

      {/* hover preview card */}
      {hoverNode && (
        <div
          className="absolute z-20 w-56 rounded-lg border border-white/[0.08] bg-[#12151B]/97 backdrop-blur-md p-3 shadow-2xl pointer-events-none"
          style={{
            left: Math.min(hoverPos.x + 16, (wrapRef.current?.clientWidth ?? 800) - 236),
            top: Math.min(hoverPos.y + 16, (wrapRef.current?.clientHeight ?? 600) - 128),
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: NODE[hoverNode.type] }} />
            <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#6c7686]">{hoverNode.type}</span>
          </div>
          <div className="font-medium text-[13px] text-[#e7ebf2] leading-snug line-clamp-2">{hoverNode.label}</div>
          {hoverNote && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a94a6] line-clamp-3">
              {hoverNote.content.replace(/[#>*`\[\]]/g, "").trim().slice(0, 130) || "Empty note"}
            </p>
          )}
          {hoverNode.type === "note" && (
            <div className="mt-2 pt-2 border-t border-white/[0.06] text-[10px] text-[#606a7a]">click to focus · double-click to open</div>
          )}
        </div>
      )}

      {counts.note === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <h3 className="text-[15px] font-semibold text-[#dfe4ec] tracking-tight">Nothing to map yet</h3>
          <p className="text-[12px] text-[#7c8698] mt-1.5 max-w-xs leading-relaxed">
            Create notes and link them with <code className="text-[#6EA8FE]">[[Title]]</code> or{" "}
            <code className="text-[#8AA0BE]">#tags</code> to build your graph.
          </p>
        </div>
      )}

      <div className="absolute bottom-3.5 left-3.5 text-[10px] text-[#4f5866] select-none pointer-events-none data-[hide=true]:hidden" data-hide={!!focusId}>
        scroll to zoom · drag to move · click a note to focus
      </div>
    </div>
  );
}

// ── presentational helpers ─────────────────────────────────────────────────
function Legend({ color, label, name }: { color: string; label: string; name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[#aab3c2] font-medium tabular-nums">{label}</span>
      <span className="text-[#6c7686]">{name}</span>
    </span>
  );
}

function RailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#5f6979]">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Toggle({ on, onClick, label, dot }: { on: boolean; onClick: () => void; label: string; dot?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-1.5 py-1 rounded-md text-[11px] transition-colors ${on ? "text-[#dfe4ec]" : "text-[#5c6675] hover:text-[#9aa4b5]"}`}
    >
      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded border ${on ? "border-[#6EA8FE]/55 bg-[#6EA8FE]/22" : "border-white/15"}`}>
        {on && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3 5.5L6.5 2" stroke="#cfe0ff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

function FiltersGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M1 2.5h10M2.5 6h7M4.5 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default NotesGraph;
