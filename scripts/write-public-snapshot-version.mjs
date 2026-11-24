import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [directory, time = new Date().toISOString()] = process.argv.slice(2);
if (!directory || !Number.isFinite(Date.parse(time)))
  throw new Error("Give a snapshot directory and optionally its original ISO publication date");

const publishedAt = new Date(time).toISOString();
const sha256 = createHash("sha256")
  .update(await readFile(join(directory, "db.json")))
  .digest("hex");
await writeFile(
  join(directory, "snapshot-version.json"),
  JSON.stringify({ publishedAt, sha256 }) + "\n",
);
