import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const dir = new URL("./assets/grove-frames/", import.meta.url);
await mkdir(dir, { recursive: true });
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await p.addInitScript(() => {
  sessionStorage.setItem("fhfs-overture-seen", "1");
  sessionStorage.setItem("fhfs-splash-seen", "1");
});
try {
  await p.goto("http://127.0.0.1:4173/zh/lab/grove", { waitUntil: "networkidle" });
  await p.locator(".gv-stage").scrollIntoViewIfNeeded();
  await p.waitForTimeout(1800);
  const bounds = await p.locator(".gv-stage").evaluate((el) => ({
    top: el.getBoundingClientRect().top + scrollY,
    travel: el.offsetHeight - innerHeight,
  }));
  await p.addStyleTag({
    content:
      '.gv-copy,.gv-act,.gv-hint,.gv-dress,header,nav,[role="navigation"]{visibility:hidden!important}',
  });
  // Frames are captured once; the offline film reads this fixed sequence.
  for (let i = 0; i < 90; i++) {
    const u = 0.2 + (i / 89) * 0.64;
    await p.evaluate(
      ({ bounds, u }) => scrollTo({ top: bounds.top + bounds.travel * u, behavior: "instant" }),
      { bounds, u },
    );
    await p.waitForTimeout(i === 0 ? 1100 : 80);
    await p.screenshot({
      path: new URL(`${String(i).padStart(3, "0")}.jpg`, dir).pathname,
      type: "jpeg",
      quality: 93,
    });
    if (i % 15 === 0) console.log(`Grove ${i}/90`);
  }
} finally {
  await b.close();
}
