import { readFile, cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { prepareResponsiveImages } from "./responsive-images.mjs";
const source = "public",
  target = ".generated/public";
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const manifest = JSON.parse(await readFile("src/lib/assets.gen.json", "utf8"));
for (const [name, info] of Object.entries(manifest.files)) {
  const hash = typeof info === "string" ? info : info.hash;
  if (!hash || name.endsWith("/")) continue;
  const at = name.lastIndexOf(".");
  const hashed = name.slice(0, at) + "." + hash + name.slice(at);
  const dest = join(target, hashed);
  await mkdir(dirname(dest), { recursive: true });
  await cp(join(source, name), dest);
}

for (const [name, hash] of Object.entries(manifest.sets)) {
  await cp(join(source, name), join(target, name, "_" + hash), { recursive: true });
}

await prepareResponsiveImages(process.cwd(), manifest);
