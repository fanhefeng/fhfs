/** Validate a complete export against transactional admin-edit evidence.
 * Intentional clearing is valid; unexplained loss or missing evidence blocks
 * the commit. The last snapshot also detects a formerly exported table omitted
 * by a newer exporter. No acknowledgement flags or production writes here.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { snapshotProblems, type BackupState } from "../src/lib/backupAudit";
import { type Snapshot } from "../src/lib/backup";

const [output, baseline] = process.argv.slice(2);
if (!output || !baseline)
  throw new Error("Give the new snapshot directory and the previous backup/db.json");

const before = JSON.parse(await readFile(baseline, "utf8")) as Snapshot;
const after = JSON.parse(await readFile(path.join(output, "db.json"), "utf8")) as Snapshot;
const evidence = JSON.parse(
  await readFile(path.join(output, "evidence.json"), "utf8"),
) as BackupState[];
const problems = snapshotProblems(after, evidence);
for (const name of Object.keys(before)) {
  if (!(name in after)) problems.push(`${name}: previous snapshot table is missing`);
}

if (problems.length) {
  console.error(
    `Public snapshot refused: ${problems.join("; ")}.\n` +
      "Authenticated admin edits and their expected row counts must agree. " +
      "Inspect the source database and edit evidence; do not bypass this guard.",
  );
  process.exit(1);
}

const counts = Object.entries(after).map(([table, rows]) => `${table} ${rows.length}`);
console.log(`snapshot accepted — ${counts.join(", ")}`);
