import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import assert from "node:assert/strict";
import { serve } from "./server.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "output"),
  file = path.join(out, "fhfs-promo-vertical.mp4");
const probe = spawnSync(
  "ffprobe",
  ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
  { encoding: "utf8" },
);
assert.equal(probe.status, 0);
const metadata = JSON.parse(probe.stdout),
  video = metadata.streams.find((s) => s.codec_type === "video"),
  audio = metadata.streams.find((s) => s.codec_type === "audio");
assert.equal(video.width, 1080);
assert.equal(video.height, 1920);
assert.equal(video.codec_name, "h264");
assert.equal(video.pix_fmt, "yuv420p");
assert.equal(video.r_frame_rate, "30/1");
assert.equal(video.nb_frames, "750");
assert.equal(audio.codec_name, "aac");
assert.equal(audio.channels, 2);
assert.equal(Number(metadata.format.duration), 25);
assert.ok(Math.abs(Number(video.duration) - Number(audio.duration)) < 0.04);
const decoded = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], {
  encoding: "utf8",
});
assert.equal(decoded.status, 0);
assert.equal(decoded.stderr, "");
const level = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-i",
    file,
    "-vn",
    "-af",
    "loudnorm=I=-18:TP=-1.5:LRA=8:print_format=json",
    "-f",
    "null",
    "-",
  ],
  { encoding: "utf8" },
);
assert.equal(level.status, 0);
const loudness = JSON.parse(level.stderr.match(/\{[\s\S]*\}/)[0]);
const server = await serve(4190),
  browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4190/watch.html");
  await page.locator("video").evaluate(
    (v) =>
      new Promise((resolve) => {
        if (v.readyState >= 1) resolve();
        else v.addEventListener("loadedmetadata", resolve, { once: true });
      }),
  );
  const times = [1.8, 4.9, 8.9, 12.8, 15.8, 18.8, 21.9, 23.5, 24.9667],
    tiles = [];
  for (let i = 0; i < times.length; i++) {
    const base64 = await page.locator("video").evaluate(async (v, t) => {
      await new Promise((resolve) => {
        v.addEventListener("seeked", resolve, { once: true });
        v.currentTime = t;
      });
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      return c.toDataURL().split(",")[1];
    }, times[i]);
    const png = Buffer.from(base64, "base64");
    await writeFile(path.join(out, `export-${times[i]}.png`), png);
    if (i === 0) await sharp(png).jpeg({ quality: 95 }).toFile(path.join(out, "cover.jpg"));
    tiles.push({
      input: await sharp(png).resize(324, 576).png().toBuffer(),
      left: (i % 3) * 324,
      top: Math.floor(i / 3) * 576,
    });
  }
  await sharp({ create: { width: 972, height: 1728, channels: 3, background: "#0e0e11" } })
    .composite(tiles)
    .png()
    .toFile(path.join(out, "storyboard.png"));
  const playback = await page.locator("video").evaluate(async (v) => {
    v.muted = true;
    v.currentTime = 0;
    const outcome = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Playback timed out")), 35000);
      v.addEventListener(
        "ended",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      v.addEventListener("error", () => reject(new Error(v.error?.message ?? "Media error")), {
        once: true,
      });
    });
    await v.play();
    await outcome;
    const q = v.getVideoPlaybackQuality();
    return {
      ended: v.ended,
      currentTime: v.currentTime,
      decodedFrames: q.totalVideoFrames,
      droppedFrames: q.droppedVideoFrames,
      mediaError: v.error?.message ?? null,
    };
  });
  assert.equal(playback.ended, true);
  assert.equal(playback.mediaError, null);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  // Verify rendering at a timestamp is stable with fonts ready.
  await page.goto("http://127.0.0.1:4190/");
  await page.waitForFunction(() => window.filmReady);
  const deterministic = await page.evaluate(async () => {
    await window.renderFrame(15.8);
    const a = document.querySelector("canvas").toDataURL();
    await window.renderFrame(15.8);
    return a === document.querySelector("canvas").toDataURL();
  });
  assert.equal(deterministic, true);
  assert.deepEqual(errors, []);
  const report = {
    format: {
      width: video.width,
      height: video.height,
      fps: video.r_frame_rate,
      frames: video.nb_frames,
      duration: metadata.format.duration,
      bytes: Number(metadata.format.size),
      video: video.codec_name,
      audio: audio.codec_name,
      pixelFormat: video.pix_fmt,
      sampleRate: audio.sample_rate,
      channels: audio.channels,
    },
    decode: "all frames decoded without errors",
    loudness,
    playback,
    deterministic,
    browserErrors: errors,
    exportedFramesInspected: times,
    sourceInfo: JSON.parse(await readFile(path.join(root, "assets/sources.json"), "utf8")).map(
      ({ name, url, status }) => ({ name, url, status }),
    ),
  };
  await writeFile(path.join(out, "verification.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
