import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { serve } from "./server.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(await readFile(path.join(root, "brief.json"), "utf8"));
const mode = process.argv[2] ?? "full";
const dir = path.join(root, "output");
await mkdir(dir, { recursive: true });
const server = await serve(4190);
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4190", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.filmReady === true);
  async function png(t) {
    return Buffer.from(
      await page.evaluate(async (time) => {
        await window.renderFrame(time);
        return document.querySelector("canvas").toDataURL("image/png").split(",")[1];
      }, t),
      "base64",
    );
  }
  if (mode === "proofs") {
    const times = [1.8, 4.9, 8.9, 12.8, 15.8, 18.8, 21.9, 23.5, 24.9667];
    const tiles = [];
    for (let i = 0; i < times.length; i++) {
      const image = await png(times[i]);
      await writeFile(path.join(dir, `proof-${times[i]}.png`), image);
      tiles.push({
        input: await sharp(image).resize(324, 576).png().toBuffer(),
        left: (i % 3) * 324,
        top: Math.floor(i / 3) * 576,
      });
    }
    await sharp({ create: { width: 972, height: 1728, channels: 3, background: "#0e0e11" } })
      .composite(tiles)
      .png()
      .toFile(path.join(dir, "storyboard.png"));
    // The same requested frame must produce the exact same PNG bytes.
    const first = await png(15.8),
      second = await png(15.8);
    if (!first.equals(second)) throw new Error("Non-deterministic frame");
    await writeFile(
      path.join(dir, "proof-report.json"),
      JSON.stringify(
        { width: 1080, height: 1920, times, deterministic: true, browserErrors: errors },
        null,
        2,
      ),
    );
    console.log("Rendered 9 full-resolution proofs; determinism verified.");
  } else {
    const start = mode === "sample" ? 11.7 : 0,
      duration = mode === "sample" ? 5.8 : config.duration;
    const output = path.join(dir, mode === "sample" ? "sample.mp4" : "fhfs-promo-vertical.mp4");
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      String(config.fps),
      "-i",
      "pipe:0",
      "-ss",
      String(start),
      "-i",
      path.join(dir, "score.wav"),
      "-t",
      String(duration),
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=out_color_matrix=bt709:out_range=tv",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-colorspace",
      "bt709",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-metadata",
      "title=fhf’s · 留一盏自己的灯",
      "-metadata",
      "comment=Site visuals: fhf. Original synthesized score. Neon adapted from Espandero, Seb’s.svg, CC BY-SA 4.0. See promo/CREDITS.md.",
      output,
    ];
    const ffmpeg = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
    const finished = once(ffmpeg, "close");
    let streamError;
    ffmpeg.stdin.on("error", (e) => {
      streamError = e;
    });
    const frames = Math.round(duration * config.fps);
    for (let i = 0; i < frames; i++) {
      const bytes = await png(start + i / config.fps);
      if (streamError) throw streamError;
      if (!ffmpeg.stdin.write(bytes)) await once(ffmpeg.stdin, "drain");
      if (i % 60 === 0) console.log(`Rendered ${i}/${frames} frames`);
    }
    ffmpeg.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    console.log(`Exported ${output}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join("\n")}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
