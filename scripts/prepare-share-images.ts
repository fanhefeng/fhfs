import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import cover from "./og/ogCover";
import icon from "./og/ogIcon";
import { siteUrl } from "../src/lib/siteUrl";
import { routing } from "../src/i18n/routing";

const target = ".generated/public/share-images";
const origin = siteUrl({ VITE_SITE_URL: process.env.VITE_SITE_URL });
// Do not package article-derived metadata or PNGs: a static deployment can
// outlive an edit or withdrawal. Clear any files left by previous builds.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
async function save(name: string, response: Response) {
  if (!response.ok) throw new Error(`Share image render failed: ${name}`);
  await writeFile(join(target, name), new Uint8Array(await response.arrayBuffer()));
}
for (const locale of routing.locales) {
  await save(`cover-${locale}.png`, await cover({ params: Promise.resolve({ locale }), origin }));
}
await save("admin-icon.png", await icon());
console.log("Prepared 2 site covers and the admin icon.");
