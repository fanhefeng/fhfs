import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { assetFetch } = vi.hoisted(() => ({
  assetFetch: vi.fn<(request: Request) => Promise<Response>>(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://og.example.invalid/"),
}));
vi.mock("@/lib/server/env", () => ({ env: { ASSETS: { fetch: assetFetch } } }));
vi.mock("@/lib/server/content", () => {
  throw new Error("Image routes must not load article data");
});

import { adminIcon, openGraphImage } from "@/lib/server/ogRoute";

beforeEach(() => {
  assetFetch.mockReset();
  assetFetch.mockImplementation(async (request) => new Response(new URL(request.url).pathname));
});

describe("generic share images", () => {
  it.each(["zh", "en"])(
    "uses one localized cover for %s, including article links",
    async (locale) => {
      const path = `/share-images/cover-${locale}.png`;
      for (const slug of [undefined, "fixture-article"]) {
        const image = await openGraphImage(locale, slug);
        expect(image.status).toBe(200);
        expect(image.headers.get("content-type")).toBe("image/png");
        expect(image.headers.get("cache-control")).toBe("private, no-store");
        expect(await image.text()).toBe(path);
      }
      expect(assetFetch.mock.calls.map(([request]) => new URL(request.url).pathname)).toEqual([
        path,
        path,
      ]);
    },
  );

  it.each([
    ["fr", undefined],
    ["en", "../manifest"],
    ["zh", "invalid%2fslug"],
  ])("rejects an invalid route for %s / %s without reading assets", async (locale, slug) => {
    expect((await openGraphImage(locale, slug)).status).toBe(404);
    expect(assetFetch).not.toHaveBeenCalled();
  });

  it("preserves the admin icon", async () => {
    const image = await adminIcon();
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(image.headers.get("cache-control")).toBe("private, no-store");
    expect(await image.text()).toBe("/share-images/admin-icon.png");
  });

  it("preserves the status of a missing cover asset", async () => {
    assetFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect((await openGraphImage("en", "fixture-article")).status).toBe(404);
  });
});
