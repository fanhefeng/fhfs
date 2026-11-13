import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, "assets");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-blink-features=CanvasDrawElement"],
});
const splash = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await splash.goto((process.argv[2] ?? "https://fhfs.fhfs.workers.dev") + "/zh", {
  waitUntil: "networkidle",
});
await splash.waitForTimeout(3500);
await splash.screenshot({ path: path.join(out, "splash-source.png") });
await splash.close();
const page = await browser.newPage({
  viewport: { width: 480, height: 860 },
  deviceScaleFactor: 2,
  colorScheme: "light",
});
await page.addInitScript(() => {
  sessionStorage.setItem("fhfs-overture-seen", "1");
  sessionStorage.setItem("fhfs-splash-seen", "1");
  localStorage.setItem("theme", "light");
});
const records = [];
page.on("pageerror", (e) => console.log("Page error:", e.message));
async function open(slug, name) {
  const url = `${process.argv[2] ?? "https://fhfs.fhfs.workers.dev"}/zh${slug}`;
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await page.goto(url, { waitUntil: "networkidle" });
    if (response.status() === 200) break;
    await page.waitForTimeout(1500);
  }
  if (response.status() !== 200) throw new Error(`${url}: ${response.status()}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  const text = await page.locator("main").innerText();
  records.push({
    name,
    url,
    status: response.status(),
    title: await page.title(),
    excerpt: text.slice(0, 1800),
  });
  await writeFile(path.join(out, "sources.json"), JSON.stringify(records, null, 2));
  console.log(name, text.slice(0, 1700));
}
try {
  await open("", "home");
  const avatar = await page
    .locator(".op svg")
    .evaluateAll((nodes) => nodes.find((n) => n.querySelector("[data-c]"))?.outerHTML);
  if (avatar)
    await writeFile(
      path.join(out, "avatar.svg"),
      avatar.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"'),
    );
  await open("/blog", "writing");
  await open("/software", "software");
  await open("/lab/magazine", "magazine-page");
  await page.locator(".mag-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.locator(".mag-stage").screenshot({ path: path.join(out, "magazine.png") });
  await open("/lab/grove", "grove-page");
  await page.locator(".gv-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  const bounds = await page.locator(".gv-stage").evaluate((el) => ({
    top: el.getBoundingClientRect().top + scrollY,
    height: el.offsetHeight,
    viewport: innerHeight,
  }));
  await page.evaluate((b) => scrollTo(0, b.top + (b.height - b.viewport) * 0.78), bounds);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, "grove.png") });
  console.log(
    "grove elements",
    await page.locator("canvas").evaluateAll((xs) =>
      xs.map((e) => ({
        class: e.className,
        box: e.getBoundingClientRect().toJSON(),
        parent: e.parentElement.className,
      })),
    ),
  );
  await writeFile(path.join(out, "sources.json"), JSON.stringify(records, null, 2));
} finally {
  await browser.close();
}
