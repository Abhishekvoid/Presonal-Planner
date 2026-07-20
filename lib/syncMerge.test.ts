// Run: node --experimental-strip-types --test lib/syncMerge.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeById, mergeKv } from "./syncMerge.ts";

test("unpushed local tick survives a staler DB row", () => {
  const db = [{ id: "task-2-dsa-0", done: false }];
  const local = [{ id: "task-2-dsa-0", done: true }];
  assert.deepEqual(mergeById(db, local), [{ id: "task-2-dsa-0", done: true }]);
});

test("rows only in local are kept, rows only in DB are kept", () => {
  const db = [{ id: "a" }, { id: "b" }];
  const local = [{ id: "b" }, { id: "ses-new" }];
  assert.deepEqual(mergeById(db, local).map((r) => r.id), ["a", "b", "ses-new"]);
});

test("duplicate local ids collapse onto one row", () => {
  const db = [{ id: "a", v: 0 }];
  const local = [{ id: "a", v: 1 }, { id: "a", v: 2 }];
  assert.deepEqual(mergeById(db, local), [{ id: "a", v: 2 }]);
});

test("kv: DB wins on conflict when there are no unpushed edits", () => {
  const db = { "pitch-checked-day-2": '{"ros":true}' };
  const local = { "pitch-checked-day-2": "{}" };
  assert.deepEqual(mergeKv(db, local, false), db);
});

test("kv: local wins on conflict when it has unpushed edits", () => {
  const db = { "pitch-checked-day-2": "{}" };
  const local = { "pitch-checked-day-2": '{"ros":true}' };
  assert.deepEqual(mergeKv(db, local, true), local);
});

test("kv: local-only keys survive either way (legacy migration)", () => {
  const db = { a: "1" };
  const local = { legacy: "2" };
  assert.deepEqual(mergeKv(db, local, false), { a: "1", legacy: "2" });
  assert.deepEqual(mergeKv(db, local, true), { a: "1", legacy: "2" });
});
