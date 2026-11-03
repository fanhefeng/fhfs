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
  // The sticky bar's measurement is written by an effect, after hydration.
  // SSR fields can be filled before their client handlers have attached.
  await page.waitForFunction(() =>
    Boolean(
      document
        .querySelector<HTMLTextAreaElement>('textarea[name="bodyMd"]')
        ?.form?.style.getPropertyValue("--admin-save-height"),
    ),
  );
  await page.getByLabel("slug", { exact: true }).fill(`${session.prefix}-${suffix}`);
  await page.getByLabel("标题", { exact: true }).fill("新站隔离浏览器测试");
  await page.getByLabel("正文（Markdown）", { exact: true }).fill("仅存在于隔离测试数据库。");
}

declare global {
  interface Window {
    previewRequests: {
      signal?: AbortSignal | null;
      resolve: (response: Response) => void;
    }[];
  }
}

async function controlPreview(page: Page) {
  await page.evaluate(() => {
    const original = window.fetch.bind(window);
    window.previewRequests = [];
    // Deliberately ignore AbortSignal: a late response body must still be harmless.
    window.fetch = (input, init) =>
      String(input) === "/admin/preview/markdown"
        ? new Promise<Response>((resolve) =>
            window.previewRequests.push({ signal: init?.signal, resolve }),
          )
        : original(input, init);
  });
}

test("returning to write invalidates late preview results and preserves the next request", async ({
  page,
}) => {
  await newPost(page, "preview-race");
  await controlPreview(page);
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.previewRequests.length)).toBe(1);
  await page.getByRole("button", { name: "写", exact: true }).click();
  expect(await page.evaluate(() => window.previewRequests[0]!.signal?.aborted)).toBe(true);
  await body.fill("新的未保存正文");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.previewRequests.length)).toBe(2);
  await page.evaluate(() => window.previewRequests[0]!.resolve(new Response("<p>过期的预览</p>")));
  await expect(body).toBeVisible();
  await expect(body).toHaveValue("新的未保存正文");
  await expect(page.getByRole("button", { name: "渲染中…", exact: true })).toBeDisabled();
  await expect(page.getByText("过期的预览", { exact: true })).toHaveCount(0);
  await page.evaluate(() => window.previewRequests[1]!.resolve(new Response("<p>当前的预览</p>")));
  await expect(page.getByText("当前的预览", { exact: true })).toBeVisible();
  await expect(body).toBeHidden();

  await page.evaluate(() =>
    document
      .querySelector<HTMLTextAreaElement>('textarea[name="bodyMd"]')!
      .form!.addEventListener("reset", (e) => e.preventDefault(), { once: true }),
  );
  await page.getByRole("button", { name: "取消本次编辑", exact: true }).click();
  await expect(page.getByText("当前的预览", { exact: true })).toBeVisible();
  await expect(body).toHaveValue("新的未保存正文");
  await page.getByRole("button", { name: "取消本次编辑", exact: true }).click();
  await expect(body).toBeVisible();
  await expect(body).toHaveValue("");
  await expect(page.getByText("当前的预览", { exact: true })).toHaveCount(0);
});

test("reset cancels a pending preview; expired sessions and retries retain editor text", async ({
  page,
}) => {
  await newPost(page, "preview-reset");
  await controlPreview(page);
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.previewRequests.length)).toBe(1);
  await page.getByRole("button", { name: "取消本次编辑", exact: true }).click();
  await expect(body).toHaveValue("");
  await expect
    .poll(() => page.evaluate(() => window.previewRequests[0]!.signal?.aborted))
    .toBe(true);
  await page.evaluate(() => window.previewRequests[0]!.resolve(new Response("", { status: 503 })));
  await expect(page.getByText("预览失败（503）。", { exact: true })).toHaveCount(0);
  await body.fill("会话过期时仍保留");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.evaluate(() => window.previewRequests[1]!.resolve(new Response("", { status: 401 })));
  await expect(
    page.getByText("登录过期了，先在新标签页重新登录，这里的内容不会丢。", { exact: true }),
  ).toBeVisible();
  await expect(body).toHaveValue("会话过期时仍保留");
  await page.getByRole("button", { name: "预览", exact: true }).click();
  await page.evaluate(() => window.previewRequests[2]!.resolve(new Response("<p>重试成功</p>")));
  await expect(page.getByText("重试成功", { exact: true })).toBeVisible();
  await expect(body).toHaveValue("会话过期时仍保留");
});

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
