import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import cover from "./og/ogCover";
import article from "./og/ogPost";
import icon from "./og/ogIcon";
import { site } from "../src/config/site";
import { routing } from "../src/i18n/routing";
import type { SearchEntry } from "../src/lib/search";
import { shareSignature, type ShareImages } from "../src/lib/shareImage";

const target = ".generated/public/share-images";
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
async function save(name: string, response: Response) {
  if (!response.ok) throw new Error(`Share image render failed: ${name}`);
  await writeFile(join(target, name), new Uint8Array(await response.arrayBuffer()));
}
for (const locale of routing.locales) {
  await save(`cover-${locale}.png`, await cover({ params: Promise.resolve({ locale }) }));
}
await save("admin-icon.png", await icon());

// Only this deployment's public index is read. CI needs no database credentials.
// On a fresh installation the covers work before any public index is available.
const indexes = new Map<string, SearchEntry[]>();
for (const locale of routing.locales) {
  try {
    const response = await fetch(`${site.url}/${locale}/search.json`, {
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid public search index");
    indexes.set(locale, data);
  } catch (error) {
    console.warn(`Article share snapshots unavailable (${locale}); using the site cover:`, error);
  }
}
const images: ShareImages = {};
for (const locale of routing.locales) {
  const other = locale === "zh" ? "en" : "zh";
  for (const entry of indexes.get(locale) ?? []) {
    if (entry.kind !== "post" || !entry.meta || !Array.isArray(entry.tags)) continue;
    const slug = entry.href.slice("/blog/".length);
    if (!entry.href.startsWith("/blog/") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue;
    const counterpart = indexes.get(other)?.find((row) => row.href === entry.href);
    // Without both locale indexes the other headline might be missing. Use a cover.
    if (!counterpart?.meta || !Array.isArray(counterpart.tags)) continue;
    const post = { title: entry.title, date: entry.meta, tags: entry.tags };
    const alternate = { title: counterpart.title, date: counterpart.meta, tags: counterpart.tags };
    const signature = shareSignature(post, alternate);
    const hash = createHash("sha256").update(signature).digest("hex").slice(0, 16);
    const name = `${locale}-${slug}-${hash}.png`;
    await save(name, await article({ post, counterpart: alternate }));
    images[`${locale}/${slug}`] = { signature, path: `/share-images/${name}` };
  }
}
await writeFile(join(target, "manifest.json"), JSON.stringify(images));
console.log(
  `Prepared 2 covers, admin icon and ${Object.keys(images).length} article share images.`,
);
