import { writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const rate = 48000,
  duration = 25,
  n = rate * duration;
const left = new Float64Array(n),
  right = new Float64Array(n);
let seed = 20261105;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
function note(at, midi, gain = 0.1, pan = 0, length = 2.5) {
  const f = hz(midi),
    begin = Math.floor(at * rate),
    len = Math.min(n - begin, Math.floor(length * rate));
  for (let i = 0; i < len; i++) {
    const t = i / rate,
      attack = 1 - Math.exp(-t * 125),
      tail = Math.min(1, (length - t) * 8);
    const fundamental = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 1.45);
    const overtone =
      0.22 * Math.sin(2 * Math.PI * f * 2.003 * t) * Math.exp(-t / 0.65) +
      0.055 * Math.sin(2 * Math.PI * f * 3.997 * t) * Math.exp(-t / 0.26);
    const v = (fundamental + overtone) * attack * tail * gain;
    left[begin + i] += v * Math.sqrt((1 - pan) / 2);
    right[begin + i] += v * Math.sqrt((1 + pan) / 2);
  }
}
function pad(at, chord, gain = 0.018) {
  for (const m of chord) {
    const f = hz(m),
      begin = Math.floor(at * rate);
    for (let i = 0; i < rate * 3.4 && begin + i < n; i++) {
      const t = i / rate;
      const env = (1 - Math.exp(-t * 4)) * Math.exp(-t * 0.75) * Math.min(1, (3.4 - t) * 3);
      left[begin + i] += Math.sin(2 * Math.PI * f * 0.999 * t) * gain * env;
      right[begin + i] += Math.sin(2 * Math.PI * f * 1.001 * t) * gain * env;
    }
  }
}
function percussion(at, kind, gain) {
  const start = Math.round(at * rate),
    len = rate * (kind === "kick" ? 0.28 : 0.1);
  let previous = 0;
  for (let i = 0; i < len && start + i < n; i++) {
    const t = i / rate;
    let v;
    if (kind === "kick")
      v = Math.sin(2 * Math.PI * (48 * t + 4.8 * (1 - Math.exp(-t * 28)))) * Math.exp(-t * 19);
    else {
      const noise = rnd();
      v = (noise - previous) * Math.exp(-t * 70);
      previous = noise;
    }
    left[start + i] += v * gain;
    right[start + i] += v * gain;
  }
}
const chords = [
  [53, 57, 60, 64],
  [57, 60, 64, 67],
  [48, 55, 59, 64],
  [43, 55, 59, 62],
  [53, 57, 60, 64],
  [57, 60, 64, 67],
  [48, 55, 59, 64],
  [43, 55, 59, 62],
  [53, 57, 60, 64],
  [48, 55, 60, 64],
];
for (let bar = 0; bar < 10; bar++) {
  const at = bar * 2.5 + 0.04,
    chord = chords[bar];
  pad(at, chord);
  chord.forEach((m, i) => note(at + i * 0.028, m, 0.075, (i - 1.5) * 0.28, 3.2));
  if (bar > 0 && bar < 9) {
    for (let j = 0; j < 8; j++) {
      const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
      note(at + j * 0.3125, chord[pattern[j]] + 12, 0.042, Math.sin(j) * 0.4, 1.5);
    }
  }
  if (bar >= 2 && bar < 9) {
    for (let beat = 0; beat < 4; beat++) {
      percussion(at + beat * 0.625, beat % 2 === 0 ? "kick" : "hat", beat % 2 === 0 ? 0.09 : 0.014);
      percussion(at + beat * 0.625 + 0.3125, "hat", 0.008);
    }
  }
}
[
  [0.62, 76],
  [1.25, 72],
  [2.2, 69],
  [4.1, 72],
  [5.05, 76],
  [6.3, 79],
  [8.2, 74],
  [9.45, 72],
  [11.8, 76],
  [13.1, 79],
  [14.35, 76],
  [15.6, 74],
  [17.8, 72],
  [19.05, 69],
  [21.3, 67],
  [22.5, 72],
].forEach(([t, m], i) => note(t, m, 0.058, i % 2 ? 0.22 : -0.22, 2.1));
// Light, non-vocal paper swishes at the chapter cuts.
for (const at of [3.7, 7.7, 11.7, 17.5, 21]) {
  const start = Math.floor((at - 0.16) * rate);
  let filtered = 0;
  for (let i = 0; i < rate * 0.32; i++) {
    filtered = filtered * 0.88 + rnd() * 0.12;
    const v = filtered * Math.sin((Math.PI * i) / (rate * 0.32)) * 0.07;
    left[start + i] += v;
    right[start + i] += v * 0.8;
  }
}
// A deterministic small room, applied only to the source mix.
const dryL = left.slice(),
  dryR = right.slice();
for (const [delay, gain] of [
  [0.111, 0.16],
  [0.193, 0.12],
  [0.281, 0.085],
  [0.419, 0.055],
]) {
  const offset = Math.floor(delay * rate);
  for (let i = offset; i < n; i++) {
    left[i] += dryR[i - offset] * gain;
    right[i] += dryL[i - offset] * gain;
  }
}
const pcm = Buffer.alloc(n * 4 + 44);
pcm.write("RIFF");
pcm.writeUInt32LE(pcm.length - 8, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(rate, 24);
pcm.writeUInt32LE(rate * 4, 28);
pcm.writeUInt16LE(4, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  const t = i / rate;
  const fade = Math.min(1, t / 0.1) * Math.min(1, Math.max(0, (25 - t) / 1.2));
  pcm.writeInt16LE(Math.round(Math.tanh(left[i] * 1.4) * fade * 26000), 44 + i * 4);
  pcm.writeInt16LE(Math.round(Math.tanh(right[i] * 1.4) * fade * 26000), 46 + i * 4);
}
const output = new URL("./output/", import.meta.url);
await mkdir(output, { recursive: true });
const raw = new URL("score-raw.wav", output);
await writeFile(raw, pcm);
const result = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    raw.pathname,
    "-af",
    "loudnorm=I=-18:TP=-1.5:LRA=8",
    "-ar",
    "48000",
    new URL("score.wav", output).pathname,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) throw new Error("Audio mastering failed");
console.log("Composed and mastered 25 s original stereo score.");
