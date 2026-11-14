/** Writes only to a separately provisioned, marked test database and local media KV. */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { and, eq, like, or, sql } from "drizzle-orm";
import { connect } from "./connect.mts";
import { testDatabaseProblem } from "../src/lib/e2e";
import { hashPassword } from "../src/lib/server/auth/password";
import { posts, secrets, films, mediaUploads } from "../src/db/schema";
import { backupAuditQueries } from "../src/lib/backupAudit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".e2e/database.env", ".env"]) {
  try {
    process.loadEnvFile(path.join(root, file));
  } catch {
    /* CI supplies values. */
  }
}
const testUrl = process.env.TEST_DATABASE_URL;
const production = [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].filter(
  (url): url is string => Boolean(url),
);
const problem = testDatabaseProblem(testUrl, production);
if (problem) throw new Error(problem);
// This database belongs to fhfs alone; fhfs-site uses a different database.
if (new URL(testUrl!).pathname !== "/fhfs_e2e")
  throw new Error("Use the separately provisioned fhfs_e2e database");
const db = connect(testUrl!);
try {
  const guard = await db.execute(
    sql`SELECT marker FROM public.fhfs_e2e_guard WHERE marker = 'fhfs-e2e-only'`,
  );
  if (guard.rows.length !== 1) throw new Error();
} catch {
  throw new Error("Missing isolated test database guard; no migrations or writes performed");
}
const state = path.join(root, ".e2e");
await mkdir(state, { recursive: true, mode: 0o700 });
const lock = await open(path.join(state, "lock"), "wx", 0o600);
const children = new Set<ChildProcess>();
const run = randomUUID();
const prefix = `e2e-fhfs-${run}`;
const secret = randomBytes(32).toString("hex");
const password = randomBytes(24).toString("base64url");
const mediaSecret = randomBytes(32).toString("hex");
const bindings = {
  DATABASE_URL: testUrl!,
  AUTH_SECRET: secret,
  ADMIN_PASSWORD_HASH: hashPassword(password),
  MEDIA_UPLOAD_SECRET: mediaSecret,
  E2E_BUILD: "true",
  E2E_MEDIA_ORIGIN: "http://127.0.0.1:8787",
};
const fingerprint = createHash("sha256").update(`${testUrl}\n${secret}`).digest("hex");
const childEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    ["PATH", "HOME", "TMPDIR", "SHELL", "CI", "TERM"].includes(key),
  ),
);
Object.assign(childEnv, { WRANGLER_SEND_METRICS: "false" });
let interrupted = false;
function stop() {
  interrupted = true;
  for (const child of children)
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        /* Already stopped. */
      }
    }
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
function child(args: string[], extraEnv: Record<string, string> = {}) {
  const process = spawn("pnpm", args, {
    cwd: root,
    env: { ...childEnv, ...extraEnv },
    stdio: "pipe",
    detached: true,
  });
  children.add(process);
  process.on("error", () => stop());
  process.once("close", () => children.delete(process));
  // Never print environment/binding dumps or authenticated response contents.
  process.stdout?.on("data", () => {});
  process.stderr?.on("data", () => {});
  return process;
}
async function portFree(port: number) {
  await new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error(`E2E port ${port} is occupied`)));
    server.listen(port, () => server.close(() => resolve()));
  });
}
async function ready(url: string, process: ChildProcess) {
  for (let i = 0; i < 90; i++) {
    if (interrupted || process.exitCode !== null) throw new Error("Local E2E worker stopped");
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) });
      return;
    } catch {
      /* Startup only. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Local E2E worker did not start");
}
try {
  await portFree(3100);
  await portFree(8787);
  const built = JSON.parse(await readFile(path.join(root, "dist/server/wrangler.json"), "utf8"));
  const mediaRows = await db.execute(sql`SELECT count(*) AS count FROM media_uploads`);
  // A dedicated fhfs test database must never inherit production upload leases.
  if (Number(mediaRows.rows[0]?.count) > 1000) throw new Error("Unexpected test upload inventory");
  // Establish edit evidence only for the dedicated disposable fixture set.
  for (const table of [posts, secrets])
    await db.execute(backupAuditQueries(table, `isolated-e2e-${run}`).record);
  // A run-owned wall gives viewer tests deterministic public content in this
  // guarded, otherwise mostly empty database. Only these prefixed rows are removed.
  const localized = (zh: string, en: string) => ({ zh, en });
  const blank = localized("", "");
  await db.insert(films).values({
    key: `${prefix}-viewer`,
    title: localized("隔离看图测试", "Isolated viewer test"),
    subtitle: localized("仅供浏览器回归", "Browser regression only"),
    latin: blank,
    year: "2026",
    ratio: "video",
    facts: { director: blank, cast: blank, released: blank, runtime: blank, rating: blank },
    credit: localized("沿用站内剧照许可", "Existing site stills license"),
    stills: [
      { id: "first", src: "/films/odyssey/monkey-king.jpg", width: 1800, height: 1013 },
      { id: "second", src: "/films/odyssey/wink.jpg", width: 1280, height: 720 },
    ].map((image) => ({
      ...image,
      span: "one" as const,
      title: localized(image.id === "first" ? "第一张" : "第二张", image.id),
      alt: localized("测试剧照", "Test still"),
      meta: blank,
    })),
  });
  await writeFile(path.join(state, "session.json"), JSON.stringify({ secret, password, prefix }), {
    mode: 0o600,
  });
  // This wrapper exists only in ignored build output, never in a production entry.
  await writeFile(
    path.join(root, "dist/server/e2e-entry.mjs"),
    `
    import app from './index.js';
    import { env } from 'cloudflare:workers';
    export default { async fetch(request, bindings, context) {
      if (new URL(request.url).pathname === '/__e2e_ready') {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.DATABASE_URL + '\\n' + env.AUTH_SECRET));
        const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        return Response.json({ fingerprint, media: process.env.E2E_MEDIA_ORIGIN, e2e: process.env.E2E_BUILD });
      }
      return app.fetch(request, bindings, context);
    }};
  `,
    { mode: 0o600 },
  );
  await writeFile(
    path.join(state, "app.json"),
    JSON.stringify({
      name: "fhfs-e2e",
      main: path.join(root, "dist/server/e2e-entry.mjs"),
      no_bundle: true,
      compatibility_date: built.compatibility_date,
      compatibility_flags: built.compatibility_flags,
      rules: built.rules,
      vars: bindings,
      assets: { directory: path.join(root, "dist/client"), binding: "ASSETS" },
      observability: { enabled: false },
    }),
    { mode: 0o600 },
  );
  await mkdir(path.join(state, "empty-assets"), { recursive: true });
  await writeFile(path.join(state, "empty-assets/empty.txt"), "Local E2E only");
  await writeFile(
    path.join(state, "media.json"),
    JSON.stringify({
      name: "fhfs-media-e2e",
      main: path.join(root, "media/worker.ts"),
      compatibility_date: "2026-10-19",
      assets: { directory: "./empty-assets", binding: "ASSETS", run_worker_first: true },
      kv_namespaces: [{ binding: "UPLOADS", id: "local-e2e" }],
      vars: { MEDIA_UPLOAD_SECRET: mediaSecret, UPLOAD_SITE_ORIGIN: "http://localhost:3100" },
    }),
    { mode: 0o600 },
  );
  const media = child([
    "exec",
    "wrangler",
    "dev",
    "--local",
    "--config",
    ".e2e/media.json",
    "--port",
    "8787",
    "--persist-to",
    ".e2e/media-state",
  ]);
  await ready("http://127.0.0.1:8787/", media);
  const app = child([
    "exec",
    "wrangler",
    "dev",
    "--local",
    "--config",
    ".e2e/app.json",
    "--port",
    "3100",
    "--persist-to",
    ".e2e/app-state",
  ]);
  await ready("http://localhost:3100/admin/login", app);
  const identity = (await fetch("http://localhost:3100/__e2e_ready").then((r) => r.json())) as {
    fingerprint: string;
    media: string;
    e2e: string;
  };
  if (
    identity.fingerprint !== fingerprint ||
    identity.media !== bindings.E2E_MEDIA_ORIGIN ||
    identity.e2e !== "true"
  )
    throw new Error(
      "Local Worker bindings do not match the isolated test configuration; no browser writes performed",
    );
  console.log("Isolated app and local media ready; running browser flows");
  const browser = spawn("pnpm", ["exec", "playwright", "test"], {
    cwd: root,
    env: { ...childEnv, E2E_BASE_URL: "http://localhost:3100" },
    stdio: "inherit",
    detached: true,
  });
  children.add(browser);
  const code = await new Promise<number | null>((resolve, reject) => {
    browser.once("error", reject);
    browser.once("close", resolve);
  });
  children.delete(browser);
  if (code !== 0) throw new Error("Isolated browser flows failed");
} finally {
  const running = [...children];
  stop();
  await Promise.all(
    running.map(
      (process) =>
        new Promise<void>((resolve) => {
          if (process.exitCode !== null || !process.pid) return resolve();
          const timer = setTimeout(() => {
            try {
              globalThis.process.kill(-process.pid!, "SIGKILL");
            } catch {
              /* Stopped. */
            }
          }, 5000);
          process.once("close", () => {
            clearTimeout(timer);
            resolve();
          });
        }),
    ),
  );
  try {
    await db
      .delete(posts)
      .where(
        or(
          like(posts.slug, `${prefix}%`),
          and(eq(posts.slug, "typescript-decorators"), like(posts.title, `${prefix}%`)),
        ),
      );
    await db
      .delete(secrets)
      .where(and(eq(secrets.slug, "kitchen-notes"), like(secrets.title, `${prefix}%`)));
    for (const table of [posts, secrets])
      await db.execute(backupAuditQueries(table, `isolated-e2e-cleanup-${run}`).record);
    await db.delete(films).where(eq(films.key, `${prefix}-viewer`));
    // All leases here belong to this application's dedicated disposable database.
    await db.delete(mediaUploads);
  } catch {
    console.error("Isolated database cleanup failed; temporary credentials are still removed");
    process.exitCode = 1;
  } finally {
    await Promise.all(
      ["session.json", "runtime.env", "media.env", "app.json", "media.json"].map((file) =>
        rm(path.join(state, file), { force: true }),
      ),
    );
    await rm(path.join(root, "dist/server/e2e-entry.mjs"), { force: true });
    await lock.close();
    await rm(path.join(state, "lock"), { force: true });
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
