import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";
import { test, expect, type Locator } from "@playwright/test";

let session: { secret: string; prefix: string };
test.beforeAll(async () => {
  session = JSON.parse(await readFile(".e2e/session.json", "utf8"));
});

const readyImage = {
  contentType: "image/svg+xml",
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f4eee1"/></svg>',
};

for (const locale of ["zh", "en"]) {
  test(`${locale} original-image failure can retry without closing the viewer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/films/${session.prefix}-viewer`, { waitUntil: "networkidle" });
    const print = page
      .getByRole("link", { name: locale === "zh" ? /^放大看/ : /^View larger/ })
      .first();
    const source = new URL((await print.getAttribute("href"))!, page.url()).href;
    let fail = true;
    await page.route(source, (route) => (fail ? route.abort() : route.fulfill(readyImage)));
    await print.click();
    const viewer = page.getByRole("dialog");
    await expect(viewer.getByRole("alert")).toBeVisible();
    const retry = viewer.getByRole("button", {
      name: locale === "zh" ? "重新加载" : "Reload image",
      exact: true,
    });
    const original = viewer.getByRole("link", {
      name: locale === "zh" ? "单独打开原图" : "Open original image",
      exact: true,
    });
    await expect(original).toHaveAttribute("href", (await print.getAttribute("href"))!);
    fail = false;
    await retry.click();
    await expect
      .poll(() =>
        viewer
          .locator("img")
          .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await expect(viewer.getByRole("alert")).toHaveCount(0);
    const close = viewer.getByRole("button", {
      name: locale === "zh" ? "关闭" : "Close",
      exact: true,
    });
    await expect(close).toBeFocused();
    await close.click();
    await expect(viewer).toBeHidden();
    await expect(print).toBeFocused();
    await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
  });

  test(`${locale} short-screen search keeps recovery and close reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 320 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(`**/${locale}/search.json`, (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.goto(`/${locale}/about`, { waitUntil: "networkidle" });
    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog");
    const close = palette.getByRole("button", {
      name: locale === "zh" ? "关闭搜索" : "Close search",
      exact: true,
    });
    await expect(palette.getByRole("alert")).toBeVisible();
    await expect(
      palette.getByRole("button", {
        name: locale === "zh" ? "重新加载" : "Reload search content",
        exact: true,
      }),
    ).toBeVisible();
    const bounds = await close.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(320);
    await close.click();
    await expect(palette).toBeHidden();
    await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
  });
}

test("a failed ultra-wide original keeps recovery reachable on a 390 by 320 screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/zh/films/${session.prefix}-viewer`, { waitUntil: "networkidle" });
  const print = page.getByRole("link", { name: /^放大看/ }).first();
  const source = new URL((await print.getAttribute("href"))!, page.url()).href;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let fail = true;
  await page.route(source, async (route) => {
    if (fail) {
      await held;
      await route.abort();
    } else {
      await route.fulfill(readyImage);
    }
  });
  try {
    await print.click();
    const viewer = page.getByRole("dialog");
    // Emulate an ultra-wide still's intrinsic placeholder before the request fails.
    await viewer.locator("img").evaluate((image: HTMLImageElement) => {
      image.width = 12000;
      image.height = 100;
    });
    release();
    const error = viewer.getByRole("alert");
    await expect(error).toContainText("原图没加载出来");
    const recovery = error.locator("..");
    const expectReachable = async (target: Locator, within?: Locator) => {
      await target.scrollIntoViewIfNeeded();
      const bounds = (await target.boundingBox())!;
      expect(bounds).not.toBeNull();
      const clip = within ? (await within.boundingBox())! : { x: 0, y: 0, width: 390, height: 320 };
      expect(bounds.y).toBeGreaterThanOrEqual(Math.max(0, clip.y) - 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(Math.min(320, clip.y + clip.height) + 1);
    };
    await expectReachable(error, recovery);
    const original = viewer.getByRole("link", { name: "单独打开原图", exact: true });
    await expectReachable(original, recovery);
    await original.click({ trial: true });
    const retry = viewer.getByRole("button", { name: "重新加载", exact: true });
    await expectReachable(retry, recovery);
    fail = false;
    await retry.click();
    await expect(error).toHaveCount(0);
    const close = viewer.getByRole("button", { name: "关闭", exact: true });
    await expectReachable(close);
    await close.click();
    await expect(viewer).toBeHidden();
  } finally {
    release();
  }
});

test("an abandoned original-image request cannot fail the next picture", async ({ page }) => {
  await page.goto(`/zh/films/${session.prefix}-viewer`, { waitUntil: "networkidle" });
  const print = page.getByRole("link", { name: /^放大看/ }).first();
  const source = new URL((await print.getAttribute("href"))!, page.url()).href;
  const nextSource = new URL(
    (await page
      .getByRole("link", { name: /^放大看/ })
      .nth(1)
      .getAttribute("href"))!,
    page.url(),
  ).href;
  await page.route(nextSource, (route) => route.fulfill(readyImage));
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(source, async (route) => {
    await held;
    await route.abort().catch(() => {});
  });
  try {
    await print.click();
    const viewer = page.getByRole("dialog");
    await expect(viewer.getByRole("status")).toContainText("正在加载原图");
    await viewer.getByRole("button", { name: "下一张", exact: true }).click();
    await expect
      .poll(() =>
        viewer
          .locator("img")
          .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    release();
    await expect(viewer.getByRole("alert")).toHaveCount(0);
    await expect(viewer.locator("p[aria-live]")).toHaveText(/^2 \/ /);
  } finally {
    release();
  }
});

test("admin fields retain names and a bottom-of-screen Select stays in view", async ({
  page,
  baseURL,
}) => {
  const value = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(session.secret));
  await page.context().addCookies([{ name: "fhfs_admin", value, url: baseURL!, httpOnly: true }]);
  await page.setViewportSize({ width: 390, height: 340 });
  await page.goto("/admin/nav", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "加一间房", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "分组", exact: true }).first()).toBeVisible();

  await page.goto("/admin/chips", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "加一张", exact: true }).click();
  await page.getByRole("button", { name: "加一张", exact: true }).click();
  const papers = page.getByRole("combobox", { name: /第 \d+ 张 · 纸色/ });
  const count = await papers.count();
  expect(count).toBeGreaterThan(0);
  const paper = papers.last();
  await expect(
    page.getByRole("textbox", { name: new RegExp(`第 ${count} 张 · 中文`) }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("textbox", { name: new RegExp(`第 ${count} 张 · English`) }),
  ).toHaveCount(1);
  await paper.scrollIntoViewIfNeeded();
  await paper.press("Enter");
  const menu = page.getByRole("listbox");
  await expect(menu).toBeVisible();
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(341);
  await expect(paper).toHaveAttribute("aria-activedescendant", /-0$/);
  await paper.press("ArrowDown");
  await expect(paper).toHaveAttribute("aria-activedescendant", /-1$/);
  await paper.press("Enter");
  await expect(page.locator(`[name="chip.${count - 1}.tone"]`)).toHaveValue("ink");
  await expect(menu).toBeHidden();
});
