import { test, expect } from "@playwright/test";

for (const locale of ["zh", "en"]) {
  for (const activation of ["pointer", "keyboard"]) {
    test(`${locale} search ${activation} selection closes the modal and releases scrolling`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route(`**/${locale}/search.json`, (route) =>
        route.fulfill({
          json: [
            { kind: "page", title: "Search regression destination", text: "", href: "/resume" },
          ],
        }),
      );
      await page.goto(`/${locale}/about`);
      // The overture spends this key from its client effect, after hydration.
      await page.waitForFunction(() => sessionStorage.getItem("fhfs-overture-seen") === "1");
      await page.keyboard.press("Control+k");
      const palette = page.locator("dialog");
      const input = palette.getByRole("combobox");
      await expect(palette).toBeVisible();
      await input.fill("Search regression destination");
      const result = palette.getByRole("option", { name: /Search regression destination/ });
      await expect(result).toBeVisible();
      if (activation === "pointer") await result.click();
      else await input.press("Enter");

      await expect(page).toHaveURL(new RegExp(`/${locale}/resume/?$`));
      await expect(palette).not.toHaveAttribute("open", "");
      await expect(palette).toBeHidden();
      await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
      await expect(page.locator(".route-veil")).toHaveCSS("visibility", "hidden");

      // Reopening must retain the query, not toggle a stale launcher state.
      // Selecting the current route also closes without needing a route change.
      await page.keyboard.press("Control+k");
      await expect(palette).toBeVisible();
      await expect(input).toHaveValue("Search regression destination");
      await expect(result).toBeVisible();
      await input.press("Enter");
      await expect(palette).toBeHidden();
      await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
      await page.keyboard.press("Control+k");
      await expect(palette).toBeVisible();
      // Chrome uses Escape to clear a non-empty native search field first.
      await input.fill("");
      await input.press("Escape");
      await expect(palette).toBeHidden();
      await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
    });
  }
}
