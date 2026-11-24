/** Inventory, download or publish referenced assets for the shared media Worker. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isTable } from "drizzle-orm";
import { MEDIA_ORIGIN } from "../src/config/csp";
import * as schema from "../src/db/schema";
import { MEDIA_FILE_LIMIT, MEDIA_HEADERS, mediaPaths } from "../src/lib/mediaSite";
import { connect } from "./connect.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaDir = path.join(root, "media");
const filesDir = path.join(mediaDir, "files");
const sizesPath = path.join(mediaDir, "sizes.gen.json");

function previousAssets(): string[] {
  return Object.keys(JSON.parse(readFileSync(sizesPath, "utf8")) as Record<string, number>);
}

/** Every media-site path any row points at, drafts and all — the login throttle aside. */
async function referenced(): Promise<string[]> {
  const url = process.env.MEDIA_INVENTORY_DATABASE_URL;
  if (!url) throw new Error("Set MEDIA_INVENTORY_DATABASE_URL to a dedicated read-only role");
  const db = connect(url, { readOnly: true });
  const text: string[] = [];
  for (const [name, table] of Object.entries(schema)) {
    if (!isTable(table) || name === "loginAttempts" || name === "mediaUploads") continue;
    text.push(JSON.stringify(await db.select().from(table as typeof schema.moments)));
  }
  return mediaPaths(text.join("\n"), MEDIA_ORIGIN);
}

/** Every file under media/files/, as site paths. */
function local(dir = filesDir, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.name === "_headers") return [];
    const site = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return local(path.join(dir, entry.name), site);
    if (entry.isFile()) return [site];
    throw new Error(`Unsupported media file type: ${site}`);
  });
}

async function pull() {
  const wanted = [...new Set([...previousAssets(), ...(await referenced())])];
  let fetched = 0;
  for (const site of wanted) {
    const file = path.join(filesDir, site);
    if (existsSync(file)) continue;
    const response = await fetch(`${MEDIA_ORIGIN}${site}`);
    if (!response.ok) throw new Error(`${site}: ${response.status}`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    fetched++;
  }
  console.log(
    `media/files: ${wanted.length} existing and referenced files, ${fetched} fetched now`,
  );
}

/** The line the board's media field wants for a file, measured with ffprobe when it can be. */
function mediaLine(site: string): string {
  const url = `${MEDIA_ORIGIN}${site}`;
  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      path.join(filesDir, site),
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) return url;
  const info = JSON.parse(probe.stdout) as {
    streams: { codec_type: string; width?: number; height?: number }[];
    format: { duration?: string };
  };
  const video = info.streams.find((s) => s.codec_type === "video");
  const seconds = `${Math.round(Number(info.format.duration ?? 0) * 10) / 10}s`;
  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(site))
    return `image ${url} ${video?.width}x${video?.height}`;
  if (!video) return `audio ${url} ${seconds}`;
  return `video ${url} ${video.width}x${video.height} ${seconds} poster=…`;
}

async function check() {
  const files = local();
  const have = new Set(files);
  if (files.length === 0) throw new Error("No media assets are present");
  const wanted = await referenced();
  const missing = [...new Set([...previousAssets(), ...wanted])].filter((site) => !have.has(site));
  const tooBig = files.filter(
    (site) => statSync(path.join(filesDir, site)).size > MEDIA_FILE_LIMIT,
  );
  if (missing.length > 0 || tooBig.length > 0) {
    if (missing.length > 0) {
      console.error(
        `Missing from media/files/ — a deploy now would take them off the site (run pnpm media:pull):\n  ${missing.join("\n  ")}`,
      );
    }
    if (tooBig.length > 0) {
      console.error(`Over 25 MiB, which Cloudflare refuses — re-encode:\n  ${tooBig.join("\n  ")}`);
    }
    process.exit(1);
  }

  return { files, wanted };
}

async function deploy() {
  const { files, wanted } = await check();
  const sizes = Object.fromEntries(
    files.sort().map((site) => [site, statSync(path.join(filesDir, site)).size]),
  );
  writeFileSync(sizesPath, `${JSON.stringify(sizes, null, 2)}\n`);
  writeFileSync(path.join(filesDir, "_headers"), MEDIA_HEADERS);

  // Wrangler reads the shared media Worker configuration from media/.
  const run = spawnSync("pnpm", ["exec", "wrangler", "deploy"], {
    cwd: mediaDir,
    stdio: "inherit",
  });
  if (run.error) throw new Error("Wrangler is unavailable; install project dependencies first");
  if (run.status !== 0) process.exit(run.status ?? 1);

  const fresh = files.filter((site) => !wanted.includes(site));
  console.log(`\n${files.length} files live at ${MEDIA_ORIGIN}; commit media/sizes.gen.json.`);
  if (fresh.length > 0) {
    console.log(
      `Nothing points at these yet — the media field's lines:\n  ${fresh.map(mediaLine).join("\n  ")}`,
    );
  }
}

const job = process.argv[2];
if (job === "pull") await pull();
else if (job === "check") {
  const { files } = await check();
  console.log(`Media inventory passed for ${files.length} files`);
} else if (job === "deploy") await deploy();
else throw new Error("pnpm media:pull | pnpm media:check | pnpm media:deploy");
