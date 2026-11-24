import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vite-plus/test";
import * as schema from "@/db/schema";
import { BACKUP_TABLES } from "@/lib/backupAudit";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (file: string) => readFileSync(`${root}${file}`, "utf8");

/** Every table the schema declares, as `[exportName, sqlName]`. */
const tables = Object.entries(schema)
  .filter(([, value]) => is(value, PgTable))
  .map(([name, table]) => [name, getTableName(table as PgTable)] as const);

/**
 * Tables with no complete public snapshot. A new table is content until it
 * is named here with its reason.
 */
const NOT_CONTENT = new Set([
  // Operational expected counts, never public content.
  "adminContentState",
  // Failed-login timestamps by IP; they expire by themselves.
  "loginAttempts",
  // Temporary leases/tombstones stay private. Export includes only the leases
  // referenced by the public snapshot; old snapshots can omit this subset.
  "mediaUploads",
]);

const content = tables.filter(([name]) => !NOT_CONTENT.has(name));

// A table added to the schema has to be named in each of these by hand — the
// scripts treat every table a little differently, so they cannot be derived.
// One forgotten is a backup that silently lacks a table, found at restore.
describe("every table in the schema", () => {
  it("has matching transactional edit evidence for every content table", () => {
    expect(Object.entries(BACKUP_TABLES).sort(([a], [b]) => a.localeCompare(b))).toEqual(
      [...content].sort(([a], [b]) => a.localeCompare(b)),
    );
  });
  it("is found", () => {
    expect(tables.length).toBeGreaterThan(10);
    expect([...NOT_CONTENT].filter((name) => !tables.some(([t]) => t === name))).toEqual([]);
  });

  it("is handled by the guarded public snapshot export, if it holds content", () => {
    const script = read("scripts/export-public-snapshot.mts");
    expect(
      content
        .filter(([name]) => !new RegExp(`\\bschema\\.${name}\\b`).test(script))
        .map(([name]) => name),
    ).toEqual([]);
  });

  it("has its rows in backup/db.json, if it holds content", () => {
    const backup = Object.keys(JSON.parse(read("backup/db.json")) as Record<string, unknown>);
    expect(content.map(([name]) => name).filter((name) => !backup.includes(name))).toEqual([]);
  });
});
