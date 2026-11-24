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

test("the admin login exposes its installation manifest and same-origin icons", async ({
  page,
}) => {
  await page.goto("/admin/login");
  await expect(page.locator("link[rel='manifest']")).toHaveAttribute(
    "href",
    "/admin/manifest.webmanifest",
  );
  await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute(
    "href",
    "/admin/apple-icon",
  );
  const response = await page.request.get("/admin/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest = await response.json();
  expect(manifest.start_url).toBe("/admin");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/admin/apple-icon", sizes: "180x180", type: "image/png" },
    ]),
  );
  for (const { src, type } of manifest.icons) {
    const icon = await page.request.get(src);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain(type);
  }
});

test("collapsing a new record preserves edits until the form is reset", async ({ page }) => {
  await authenticate(page);
  await page.goto("/admin/apps", { waitUntil: "networkidle" });
  const create = page.getByRole("button", { name: "新软件", exact: true });
  await create.click();
  const name = page.getByRole("textbox", { name: "名字", exact: true });
  await name.fill("未保存的软件名称");
  await page.getByRole("button", { name: "收起", exact: true }).click();
  await expect(name).toBeHidden();
  await create.click();
  await expect(name).toHaveValue("未保存的软件名称");
  await page.getByRole("button", { name: "取消本次编辑", exact: true }).click();
  await expect(name).toHaveValue("");
});

test("mobile admin navigation keeps keyboard focus in the drawer and restores it on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await authenticate(page);
  await page.goto("/admin/posts/new", { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: "板块", exact: true });
  await trigger.press("Enter");
  const drawer = page.getByRole("dialog", { name: "内容板块" });
  await expect(drawer.getByRole("button", { name: "关闭" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(drawer.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

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

test("signing in loads the sidebar counts without a manual refresh", async ({ page }) => {
  await newPost(page, "login-count");
  const draft = page.getByRole("checkbox", { name: /草稿/ });
  await draft.press("Space");
  await expect(draft).toBeChecked();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${session.prefix}-login-count/zh/?$`));
  await page.context().clearCookies();

  await page.goto("/admin/login");
  await page.getByLabel("密码", { exact: true }).fill(session.password);
  await page.getByRole("button", { name: "进入", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/?$/);
  const dashboardPosts = page.getByRole("main").getByRole("link", { name: /^文章 / });
  const count = (await dashboardPosts.innerText()).match(/(\d+)\s*篇/)?.[1];
  expect(Number(count)).toBeGreaterThan(0);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: /^文章 / }),
  ).toHaveAccessibleName(new RegExp(`^文章 ${count}\\s*篇$`));
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

test("a pending save locks editing, rejects duplicate submits and unlocks intact after failure", async ({
  page,
}) => {
  await newPost(page, "save-lock");
  await authenticate(page, true);
  const title = page.getByLabel("标题", { exact: true });
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  const form = body.locator("xpath=ancestor::form");
  let submissions = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      submissions++;
      await held;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect.poll(() => submissions).toBe(1);
    await expect(title).toBeDisabled();
    await expect(body).toBeDisabled();
    await expect(form.locator("fieldset")).toHaveAttribute("inert", "");
    await expect(page.getByText("正在保存，编辑暂时锁定。", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "取消本次编辑", exact: true })).toBeDisabled();

    // Native validation skips disabled fields. A second programmatic submit
    // still must not dispatch an empty snapshot or queue another mutation.
    await form.evaluate((element) => {
      (element as HTMLFormElement).requestSubmit();
      (element as HTMLFormElement).reset();
    });
    expect(submissions).toBe(1);
    await expect(body).toHaveValue("仅存在于隔离测试数据库。");
  } finally {
    release();
  }

  await expect(page.getByText(/登录已过期/)).toBeVisible();
  await expect(body).toBeEnabled();
  expect(submissions).toBe(1);
  await expect(title).toHaveValue("新站隔离浏览器测试");
  await expect(body).toHaveValue("仅存在于隔离测试数据库。");
  await expect(page.getByRole("button", { name: "保存", exact: true })).toBeFocused();
  await page.unroute("**/*");

  await authenticate(page);
  await title.fill("失败后继续编辑并保存");
  await body.fill("解锁后的正文仍能正常保存。");
  const draft = page.getByRole("checkbox", { name: /草稿/ });
  await draft.press("Space");
  await expect(draft).toBeChecked();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${session.prefix}-save-lock/zh/?$`));
  await expect(title).toHaveValue("失败后继续编辑并保存");
  await expect(body).toHaveValue("解锁后的正文仍能正常保存。");
  await expect(page.getByLabel("slug", { exact: true })).toHaveAttribute("readonly", "");

  // The separate delete form is part of the same editor lock, including an
  // already-armed confirmation and script-triggered native submission.
  await authenticate(page, true);
  await page.getByRole("button", { name: /^删除这篇/ }).click();
  const confirmDelete = page.getByRole("button", { name: "确认删除", exact: true });
  const backOut = page.getByRole("button", { name: "算了", exact: true });
  const deleteForm = confirmDelete.locator("xpath=ancestor::form");
  await expect(backOut).toBeFocused();
  submissions = 0;
  let releaseAgain!: () => void;
  const heldAgain = new Promise<void>((resolve) => {
    releaseAgain = resolve;
  });
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") {
      submissions++;
      await heldAgain;
    }
    await route.continue();
  });
  try {
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect.poll(() => submissions).toBe(1);
    await expect(confirmDelete).toBeDisabled();
    await expect(backOut).toBeDisabled();
    await deleteForm.evaluate((element) => (element as HTMLFormElement).requestSubmit());
    expect(submissions).toBe(1);
  } finally {
    releaseAgain();
  }
  await expect(page.getByText(/登录已过期/)).toBeVisible();
  await expect(confirmDelete).toBeEnabled();
  expect(submissions).toBe(1);
  await page.unroute("**/*");
  await backOut.click();
  await expect(page.getByRole("button", { name: /^删除这篇/ })).toBeFocused();
  await expect(body).toHaveValue("解锁后的正文仍能正常保存。");
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

test("save feedback clears after editing and a failed delete keeps the editor", async ({
  page,
}) => {
  await newPost(page, "feedback");
  await page.getByRole("checkbox", { name: /草稿/ }).press("Space");
  const save = page.getByRole("button", { name: "保存", exact: true });
  await save.click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${session.prefix}-feedback/zh/?$`));
  await save.click();
  const saved = page.getByRole("status").filter({ hasText: "已保存。前台最多 30 秒更新。" });
  await expect(saved).toBeVisible();
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  await body.fill("保存后继续输入的文字应当保留。");
  await expect(saved).toBeHidden();
  await page.getByRole("button", { name: /^删除这篇/ }).click();
  await page.route("**/*", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("暂时无法确认删除结果");
  await expect(body).toHaveValue("保存后继续输入的文字应当保留。");
  await expect(page.getByRole("button", { name: "确认删除", exact: true })).toBeEnabled();
});
