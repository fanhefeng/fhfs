import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vite-plus/test";
import { prepareResponsiveImages } from "../../../scripts/responsive-images.mjs";

describe("responsive image build", () => {
  it("writes smaller hashed candidates at their true widths and retains the original", async () => {
    const root = await mkdtemp(join(tmpdir(), "fhfs-responsive-"));
    try {
      await mkdir(join(root, "public/films"), { recursive: true });
      await mkdir(join(root, "src/lib"), { recursive: true });
      const bytes = await sharp(
        Buffer.from(
          '<svg width="1400" height="900"><defs><linearGradient id="g"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="1400" height="900" fill="url(#g)"/></svg>',
        ),
      )
        .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
        .toBuffer();
      await writeFile(join(root, "public/films/sample.jpg"), bytes);
      const images = await prepareResponsiveImages(root, {
        files: { "/films/sample.jpg": "aaaaaaaa", "/music/ignore.jpg": "bbbbbbbb" },
        sets: {},
      });
      const candidates = images["/films/sample.aaaaaaaa.jpg"].split(", ");
      expect(candidates.at(-1)).toBe("/films/sample.aaaaaaaa.jpg 1400w");
      expect(candidates.length).toBeGreaterThan(1);
      for (const candidate of candidates.slice(0, -1)) {
        const [url, descriptor] = candidate.split(" ");
        const data = await readFile(join(root, ".generated/public", url));
        const metadata = await sharp(data).metadata();
        expect(descriptor).toBe(`${metadata.width}w`);
        expect(metadata.width).toBeLessThan(1400);
        expect(data.length).toBeLessThan(bytes.length);
        expect(url).toContain(createHash("sha256").update(data).digest("hex").slice(0, 8));
      }
      expect(await readFile(join(root, "public/films/sample.jpg"))).toEqual(bytes);
      expect(
        JSON.parse(await readFile(join(root, "src/lib/responsive-images.gen.json"), "utf8")),
      ).toEqual(images);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
