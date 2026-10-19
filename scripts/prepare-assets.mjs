import { readFile, cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
const source = "public",
  target = ".generated/public";
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
// Server-only imports do not emit their URL assets into the client asset directory.
// The Worker reads these licensed local fonts through its ASSETS binding.
await cp("src/lib/server/og-fonts", join(target, "og-fonts"), { recursive: true });
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
