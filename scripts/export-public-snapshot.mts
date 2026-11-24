/** Export published records and transactional audit evidence into a new directory. */
import { access, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq, inArray } from "drizzle-orm";
import { hasLocale } from "use-intl";
import { stringify as toYaml } from "yaml";
import * as schema from "../src/db/schema";
import { routing } from "../src/i18n/routing";
import { validKey } from "../src/lib/forms";
import { connect } from "./connect.mjs";
import { snapshotProblems } from "../src/lib/backupAudit";
import { uploadIds } from "../src/lib/mediaUploads";

const url = process.env.PUBLIC_BACKUP_DATABASE_URL;
if (!url) throw new Error("PUBLIC_BACKUP_DATABASE_URL must use the dedicated read-only role");

const output = process.argv[2];
if (!output || !path.isAbsolute(output))
  throw new Error("Give an absolute path for a new snapshot output directory");
const exists = await access(output).then(
  () => true,
  (error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
    return false;
  },
);
if (exists) throw new Error("Snapshot output directory already exists");
const db = connect(url, { isolationLevel: "RepeatableRead", readOnly: true });

/**
 * Every ordering below is total, not just sorted.
 *
 * `sort` and `slug` repeat — two rows per slug, one per language — and a
 * partial ordering leaves the tie to the planner, which is free to answer
 * differently each time. That turns an unchanged database into a file that
 * keeps rewriting itself, and a diff that cries wolf is a diff nobody reads.
 */
const [
  posts,
  abouts,
  secrets,
  moments,
  timelineEntries,
  apps,
  works,
  films,
  idols,
  introNodes,
  resumeProfiles,
  resumeExperiences,
  chips,
  navItems,
  copyBlocks,
  evidence,
] = await db.batch([
  db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.draft, false))
    .orderBy(asc(schema.posts.slug), asc(schema.posts.locale)),
  db.select().from(schema.abouts).orderBy(asc(schema.abouts.locale)),
  db
    .select()
    .from(schema.secrets)
    .where(eq(schema.secrets.draft, false))
    .orderBy(asc(schema.secrets.slug), asc(schema.secrets.locale)),
  db
    .select()
    .from(schema.moments)
    .where(eq(schema.moments.draft, false))
    .orderBy(asc(schema.moments.postedAt), asc(schema.moments.key)),
  db
    .select()
    .from(schema.timelineEntries)
    .orderBy(asc(schema.timelineEntries.sort), asc(schema.timelineEntries.key)),
  db.select().from(schema.apps).orderBy(asc(schema.apps.sort), asc(schema.apps.key)),
  db.select().from(schema.works).orderBy(asc(schema.works.sort), asc(schema.works.key)),
  db
    .select()
    .from(schema.films)
    .where(eq(schema.films.draft, false))
    .orderBy(asc(schema.films.sort), asc(schema.films.key)),
  db
    .select()
    .from(schema.idols)
    .where(eq(schema.idols.draft, false))
    .orderBy(asc(schema.idols.sort), asc(schema.idols.key)),
  db
    .select()
    .from(schema.introNodes)
    .orderBy(asc(schema.introNodes.sort), asc(schema.introNodes.key)),
  db.select().from(schema.resumeProfiles).orderBy(asc(schema.resumeProfiles.key)),
  db
    .select()
    .from(schema.resumeExperiences)
    .orderBy(asc(schema.resumeExperiences.sort), asc(schema.resumeExperiences.key)),
  db.select().from(schema.chips).orderBy(asc(schema.chips.sort), asc(schema.chips.id)),
  db.select().from(schema.navItems).orderBy(asc(schema.navItems.sort), asc(schema.navItems.href)),
  db.select().from(schema.copyBlocks).orderBy(asc(schema.copyBlocks.key)),
  db
    .select({
      tableName: schema.adminContentState.tableName,
      publicRows: schema.adminContentState.publicRows,
    })
    .from(schema.adminContentState)
    .orderBy(asc(schema.adminContentState.tableName)),
]);

const data = {
  posts,
  abouts,
  secrets,
  moments,
  timelineEntries,
  apps,
  works,
  films,
  idols,
  introNodes,
  resumeProfiles,
  resumeExperiences,
  chips,
  navItems,
  copyBlocks,
  mediaUploads: [] as (typeof schema.mediaUploads.$inferSelect)[],
};

// Export only leases for URLs already present in this public snapshot.
// Temporary uploads and files belonging solely to drafts stay private.
const publicUploadIds = uploadIds(data);
if (publicUploadIds.length)
  data.mediaUploads = await db
    .select()
    .from(schema.mediaUploads)
    .where(inArray(schema.mediaUploads.id, publicUploadIds))
    .orderBy(asc(schema.mediaUploads.id));

const problems = snapshotProblems(data, evidence);
if (problems.length) throw new Error(`Backup refused: ${problems.join("; ")}`);
if (data.mediaUploads.length !== publicUploadIds.length)
  throw new Error("Backup refused: a public upload lease is missing");

// Serial ids and timestamps are restatements of the data, not part of it —
// leaving them out keeps the diff to what someone actually changed.
const strip = <T extends Record<string, unknown>>(rows: T[]) =>
  rows.map(({ id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest }) => rest);

// Older database rows may predate the editor's path validation.
if (
  [...data.posts, ...data.secrets].some(
    ({ slug, locale }) => !validKey(slug) || !hasLocale(routing.locales, locale),
  ) ||
  data.abouts.some(({ locale }) => !hasLocale(routing.locales, locale))
)
  throw new Error("Backup refused: a public record has an invalid export filename");

const stage = await mkdtemp(path.join(path.dirname(output), ".public-snapshot-"));
try {
  await mkdir(path.join(stage, "posts"));
  await writeFile(path.join(stage, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");
  await writeFile(
    path.join(stage, "db.json"),
    JSON.stringify(
      Object.fromEntries(
        Object.entries(data).map(([table, rows]) => [
          table,
          table === "mediaUploads"
            ? (rows as typeof data.mediaUploads).map(
                ({ createdAt: _createdAt, discardedAt: _discardedAt, ...row }) => ({
                  ...row,
                  state: "retained",
                }),
              )
            : strip(rows as Record<string, unknown>[]),
        ]),
      ),
      null,
      2,
    ) + "\n",
  );

  /** The article again, as the file it used to be. */
  for (const post of data.posts) {
    const frontmatter = toYaml({
      title: post.title,
      date: post.date,
      tags: post.tags,
      summary: post.summary,
    });
    await writeFile(
      path.join(stage, "posts", `${post.slug}.${post.locale}.md`),
      `---\n${frontmatter}---\n\n${post.bodyMd}`,
    );
  }

  /** The secrets likewise, in their own folder — a slug shared with a post
   *  must not overwrite it. */
  await mkdir(path.join(stage, "secrets"), { recursive: true });
  for (const secret of data.secrets) {
    const frontmatter = toYaml({
      title: secret.title,
      kind: secret.kind,
      date: secret.date,
      summary: secret.summary,
      ...(secret.audio ? { audio: secret.audio } : {}),
      ...(secret.duration != null ? { duration: secret.duration } : {}),
    });
    await writeFile(
      path.join(stage, "secrets", `${secret.slug}.${secret.locale}.md`),
      `---\n${frontmatter}---\n\n${secret.bodyMd}`,
    );
  }

  for (const about of data.abouts) {
    const frontmatter = toYaml({ title: about.title });
    await writeFile(
      path.join(stage, `about.${about.locale}.md`),
      `---\n${frontmatter}---\n\n${about.bodyMd}`,
    );
  }
  await rename(stage, output);
} finally {
  await rm(stage, { recursive: true, force: true });
}

const counts = Object.entries(data).map(
  ([table, rows]) => `${table} ${(rows as unknown[]).length}`,
);
console.log(`backup/ written — ${counts.join(", ")} (drafts left out)`);
