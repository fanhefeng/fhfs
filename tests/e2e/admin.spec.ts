import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";
import { test, expect, type Page } from "@playwright/test";

let session: { secret: string; password: string; prefix: string };
test.beforeAll(async () => {
  session = JSON.parse(await readFile(".e2e/session.json", "utf8"));
});
async function authenticate(page: Page, expired = false) {
  const value = await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + (expired ? -60 : 3600))
    .sign(new TextEncoder().encode(session.secret));
  await page
    .context()
    .addCookies([
      { name: "fhfs_admin", value, url: "http://localhost:3100", httpOnly: true, sameSite: "Lax" },
    ]);
}
async function newPost(page: Page, suffix: string) {
  await authenticate(page);
  await page.goto("/admin/posts/new");
  await page.getByLabel("slug", { exact: true }).fill(`${session.prefix}-${suffix}`);
  await page.getByLabel("标题", { exact: true }).fill("新站隔离浏览器测试");
  await page.getByLabel("正文（Markdown）", { exact: true }).fill("仅存在于隔离测试数据库。");
}

test("random test password signs in to the native admin", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("密码", { exact: true }).fill(session.password);
  await page.getByRole("button", { name: "进入", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByRole("main")).toBeVisible();
});

test("invalid input and expired sessions keep the unsaved editor", async ({ page }) => {
  await newPost(page, "unsaved");
  await page.getByLabel("日期", { exact: true }).fill("2026-02-30");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByLabel("标题", { exact: true })).toHaveValue("新站隔离浏览器测试");
  await expect(page.getByLabel("正文（Markdown）", { exact: true })).toHaveValue(
    "仅存在于隔离测试数据库。",
  );
  await expect(page.getByRole("alert")).toContainText("日期要写成 YYYY-MM-DD");
  await page.getByLabel("日期", { exact: true }).fill("2026-10-26");
  await authenticate(page, true);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText(/登录已过期/)).toBeVisible();
  await expect(page.getByLabel("正文（Markdown）", { exact: true })).toHaveValue(
    "仅存在于隔离测试数据库。",
  );
});

test("draft save, local upload retention and authenticated preview", async ({ page, request }) => {
  await newPost(page, "draft");
  const draft = page.getByRole("checkbox", { name: /草稿/ });
  await draft.press("Space");
  await expect(draft).toBeChecked();
  await page.route("https://fhfs-media.fhfs.workers.dev/**", async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.includes("/moments/uploads/")) return route.abort();
    const response = await route.fetch({ url: `http://127.0.0.1:8787${url.pathname}` });
    await route.fulfill({ response });
  });
  await page.getByLabel("选择上传的图片").setInputFiles({
    name: "e2e.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  await expect(body).toHaveValue(/\/moments\/uploads\//);
  const mediaPath = (await body.inputValue()).match(/\/moments\/uploads\/[^)\s]+/)![0];
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${session.prefix}-draft/zh/?$`));
  const publicPath = `/zh/blog/${session.prefix}-draft`;
  expect((await request.get(publicPath)).status()).toBe(404);
  const preview = await page.request.get(
    `/admin/preview?kind=post&slug=${session.prefix}-draft&locale=zh`,
  );
  expect(preview.status()).toBe(200);
  expect(await preview.text()).toContain("仅存在于隔离测试数据库");
  expect((await request.get(`http://127.0.0.1:8787${mediaPath}`)).status()).toBe(200);
  await page.request.post("/admin/preview/exit", { headers: { Origin: "http://localhost:3100" } });
  expect((await request.get(publicPath)).status()).toBe(404);
});
