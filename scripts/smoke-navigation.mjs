/** Public, read-only navigation checks. No admin actions or database writes. */
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:4173");
assert.ok(
  ["127.0.0.1", "localhost"].includes(base.hostname) ||
    base.origin === "https://fhfs.fhfs.workers.dev",
  "Use a local preview or the production fhfs origin",
);
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
let phase = "startup";

async function ring(locator, visible) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      }),
    )
    .toBe(visible);
}

async function tabTo(page, locator) {
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((element) => element === document.activeElement)) return;
  }
  assert.fail("Navigation trigger is reachable with Tab");
}

try {
  for (const locale of ["zh", "en"]) {
    for (const touch of [false, true]) {
      phase = `${locale} ${touch ? "touch" : "mouse"}`;
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        hasTouch: touch,
        isMobile: touch,
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => sessionStorage.setItem("fhfs-overture-seen", "1"));
      const response = await page.goto(new URL(`/${locale}/about`, base).href, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      const trigger = page.locator('button[aria-controls="island-tray fullnav"]');
      const sheet = page.locator("#fullnav");
      const first = sheet.locator("a[href]").first();
      const press = (locator) => (touch ? locator.tap() : locator.click());

      // Switch from keyboard to a pointer on the already-focused trigger.
      await tabTo(page, trigger);
      await ring(trigger, true);
      await press(trigger);
      await expect(first).toBeFocused();
      await ring(first, false);
      await press(trigger);
      await expect(sheet).toBeHidden();
      await expect(trigger).toBeFocused();
      await ring(trigger, false);

      // A keyboard interaction restores the indicator and the modal's cycle.
      await page.keyboard.press("Enter");
      await expect(first).toBeFocused();
      await ring(first, true);
      await page.keyboard.press("Shift+Tab");
      await expect(sheet.getByRole("button").first()).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(trigger).toBeFocused();
      await ring(trigger, true);
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await expect(trigger).toBeFocused();
      await ring(trigger, true);

      // Even a non-focusable pointer target clears a lingering nav ring.
      await (touch ? page.touchscreen.tap(8, 160) : page.mouse.click(8, 160));
      await ring(trigger, false);
      await page.keyboard.press("Tab");
      await tabTo(page, trigger);
      await ring(trigger, true);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "");
      await page.close();
    }
  }

  for (const [locale, query, prefix, endings] of [
    [
      "zh",
      "窄屏布局",
      "窄屏布局中如何让两个开头相同的搜索结果保持可辨认",
      ["焦点管理", "文字排版"],
    ],
    [
      "en",
      "narrow screens",
      "A practical guide to accessible layouts on narrow screens",
      ["Focus management", "Text wrapping"],
    ],
  ]) {
    phase = `${locale} search title fit at 320px`;
    const page = await browser.newPage({
      viewport: { width: 320, height: 740 },
      hasTouch: locale === "zh",
      isMobile: locale === "zh",
      reducedMotion: "reduce",
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => sessionStorage.setItem("fhfs-overture-seen", "1"));
    const titles = endings.map((ending) => `${prefix} · ${ending}`);
    await page.route(`**/${locale}/search.json`, (route) =>
      route.fulfill({
        json: titles.map((title, i) => ({
          title,
          kind: "post",
          text: "",
          meta: "2026-11-10",
          href: i === 0 ? "/blog" : "/resume",
        })),
      }),
    );
    const response = await page.goto(new URL(`/${locale}/about`, base).href, {
      waitUntil: "networkidle",
    });
    assert.equal(response.status(), 200);
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog");
    const input = dialog.getByRole("combobox");
    await expect(input).toBeFocused();
    await input.fill(query);
    await page.evaluate(() => document.fonts.ready);
    for (const title of titles) {
      const text = dialog.getByText(title, { exact: true });
      await expect(text).toBeVisible();
      assert.equal(
        await text.evaluate(
          (el) => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight,
        ),
        false,
        title,
      );
    }

    const second = dialog.getByRole("option").nth(1);
    if (locale === "zh") await second.tap();
    else {
      await input.press("ArrowDown");
      await expect(second).toHaveAttribute("aria-selected", "true");
      await input.press("Enter");
    }
    await expect(page).toHaveURL(new RegExp(`/${locale}/resume/?$`));
    await expect(dialog).toBeHidden();
    await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
    await page.close();
  }

  assert.deepEqual(errors, []);
  console.log(
    "Verified bilingual navigation and search, unclipped 320px search titles, keyboard and touch selection, and scroll unlock.",
  );
} catch (error) {
  console.error(JSON.stringify({ phase, errors }));
  throw error;
} finally {
  await browser.close();
}
