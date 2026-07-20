/**
 * Merge helpers for reconciling the local (localStorage) planner snapshot with
 * the Neon copy on load.
 *
 * Neon is the source of truth, with one exception: edits made on this device
 * that the debounced push hadn't flushed yet. Those live only in localStorage,
 * and a plain "DB replaces local" hydrate silently discards them — that is how
 * ticked tasks and logged study sessions were being lost on reload.
 *
 * "Local always wins" is NOT a valid shortcut here: on a fresh browser the local
 * store is `buildSeed()`, i.e. every task `done: false`. Letting that win would
 * wipe real progress out of Neon. So local only wins while the unpushed flag is
 * set — see `hasUnpushedEdits` in DBSyncManager.
 */

/**
 * Union two id-keyed lists. Rows only in `local` are appended; rows in both are
 * taken from `local`. Call only when local is known to hold unpushed edits.
 */
export function mergeById<T extends { id: string }>(db: T[], local: T[]): T[] {
  const out = [...db];
  const indexOf = new Map(out.map((row, i) => [row.id, i]));
  for (const row of local) {
    const i = indexOf.get(row.id);
    if (i === undefined) {
      indexOf.set(row.id, out.length);
      out.push(row);
    } else {
      out[i] = row;
    }
  }
  return out;
}

/**
 * Merge the key/value bag. Local always fills keys the DB lacks — that keeps the
 * legacy-localStorage migration alive on a device that has never pushed — but
 * local only overrides a key the DB already has when it has unpushed edits.
 */
export function mergeKv(
  db: Record<string, string>,
  local: Record<string, string>,
  localWins: boolean,
): Record<string, string> {
  return localWins ? { ...db, ...local } : { ...local, ...db };
}
