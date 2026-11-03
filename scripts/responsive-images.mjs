import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

// Covers and column galleries need small candidates; full-size originals stay available.
const widths = [480, 768, 1200];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex").slice(0, 8);

export async function prepareResponsiveImages(root, sourceManifest) {
  const images = {};
  const target = join(root, ".generated/public");
  for (const [url, sourceHash] of Object.entries(sourceManifest.files)) {
    if (!/^\/(films|idols)\/.*\.jpe?g$/i.test(url)) continue;
    const bytes = await readFile(join(root, "public", url));
    const image = sharp(bytes).autoOrient();
    const metadata = await image.metadata();
    const originalWidth = metadata.autoOrient.width;
    const dot = url.lastIndexOf(".");
    const original = `${url.slice(0, dot)}.${sourceHash}${url.slice(dot)}`;
    const candidates = [];
    for (const width of widths.filter((width) => width < originalWidth)) {
      const { data, info } = await image
        .clone()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      // A candidate that costs more bytes than the original is not an optimization.
      if (data.length >= bytes.length) continue;
      const derived = `${url.slice(0, dot)}-${info.width}w.${hash(data)}.jpg`;
      await mkdir(dirname(join(target, derived)), { recursive: true });
      await writeFile(join(target, derived), data);
      candidates.push(`${derived} ${info.width}w`);
    }
    if (candidates.length)
      images[original] = [...candidates, `${original} ${originalWidth}w`].join(", ");
  }
  await writeFile(
    join(root, "src/lib/responsive-images.gen.json"),
    `${JSON.stringify(images, null, 2)}\n`,
  );
  return images;
}
