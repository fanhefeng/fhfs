const config = await (await fetch("/brief.json")).json();
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const { width: W, height: H, palette: P } = config;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const progress = (t, start, duration) => clamp((t - start) / duration);
// Match the site's EASE.default (power3.out) and EASE.travel (power2.inOut).
const out = (t) => 1 - (1 - clamp(t)) ** 4;
const travel = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const lerp = (a, b, t) => a + (b - a) * t;
const images = {};
const imageNames = ["home", "writing", "software", "magazine", "neon", "avatar", "wall"];
await Promise.all(
  imageNames.map(async (name) => {
    const img = new Image();
    img.src = `/assets/${name}.png`;
    await img.decode();
    images[name] = img;
  }),
);
const copy =
  config.scenes.flatMap((s) => s.lines).join("") +
  "喜欢音乐游戏电影文章软件动效实验来自真实网站把日常装订成册随时来坐坐程序生成的苔藓树根霓虹图形改编自一颗种子一整个世界随手记上海素材与来源见你好嗨";
await Promise.all(
  [400, 600, 650, 700].map((weight) =>
    document.fonts.load(`${weight} 90px "FHFS Rounded SC"`, copy),
  ),
);
await Promise.all(
  ["600 90px Nunito", "400 90px Josefin", "400 30px Geist"].map((font) =>
    document.fonts.load(font),
  ),
);
await document.fonts.ready;
// Static seeded paper grain; never uses system time or unseeded randomness.
let seed = config.seed;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = document.createElement("canvas");
noise.width = noise.height = 180;
const nc = noise.getContext("2d");
const pixels = nc.createImageData(180, 180);
for (let i = 0; i < pixels.data.length; i += 4) {
  const n = Math.floor(random() * 255);
  pixels.data.set([n, n, n, 25], i);
}
nc.putImageData(pixels, 0, 0);
const grain = ctx.createPattern(noise, "repeat");
function rect(x, y, w, h, r = 0) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function fill(color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}
function text(
  str,
  x,
  y,
  size = 42,
  color = P.ink,
  weight = 600,
  family = 'Nunito, "FHFS Rounded SC"',
  align = "left",
) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, x, y);
  ctx.textAlign = "left";
}
function small(str, x, y, color = P.amber, size = 24) {
  text(str, x, y, size, color, 400, 'Geist, "FHFS Rounded SC"');
}
function line(str, x, y, size, t, delay, color = P.ink) {
  const u = out(progress(t, delay, 0.86));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 8, y - size * 1.08, size * 12, size * 1.36);
  ctx.clip();
  text(str, x, y + (1 - u) * size * 1.3, size, color, 650);
  ctx.restore();
}
function title(scene, t, color = P.ink) {
  small(scene.label, 82, 258, color === P.ink ? P.amber : P.blue, 23);
  scene.lines.forEach((s, i) => line(s, 78, 390 + i * 116, 93, t, 0.05 + i * 0.12, color));
}
function base(dark = false) {
  fill(dark ? P.night : P.paper);
  const glow = ctx.createRadialGradient(700, 600, 100, 600, 600, 1400);
  glow.addColorStop(0, dark ? "#1c234c88" : "#e8d2b32d");
  glow.addColorStop(1, dark ? "#0e0e1100" : "#faf9f600");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = dark ? 0.17 : 0.26;
  ctx.fillStyle = grain;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function frame(t, dark = false) {
  const c = dark ? "#ffffff67" : "#1a1a1a65";
  small("fhf’s", 82, 160, dark ? "#e5e5eb" : P.ink, 29);
  small("A PERSONAL WORLD", 426, 160, c, 22);
  ctx.fillStyle = dark ? "#ffffff21" : "#1a1a1a19";
  ctx.fillRect(82, 193, 820, 1);
  ctx.fillStyle = c;
  ctx.fillRect(82, 1730, 820, 1);
  ctx.fillStyle = dark ? P.blue : P.amber;
  ctx.fillRect(82, 1730, 820 * clamp(t / 25), 2);
  small("SHANGHAI / EST. IN CURIOSITY", 82, 1780, c, 19);
}
function shadowCard(
  img,
  x,
  y,
  w,
  h,
  { angle = 0, scale = 1, cropY = 0, sourceH = 0, radius = 26, fillColor = "#ffffff" } = {},
) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.shadowColor = "#35231430";
  ctx.shadowBlur = 56;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = fillColor;
  rect(0, 0, w, h, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  rect(0, 0, w, h, radius);
  ctx.clip();
  const sh = sourceH || img.height;
  ctx.drawImage(img, 0, cropY, img.width, sh, 0, 0, w, h);
  ctx.restore();
}
function sticker(str, x, y, angle = 0, color = "#f0e8d6") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = "#44331b1c";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = color;
  rect(-100, -44, 200, 88, 6);
  ctx.fill();
  ctx.shadowColor = "transparent";
  text(str, 0, 15, 42, P.ink, 600, undefined, "center");
  ctx.restore();
}
const groveFrames = new Map();
async function groveFrame(i) {
  i = clamp(Math.floor(i), 0, 89);
  if (!groveFrames.has(i)) {
    const response = await fetch(`/assets/grove-frames/${String(i).padStart(3, "0")}.jpg`);
    if (!response.ok) throw new Error(`Missing grove frame ${i}`);
    groveFrames.set(i, await createImageBitmap(await response.blob()));
  }
  while (groveFrames.size > 4) {
    const key = groveFrames.keys().next().value;
    if (key === i) break;
    groveFrames.get(key).close();
    groveFrames.delete(key);
  }
  return groveFrames.get(i);
}
function light(s, t) {
  base(true);
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.drawImage(images.wall, 0, -200, 1080, 3000);
  ctx.restore();
  frame(t, true);
  small(s.label, 82, 278, P.blue, 22);
  line(s.lines[0], 82, 434, 90, t, 0.05, "#faf9f6");
  line(s.lines[1], 82, 551, 90, t, 0.3, "#faf9f6");
  const u = out(progress(t, 0.3, 1.4));
  ctx.save();
  ctx.globalAlpha = 0.12 + 0.88 * u;
  const size = 880 + 36 * progress(t, 0, 3.7);
  ctx.drawImage(images.neon, (W - size) / 2 - 28, 638 - size * 0.1, size, size);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = out(progress(t, 0.9, 0.9));
  text("欢迎来到我的小世界", 82, 1600, 43, "#dce2f5", 400);
  ctx.restore();
}
function hello(s, t) {
  base();
  frame(t + s.start);
  title(s, t);
  const u = out(progress(t, 0.15, 1.1));
  shadowCard(images.home, 122, 610 + (1 - u) * 330, 766, 1012, {
    angle: lerp(-0.04, 0.015, u),
    cropY: 0,
    sourceH: 1268,
  });
  ctx.save();
  ctx.globalAlpha = out(progress(t, 0.65, 0.8));
  sticker("嗨，我是 fhf", 695, 625, -0.075, "#eee6d7");
  ctx.restore();
}
function work(s, t) {
  base();
  frame(t + s.start);
  title(s, t);
  const u = out(progress(t, 0.15, 0.95));
  shadowCard(images.writing, 60 + (1 - u) * -500, 660, 700, 980, {
    angle: -0.055,
    cropY: 270,
    sourceH: 1344,
  });
  const v = out(progress(t, 0.65, 1.1));
  shadowCard(images.software, 310 + (1 - v) * 800, 832, 670, 1000, {
    angle: 0.055,
    cropY: 55,
    sourceH: 1433,
  });
  ctx.save();
  ctx.globalAlpha = out(progress(t, 1, 0.8));
  sticker("自研软件", 690, 780, 0.07, "#eddec8");
  ctx.restore();
  // Bottom fade leaves breathing room for platform captions.
  const fade = ctx.createLinearGradient(0, 1580, 0, 1810);
  fade.addColorStop(0, "#faf9f600");
  fade.addColorStop(1, P.paper);
  ctx.fillStyle = fade;
  ctx.fillRect(0, 1580, W, 340);
}
function play(s, t, grove) {
  base(true);
  frame(t + s.start, true);
  const mix = travel(progress(t, 1.5, 0.65));
  if (mix < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - mix;
    title(s, t, "#faf9f6");
    const u = out(progress(t, 0.15, 1));
    shadowCard(images.magazine, 116, 635, 775, 1118, {
      angle: -0.05 + 0.06 * progress(t, 0, 2),
      scale: 0.92 + 0.08 * u,
    });
    ctx.restore();
  }
  if (mix > 0) {
    ctx.save();
    ctx.globalAlpha = mix;
    ctx.drawImage(grove, 0, 0, W, H);
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "#090e16e8");
    shade.addColorStop(0.37, "#090e1640");
    shade.addColorStop(0.65, "#090e1600");
    shade.addColorStop(1, "#090e16ce");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
    frame(t + s.start, true);
    title(s, Math.max(1, t), "#faf9f6");
    text("一颗种子，一整个世界。", 82, 1580, 45, "#faf9f6", 500);
    small("程序生成的苔藓树根 / 动效实验", 82, 1640, "#dce5d2", 24);
    ctx.restore();
  }
}
function life(s, t) {
  base();
  frame(t + s.start);
  title(s, t);
  const u = out(progress(t, 0.1, 0.9));
  ctx.save();
  ctx.translate(520, 1100 + (1 - u) * 280);
  ctx.rotate(-0.05 + Math.sin(t * 0.5) * 0.015);
  ctx.shadowColor = "#56412b25";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 25;
  ctx.fillStyle = "#fffefa";
  rect(-405, -390, 810, 810, 8);
  ctx.fill();
  ctx.shadowColor = "transparent";
  small("FIELD NOTES / 随手记", -340, -300, "#8a806f", 23);
  ctx.strokeStyle = "#dfd9cc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-340, -260);
  ctx.lineTo(340, -260);
  ctx.stroke();
  text("音乐、游戏、电影，", -340, -150, 52, P.ink, 600);
  text("还有它们之间的", -340, -65, 52, P.ink, 600);
  text("那些小事。", -340, 20, 52, P.ink, 600);
  ctx.drawImage(images.avatar, 20, 32, 340, 340);
  small("fhf / 上海", -340, 316, "#807565", 24);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = out(progress(t, 0.55, 0.9));
  sticker("音乐", 180, 1490, -0.08, "#e5e9f0");
  sticker("游戏", 480, 1565, 0.055, "#e8e4d2");
  sticker("电影", 780, 1470, -0.04, "#ecdacd");
  ctx.restore();
}
function invite(s, t) {
  base(true);
  frame(t + s.start, true);
  small(s.label, 82, 280, P.blue, 23);
  line(s.lines[0], 82, 440, 90, t, 0.05, "#faf9f6");
  line(s.lines[1], 82, 558, 90, t, 0.2, "#faf9f6");
  const u = out(progress(t, 0.2, 1.1));
  ctx.save();
  ctx.globalAlpha = u;
  ctx.drawImage(images.neon, 225, 635 + (1 - u) * 80, 590, 590);
  ctx.restore();
  text("文章 · 软件 · 动效 · 生活", 520, 1275, 38, "#c7cedc", 400, undefined, "center");
  ctx.save();
  ctx.globalAlpha = out(progress(t, 0.55, 0.8));
  ctx.fillStyle = "#f8f7f2";
  rect(82, 1350, 820, 116, 58);
  ctx.fill();
  text(config.url, 492, 1424, 39, P.ink, 600, "Nunito", "center");
  ctx.restore();
  text("随时来坐坐。", 520, 1565, 45, "#faf9f6", 500, undefined, "center");
  small("霓虹图形：Espandero / Seb’s.svg 改编", 82, 1640, "#b2b9cc", 19);
  small("CC BY-SA 4.0 · 素材与来源见 CREDITS.md", 82, 1676, "#b2b9cc", 19);
}
const painters = { light, hello, work, play, life, invite };
async function draw(t) {
  t = clamp(t, 0, 24.9999);
  const index = config.scenes.findIndex((s) => t >= s.start && t < s.end);
  const s = config.scenes[index];
  const local = t - s.start;
  const grove = s.name === "play" ? await groveFrame(progress(local, 1.85, 3.5) * 89) : null;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  painters[s.name](s, local, grove);
  ctx.restore();
  // A brief soft veil between chapters, lifted with the site's travel curve.
  if (index > 0 && local < 0.28) {
    ctx.save();
    ctx.globalAlpha = (1 - travel(local / 0.28)) * 0.92;
    ctx.fillStyle = s.name === "play" || s.name === "invite" ? P.night : P.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}
window.renderFrame = draw;
window.filmConfig = config;
await draw(0);
window.filmReady = true;
const button = document.querySelector("#play"),
  restart = document.querySelector("#restart"),
  seek = document.querySelector("#seek"),
  clock = document.querySelector("#time"),
  audio = document.querySelector("audio");
let playing = false,
  current = 0,
  start = 0,
  busy = false;
function display() {
  seek.value = current;
  clock.textContent = `00:${String(Math.floor(current)).padStart(2, "0")} / 00:25`;
}
async function tick(now) {
  if (!playing) return;
  current = clamp((now - start) / 1000, 0, 25);
  if (!busy) {
    busy = true;
    await draw(current);
    busy = false;
    display();
  }
  if (current >= 25) {
    playing = false;
    button.textContent = "重新播放";
    audio.pause();
    return;
  }
  requestAnimationFrame(tick);
}
function pause() {
  playing = false;
  audio.pause();
  button.textContent = "继续播放";
}
function resume() {
  if (current >= 25) current = 0;
  playing = true;
  start = performance.now() - current * 1000;
  audio.currentTime = current;
  audio.play().catch(() => {});
  button.textContent = "暂停";
  requestAnimationFrame(tick);
}
button.onclick = () => (playing ? pause() : resume());
restart.onclick = () => {
  pause();
  current = 0;
  resume();
};
seek.oninput = async () => {
  pause();
  current = Number(seek.value);
  await draw(current);
  display();
};
// No autoplay, including for reduced-motion viewers.
