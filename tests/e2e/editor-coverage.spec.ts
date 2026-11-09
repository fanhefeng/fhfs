import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";

let session: { secret: string; prefix: string };
test.beforeAll(async () => {
  session = JSON.parse(await readFile(".e2e/session.json", "utf8"));
});

test.beforeEach(async ({ context, baseURL }) => {
  const value = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(session.secret));
  await context.addCookies([{ name: "fhfs_admin", value, url: baseURL!, httpOnly: true }]);
});

test("the admin modules lead to the corresponding public pages and editors", async ({ page }) => {
  await page.goto("/admin");
  const modules = page.getByRole("main");
  for (const name of ["首页", "文章", "软件", "实验室", "生活", "关于", "简历", "3D 自我介绍"]) {
    await expect(modules.getByRole("link", { name: new RegExp(`^${name}(?: |$)`) })).toBeVisible();
  }
  await modules.getByRole("link", { name: /^首页 / }).click();
  await expect(page.getByRole("link", { name: "看前台" })).toHaveAttribute("href", "/zh");
  await expect(modules.getByRole("link", { name: /^首页文案/ })).toHaveAttribute(
    "href",
    "/admin/copy?ns=home",
  );

  await page.goto("/admin/lab");
  const studies = modules.locator('a[href*="study="]');
  const publicIndex = await page.request.get("/zh/lab");
  const publicSlugs = new Set(
    [...(await publicIndex.text()).matchAll(/href="\/zh\/lab\/([^"#]+)"/g)].map(
      (match) => match[1],
    ),
  );
  await expect(studies).toHaveCount(publicSlugs.size);
  await modules.locator('a[href="/admin/copy?ns=lab&study=changelog"]').click();
  await expect(page.locator('[name="lab.items.changelog.name.zh"]')).toBeVisible();
  await expect(page.locator('[name="lab.items.grove.name.zh"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "看前台" })).toHaveAttribute(
    "href",
    "/zh/lab/changelog",
  );

  await page.goto("/admin/life");
  await modules.getByRole("link", { name: /^不能说的秘密/ }).click();
  await expect(modules.getByRole("heading", { level: 1 })).toContainText("不能说的秘密");
  await expect(modules.locator('a[href="/admin/secrets/kitchen-notes/zh"]')).toContainText(
    "导入稿",
  );
});

for (const { module, slug, publicPath, source } of [
  {
    module: "posts",
    slug: "typescript-decorators",
    publicPath: "/blog",
    source: "ClassMethodDecoratorContext",
  },
  { module: "secrets", slug: "kitchen-notes", publicPath: "/secrets", source: "西红柿" },
]) {
  test(`an imported ${module} entry opens with its Markdown and can be published from the editor`, async ({
    page,
  }) => {
    await page.goto(`/admin/${module}`);
    const editor = `/admin/${module}/${slug}/zh`;
    const row = page.getByRole("main").locator(`a[href="${editor}"]`);
    await expect(row).toContainText("导入稿");
    await row.click();
    await expect(page).toHaveURL(new RegExp(`${editor}/?$`));
    const body = page.locator('textarea[name="bodyMd"]');
    await expect(body).toHaveValue(new RegExp(source));
    await expect(page.locator('[name="isNew"]')).toHaveValue("imported");
    await expect(page.locator('[name="slug"]')).toHaveAttribute("readonly", "");
    await page.waitForFunction(() =>
      Boolean(
        document
          .querySelector<HTMLTextAreaElement>('textarea[name="bodyMd"]')
          ?.form?.style.getPropertyValue("--admin-save-height"),
      ),
    );
    const title = `${session.prefix} 导入稿编辑验证`;
    await page.getByLabel("标题", { exact: true }).fill(title);
    await page.getByLabel("日期", { exact: true }).fill("2026-11-09");
    await body.fill(`${await body.inputValue()}\n\n隔离环境保存成功。`);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator('[name="isNew"]')).toHaveCount(0);
    await expect(body).toHaveValue(/隔离环境保存成功/);

    const response = await page.request.get(`/zh${publicPath}/${slug}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(title);
    expect(html).toContain("隔离环境保存成功。");
    if (module === "posts") {
      expect(html).toContain("https://wangdoc.com/typescript/decorator");
      expect(html).toContain("本篇章节");
    }
  });
}
