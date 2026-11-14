import { readFile } from "node:fs/promises";
import { SignJWT } from "jose";
import { test, expect, type Page } from "@playwright/test";

let session: { secret: string };
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

const MEDIA_ORIGIN = "https://fhfs-media.fhfs.workers.dev";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);

function gate() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { held, release };
}

type Upload = {
  id: string;
  batch: string;
  src: string;
  start: ReturnType<typeof gate>;
  put: ReturnType<typeof gate>;
  finish: ReturnType<typeof gate>;
};

/** Hold the real component's HTTP boundaries; no upload operation reaches a server. */
async function controlUploads(page: Page) {
  const uploads: Upload[] = [];
  const transfers: string[] = [];
  const confirmations: string[] = [];
  const cancellations: { batch: string; id?: string }[] = [];
  const origin = new URL(page.url()).origin;
  const cors = {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "PUT, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
  };

  await page.route("**/admin/media/uploads", async (route) => {
    const input = route.request().postDataJSON() as {
      action: string;
      id?: string;
      batch: string;
    };
    if (input.action === "cancel") {
      cancellations.push({ batch: input.batch, id: input.id });
      await route.fulfill({ json: { ok: true } });
      return;
    }
    if (input.action === "start" && input.id) {
      const upload: Upload = {
        id: input.id,
        batch: input.batch,
        src: `${MEDIA_ORIGIN}/moments/uploads/${input.id}.png`,
        start: gate(),
        put: gate(),
        finish: gate(),
      };
      uploads.push(upload);
      await upload.start.held;
      await route.fulfill({
        json: { src: upload.src, type: "image/png", token: "isolated-browser-test-permit" },
      });
      return;
    }
    const upload = uploads.find((item) => item.id === input.id && item.batch === input.batch);
    if (input.action !== "finish" || !upload)
      throw new Error("Unexpected operation in the controlled upload test");
    confirmations.push(upload.id);
    await upload.finish.held;
    await route.fulfill({ json: { ok: true } });
  });

  await page.route(`${MEDIA_ORIGIN}/**`, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const upload = uploads.find(
      (item) =>
        item.src.replace("/moments/uploads/", "/_uploads/moments/uploads/") ===
        route.request().url(),
    );
    if (route.request().method() !== "PUT" || !upload) {
      await route.abort();
      return;
    }
    transfers.push(upload.id);
    await upload.put.held;
    await route.fulfill({ status: 200, headers: cors, body: "" });
  });

  return {
    uploads,
    transfers,
    confirmations,
    cancellations,
    releaseAll: () => {
      for (const upload of uploads) {
        upload.start.release();
        upload.put.release();
        upload.finish.release();
      }
    },
  };
}

async function newEditor(page: Page) {
  await page.goto("/admin/posts/new");
  // Wait for the real editor's hydration before selecting a local file.
  await page.waitForFunction(() =>
    Boolean(
      document
        .querySelector<HTMLTextAreaElement>('textarea[name="bodyMd"]')
        ?.form?.style.getPropertyValue("--admin-save-height"),
    ),
  );
}

test("upload feedback follows preparation, transfer and confirmation before changing the editor", async ({
  page,
}) => {
  await newEditor(page);
  const controlled = await controlUploads(page);
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  const status = page.getByRole("status").filter({ hasText: "phase.png" });
  const uploader = page.locator('[data-upload-pending="true"]');
  await body.fill("尚未保存的正文");

  try {
    // The browser decodes this real PNG before the start request is issued.
    await page.getByLabel("选择上传的图片", { exact: true }).setInputFiles({
      name: "phase.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect.poll(() => controlled.uploads.length).toBe(1);
    const upload = controlled.uploads[0]!;
    await expect(status).toHaveText("phase.png · 准备上传…");
    await expect(uploader).toHaveCount(1);
    await expect(body).toHaveValue("尚未保存的正文");
    expect(controlled.transfers).toEqual([]);

    upload.start.release();
    await expect.poll(() => controlled.transfers).toEqual([upload.id]);
    await expect(status).toHaveText("phase.png · 上传文件…");
    await expect(body).toHaveValue("尚未保存的正文");
    expect(controlled.confirmations).toEqual([]);

    upload.put.release();
    await expect.poll(() => controlled.confirmations).toEqual([upload.id]);
    await expect(status).toHaveText("phase.png · 确认文件可用…");
    await expect(uploader).toHaveCount(1);
    await expect(body).toHaveValue("尚未保存的正文");

    upload.finish.release();
    await expect(status).toHaveText("phase.png · 已上传，等待保存");
    await expect(uploader).toHaveCount(0);
    await expect(body).toHaveValue(`尚未保存的正文\n\n![图片](${upload.src})\n`);
  } finally {
    controlled.releaseAll();
  }
});

declare global {
  interface Window {
    fhfsUploadFinishResponses: string[];
  }
}

test("cancelling a batch makes its late confirmation harmless to a new upload and draft", async ({
  page,
}) => {
  await newEditor(page);
  const controlled = await controlUploads(page);
  // Exercise the explicit late-result guard, not only native fetch cancellation:
  // a confirmation that has already reached the server can still resolve later.
  // Its network response still travels through the route-controlled real fetch.
  await page.evaluate(() => {
    const original = window.fetch.bind(window);
    window.fhfsUploadFinishResponses = [];
    window.fetch = async (input, init) => {
      const operation =
        String(input) === "/admin/media/uploads" && typeof init?.body === "string"
          ? (JSON.parse(init.body) as { action: string; id: string })
          : null;
      if (operation?.action !== "finish") return original(input, init);
      const response = await original(input, { ...init, signal: undefined });
      window.fhfsUploadFinishResponses.push(operation.id);
      return response;
    };
  });
  const body = page.getByLabel("正文（Markdown）", { exact: true });
  const choose = page.getByLabel("选择上传的图片", { exact: true });

  try {
    await body.fill("第一批尚未保存的正文");
    await choose.setInputFiles({ name: "old.png", mimeType: "image/png", buffer: png });
    await expect.poll(() => controlled.uploads.length).toBe(1);
    const old = controlled.uploads[0]!;
    old.start.release();
    await expect.poll(() => controlled.transfers).toEqual([old.id]);
    old.put.release();
    await expect.poll(() => controlled.confirmations).toEqual([old.id]);
    await expect(page.getByRole("status").filter({ hasText: "old.png" })).toHaveText(
      "old.png · 确认文件可用…",
    );

    await page.getByRole("button", { name: "取消本次编辑", exact: true }).click();
    await expect(body).toHaveValue("");
    await expect(page.getByRole("status").filter({ hasText: "old.png" })).toHaveCount(0);
    await expect
      .poll(() => controlled.cancellations.some((item) => item.batch === old.batch))
      .toBe(true);

    await body.fill("第二批尚未保存的正文");
    await choose.setInputFiles({ name: "new.png", mimeType: "image/png", buffer: png });
    await expect.poll(() => controlled.uploads.length).toBe(2);
    const current = controlled.uploads[1]!;
    expect(current.batch).not.toBe(old.batch);
    const currentStatus = page.getByRole("status").filter({ hasText: "new.png" });
    await expect(currentStatus).toHaveText("new.png · 准备上传…");

    old.finish.release();
    await page.waitForFunction((id) => window.fhfsUploadFinishResponses.includes(id), old.id);
    await expect(body).toHaveValue("第二批尚未保存的正文");
    await expect(currentStatus).toHaveText("new.png · 准备上传…");
    await expect(page.locator('[data-upload-pending="true"]')).toHaveCount(1);

    current.start.release();
    await expect.poll(() => controlled.transfers).toEqual([old.id, current.id]);
    current.put.release();
    await expect.poll(() => controlled.confirmations).toEqual([old.id, current.id]);
    current.finish.release();
    await expect(currentStatus).toHaveText("new.png · 已上传，等待保存");
    await expect(body).toHaveValue(`第二批尚未保存的正文\n\n![图片](${current.src})\n`);
    expect(await body.inputValue()).not.toContain(old.src);
  } finally {
    controlled.releaseAll();
  }
});
