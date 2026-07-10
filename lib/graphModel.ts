import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import { Note, Task, Day } from "./types";

export type NodeType = "note" | "task" | "day" | "tag";

export type LinkKind =
  | "wikilink"
  | "note-task"
  | "note-day"
  | "task-day"
  | "folder"
  | "note-tag";

export interface GNode extends SimulationNodeDatum {
  id: string; // namespaced, e.g. "note:abc"
  refId: string; // original entity id / tag name
  type: NodeType;
  label: string;
  degree: number;
  folder: string | null;
  done: boolean;
  /** 0..1 edit-recency for notes (1 = just edited); 0 for others */
  recency: number;
}

export interface GLink extends SimulationLinkDatum<GNode> {
  kind: LinkKind;
}

export interface GraphData {
  nodes: GNode[];
  links: GLink[];
  /** adjacency for hover / focus neighbourhood traversal */
  neighbours: Map<string, Set<string>>;
  /** folders that contain at least one note, in stable order */
  folders: string[];
}

const TAG_RE = /(^|\s)#([a-zA-Z][\w-]{1,30})/g;

function recencyOf(updatedAt: string): number {
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return 0;
  const ageDays = (Date.now() - t) / 86_400_000;
  // full glow for the last ~12h, fading out by ~3 days
  return Math.max(0, Math.min(1, 1 - (ageDays - 0.5) / 3));
}

/** BFS the neighbour map from a seed out to `depth` hops (inclusive). */
export function neighbourhood(
  neighbours: Map<string, Set<string>>,
  seed: string,
  depth: number,
): Set<string> {
  const seen = new Set<string>([seed]);
  let frontier = [seed];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of neighbours.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

export function buildGraph(notes: Note[], tasks: Task[], days: Day[]): GraphData {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const dayById = new Map(days.map((d) => [d.id, d]));

  const usedTaskIds = new Set<string>();
  const usedDayIds = new Set<string>();
  for (const n of notes) {
    if (n.taskId) usedTaskIds.add(n.taskId);
    if (n.dayId) usedDayIds.add(n.dayId);
  }
  for (const tid of usedTaskIds) {
    const t = taskById.get(tid);
    if (t?.dayId) usedDayIds.add(t.dayId);
  }

  const nodes: GNode[] = [];
  const nodeIds = new Set<string>();
  const push = (node: GNode) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  for (const n of notes) {
    push({
      id: `note:${n.id}`,
      refId: n.id,
      type: "note",
      label: n.title || "Untitled",
      degree: 0,
      folder: n.folder ?? null,
      done: false,
      recency: recencyOf(n.updatedAt),
    });
  }
  for (const tid of usedTaskIds) {
    const t = taskById.get(tid);
    if (!t) continue;
    push({
      id: `task:${t.id}`,
      refId: t.id,
      type: "task",
      label: t.text,
      degree: 0,
      folder: null,
      done: t.done,
      recency: 0,
    });
  }
  for (const did of usedDayIds) {
    const d = dayById.get(did);
    if (!d) continue;
    push({
      id: `day:${d.id}`,
      refId: d.id,
      type: "day",
      label: `Day ${d.index}: ${d.title}`,
      degree: 0,
      folder: null,
      done: false,
      recency: 0,
    });
  }

  const links: GLink[] = [];
  const linkSeen = new Set<string>();
  const addLink = (a: string, b: string, kind: LinkKind) => {
    if (a === b || !nodeIds.has(a) || !nodeIds.has(b)) return;
    const key = a < b ? `${a}|${b}|${kind}` : `${b}|${a}|${kind}`;
    if (linkSeen.has(key)) return;
    linkSeen.add(key);
    links.push({ source: a, target: b, kind });
  };

  // Wikilinks [[Title]] → note titles (case-insensitive)
  const noteByTitle = new Map<string, Note>();
  for (const n of notes) if (n.title) noteByTitle.set(n.title.trim().toLowerCase(), n);
  const wikiRe = /\[\[([^\]]+)\]\]/g;
  for (const n of notes) {
    wikiRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = wikiRe.exec(n.content)) !== null) {
      const target = noteByTitle.get(m[1].trim().toLowerCase());
      if (target && target.id !== n.id) addLink(`note:${n.id}`, `note:${target.id}`, "wikilink");
    }
  }

  // note→task / note→day
  for (const n of notes) {
    if (n.taskId && usedTaskIds.has(n.taskId)) addLink(`note:${n.id}`, `task:${n.taskId}`, "note-task");
    if (n.dayId && usedDayIds.has(n.dayId)) addLink(`note:${n.id}`, `day:${n.dayId}`, "note-day");
  }
  // task→day
  for (const tid of usedTaskIds) {
    const t = taskById.get(tid);
    if (t?.dayId && usedDayIds.has(t.dayId)) addLink(`task:${t.id}`, `day:${t.dayId}`, "task-day");
  }

  // Inline #tags → tag nodes
  for (const n of notes) {
    TAG_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    const seenForNote = new Set<string>();
    while ((m = TAG_RE.exec(n.content)) !== null) {
      const tag = m[2].toLowerCase();
      if (seenForNote.has(tag)) continue;
      seenForNote.add(tag);
      const tagId = `tag:${tag}`;
      push({
        id: tagId,
        refId: tag,
        type: "tag",
        label: `#${tag}`,
        degree: 0,
        folder: null,
        done: false,
        recency: 0,
      });
      addLink(`note:${n.id}`, tagId, "note-tag");
    }
  }

  // Faint same-folder chains (n-1 edges per folder)
  const byFolder = new Map<string, Note[]>();
  for (const n of notes) {
    if (!n.folder) continue;
    const arr = byFolder.get(n.folder) ?? [];
    arr.push(n);
    byFolder.set(n.folder, arr);
  }
  const folders: string[] = [];
  for (const [folder, arr] of byFolder) {
    folders.push(folder);
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < sorted.length - 1; i++) {
      addLink(`note:${sorted[i].id}`, `note:${sorted[i + 1].id}`, "folder");
    }
  }

  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.source as string, (degree.get(l.source as string) ?? 0) + 1);
    degree.set(l.target as string, (degree.get(l.target as string) ?? 0) + 1);
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  const neighbours = new Map<string, Set<string>>();
  for (const node of nodes) neighbours.set(node.id, new Set());
  for (const l of links) {
    neighbours.get(l.source as string)?.add(l.target as string);
    neighbours.get(l.target as string)?.add(l.source as string);
  }

  return { nodes, links, neighbours, folders: folders.sort() };
}
