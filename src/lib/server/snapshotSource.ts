import "@tanstack/react-start/server-only";
import type * as schema from "@/db/schema";
import { sharePendingRead } from "./cacheScope";

type ExportRow<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
type Tables = {
  posts: ExportRow<typeof schema.posts.$inferSelect>[];
  secrets: ExportRow<typeof schema.secrets.$inferSelect>[];
  moments: (Omit<ExportRow<typeof schema.moments.$inferSelect>, "postedAt"> & {
    postedAt: string;
  })[];
  films: ExportRow<typeof schema.films.$inferSelect>[];
  idols: ExportRow<typeof schema.idols.$inferSelect>[];
  abouts: ExportRow<typeof schema.abouts.$inferSelect>[];
  apps: ExportRow<typeof schema.apps.$inferSelect>[];
  timelineEntries: ExportRow<typeof schema.timelineEntries.$inferSelect>[];
  chips: ExportRow<typeof schema.chips.$inferSelect>[];
  introNodes: ExportRow<typeof schema.introNodes.$inferSelect>[];
  resumeProfiles: ExportRow<typeof schema.resumeProfiles.$inferSelect>[];
  resumeExperiences: ExportRow<typeof schema.resumeExperiences.$inferSelect>[];
  copyBlocks: ExportRow<typeof schema.copyBlocks.$inferSelect>[];
  navItems: ExportRow<typeof schema.navItems.$inferSelect>[];
};

export type PublicSnapshot = { publishedAt: string; tables: Tables };

const origin = "https://raw.githubusercontent.com/fanhefeng/fhfs";
const branch = `${origin}/db-snapshots/backup`;
const knownVersion = "cd75c7f39bea50779e45aa71485176323fd683a1";
const knownDate = "2026-10-20T03:09:06Z";
const bundledDate = "2026-10-19T01:26:53Z";
const refreshMs = 30_000;

const tables = [
  "posts",
  "secrets",
  "moments",
  "films",
  "idols",
  "abouts",
  "apps",
  "timelineEntries",
  "chips",
  "introNodes",
  "resumeProfiles",
  "resumeExperiences",
  "copyBlocks",
  "navItems",
] as const satisfies readonly (keyof Tables)[];

const draftTables = ["posts", "secrets", "moments", "films", "idols"] as const;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// The source is this site's public, guarded export. Reject a partial export
// or any export containing a draft, even if a publisher regresses.
export function parsePublicSnapshot(publishedAt: string, value: unknown): PublicSnapshot {
  if (!Number.isFinite(Date.parse(publishedAt)) || !record(value))
    throw new Error("Invalid public snapshot");
  const selected: Record<string, Record<string, unknown>[]> = {};
  for (const table of tables) {
    const rows: unknown = value[table];
    if (!Array.isArray(rows) || !rows.every(record)) throw new Error("Incomplete public snapshot");
    selected[table] = rows;
  }
  for (const table of draftTables) {
    if (selected[table]!.some((row) => row.draft !== false))
      throw new Error("Unpublished row in public snapshot");
  }
  for (const table of ["posts", "secrets"] as const) {
    if (
      selected[table]!.some(
        (row) =>
          typeof row.slug !== "string" ||
          typeof row.title !== "string" ||
          typeof row.summary !== "string" ||
          typeof row.bodyHtml !== "string" ||
          (row.locale !== "zh" && row.locale !== "en"),
      )
    )
      throw new Error("Invalid article in public snapshot");
  }
  return { publishedAt, tables: selected as unknown as Tables };
}

async function publishedSnapshot(): Promise<PublicSnapshot> {
  const signal = AbortSignal.timeout(2_500);
  const descriptor = await fetch(`${branch}/snapshot-version.json`, { signal });
  // Bootstrap installations can read the last guarded commit before the
  // publishing workflow starts attaching a timestamp and digest.
  if (descriptor.status === 404) {
    const file = await fetch(`${origin}/${knownVersion}/backup/db.json`, { signal });
    if (!file.ok) throw new Error("Public snapshot unavailable");
    return parsePublicSnapshot(knownDate, await file.json());
  }
  if (!descriptor.ok) throw new Error("Public snapshot version unavailable");
  const version: unknown = await descriptor.json();
  if (
    !record(version) ||
    typeof version.publishedAt !== "string" ||
    typeof version.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(version.sha256)
  )
    throw new Error("Invalid public snapshot version");

  const file = await fetch(`${branch}/db.json`, { signal });
  if (!file.ok) throw new Error("Public snapshot unavailable");
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== version.sha256) throw new Error("Public snapshot version mismatch");
  return parsePublicSnapshot(version.publishedAt, JSON.parse(new TextDecoder().decode(bytes)));
}

let current: { snapshot: PublicSnapshot; refreshAt: number } | undefined;

export function readPublicSnapshot(): Promise<PublicSnapshot> {
  if (current && current.refreshAt > Date.now()) return Promise.resolve(current.snapshot);
  return sharePendingRead("published-snapshot", async () => {
    const started = Date.now();
    let snapshot: PublicSnapshot;
    try {
      snapshot = await publishedSnapshot();
    } catch {
      snapshot =
        current?.snapshot ??
        parsePublicSnapshot(bundledDate, (await import("../../../backup/db.json")).default);
    }
    // Concurrent edge requests can finish out of order. Keep the newest good copy.
    if (current && Date.parse(current.snapshot.publishedAt) > Date.parse(snapshot.publishedAt))
      snapshot = current.snapshot;
    current = { snapshot, refreshAt: started + refreshMs };
    return snapshot;
  });
}
