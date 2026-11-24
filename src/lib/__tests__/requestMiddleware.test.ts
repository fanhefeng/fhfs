import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { setResponseHeaders, showDrafts } = vi.hoisted(() => ({
  setResponseHeaders: vi.fn(),
  showDrafts: vi.fn(async () => false),
}));
vi.mock("@tanstack/react-start", () => ({
  createMiddleware: () => ({ server: (handler: unknown) => handler }),
  createStart: (options: () => unknown) => options(),
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeaders }));
vi.mock("@/lib/server/auth/session", () => ({ showDrafts }));

import { startInstance } from "@/start";
import { bypassContentCache, recordSnapshotMiss } from "@/lib/server/cacheScope";

type Context = { request: Request; pathname: string; next: () => Promise<unknown> };
const [middleware] = (
  startInstance as unknown as { requestMiddleware: Array<(context: Context) => Promise<unknown>> }
).requestMiddleware;
const request = (path: string, init?: RequestInit) => ({
  request: new Request(`https://fhfs.example${path}`, init),
  pathname: path,
});

beforeEach(() => {
  vi.clearAllMocks();
  showDrafts.mockResolvedValue(false);
});

describe("request security and native admin", () => {
  it("preserves Start redirect and stream metadata while setting security headers", async () => {
    const response = Object.assign(new Response(null, { status: 307 }), {
      options: { href: "/admin" },
    });
    const result = { response, serverSsrCleanup: "stream" };
    expect(await middleware!({ ...request("/_serverFn/login"), next: async () => result })).toBe(
      result,
    );
    const [headers] = setResponseHeaders.mock.calls[0]!;
    expect(headers.get("cache-control")).toBe("private, no-store");
    expect(headers.get("x-frame-options")).toBe("DENY");
  });

  it("uses a temporary response only for an unhandled public snapshot miss", async () => {
    const internalError = { response: new Response("Article unavailable", { status: 500 }) };
    const ordinaryFailure = await middleware!({
      ...request("/zh/blog/unrecorded"),
      next: async () => internalError,
    });
    expect(ordinaryFailure).toBe(internalError);

    const { response } = (await middleware!({
      ...request("/zh/blog/unrecorded"),
      next: async () => {
        recordSnapshotMiss();
        return internalError;
      },
    })) as { response: Response };
    expect(response.status).toBe(503);
    expect(response.headers.get("x-fhfs-content-status")).toBe("snapshot-miss");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("Article unavailable");

    const success = { response: new Response("Published snapshot") };
    expect(
      await middleware!({
        ...request("/zh/blog/known"),
        next: async () => {
          recordSnapshotMiss();
          return success;
        },
      }),
    ).toBe(success);
  });

  it("rejects cross-origin mutations before invoking their handlers", async () => {
    const next = vi.fn();
    const result = await middleware!({
      ...request("/_serverFn/save", {
        method: "POST",
        headers: { origin: "https://other.example" },
      }),
      next,
    });
    expect((result as Response).status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("bypasses public content caches for admin and authorized previews only", async () => {
    const next = async () => bypassContentCache();
    expect(await middleware!({ ...request("/admin/posts"), next })).toBe(true);
    expect(await middleware!({ ...request("/zh/blog"), next })).toBe(false);
    showDrafts.mockResolvedValue(true);
    expect(await middleware!({ ...request("/zh/blog"), next })).toBe(true);
    expect(bypassContentCache()).toBe(false);
  });
});

describe("legacy public route compatibility", () => {
  it.each([
    ["/?source=old", "/en?source=old"],
    ["/about", "/en/about"],
    ["/intro", "/en/intro"],
    ["/resume", "/en/resume"],
    ["/blog", "/en/blog"],
    ["/blog/frontend-deployment?x=%2f", "/en/blog/frontend-deployment?x=%2f"],
    ["/blog/notes/a-career-imagined", "/en/blog/notes/a-career-imagined"],
    ["/blog/tags/%E6%89%8B%E6%9C%AD", "/en/blog/tags/%E6%89%8B%E6%9C%AD"],
    ["/blog/tags/100%2520", "/en/blog/tags/100%2520"],
    ["/films", "/en/films"],
    ["/films/odyssey", "/en/films/odyssey"],
    ["/idols", "/en/idols"],
    ["/idols/kobe", "/en/idols/kobe"],
    ["/lab", "/en/lab"],
    ["/lab/approach", "/en/lab/approach"],
    ["/life", "/en/life"],
    ["/moments", "/en/moments"],
    ["/secrets", "/en/secrets"],
    ["/secrets/a-career-imagined", "/en/secrets/a-career-imagined"],
    ["/software?app=file-tidy&x=a+b&x=%2f", "/en/software?app=file-tidy&x=a+b&x=%2f"],
    ["/blog/notes?section=writing&x=a%2Bb", "/en/life?section=writing&x=a%2Bb"],
    ["/blog/notes?section=life&section=it", "/en/life?section=life&section=it"],
    ["/blog/notes?section=it&section=life", "/en/blog?section=it&section=life"],
    ["/blog/notes", "/en/blog"],
    ["/lab/grove?next=https%3a%2f%2felse.example", "/en/lab/grove?next=https%3a%2f%2felse.example"],
    ["/portfolio?app=file-tidy", "/en/software?app=file-tidy"],
    ["/grove", "/en/lab/grove"],
    ["/lab/grove-stage", "/en/lab/approach"],
    ["/lab/album", "/en/lab"],
    ["/lab/aurora", "/en/lab"],
    ["/lab/grain", "/en/lab"],
    ["/odyssey", "/en/films/odyssey"],
  ])("keeps the exact query in a same-origin redirect from %s", async (path, target) => {
    const next = vi.fn();
    const response = (await middleware!({
      ...request(path, { headers: { "accept-language": "zh-CN;q=0.2, en-GB;q=0.9" } }),
      next,
    })) as Response;
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(target);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Accept-Language, Cookie");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(next).not.toHaveBeenCalled();
    expect(showDrafts).not.toHaveBeenCalled();
  });

  it.each([
    ["NEXT_LOCALE=zh", "en-US", "zh"],
    ["x=1; NEXT_LOCALE=en; unrelated=1", "zh-CN", "en"],
    ["NEXT_LOCALE=fr", "fr-FR, en-US;q=0.8", "en"],
    ["NOT_NEXT_LOCALE=en", "en;q=0, zh-Hant;q=0.5", "zh"],
    ["NEXT_LOCALE=en-us", "zh-CN", "zh"],
    ["", "en;q=1.001, zh;q=0.3", "zh"],
    ["", "fr-FR, *;q=0.2", "zh"],
    ["", "en;q=0.5, zh;q=0.5", "en"],
    ["", "", "zh"],
  ])(
    "honors only valid preference, weighted headers and the default",
    async (cookie, accept, l) => {
      const response = (await middleware!({
        ...request("/software", { method: "HEAD", headers: { cookie, "accept-language": accept } }),
        next: vi.fn(),
      })) as Response;
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`/${l}/software`);
      expect(await response.text()).toBe("");
    },
  );

  it.each([
    ["/grove", "/lab/grove"],
    ["/portfolio", "/software"],
    ["/lab/grove-stage", "/lab/approach"],
    ["/lab/album", "/lab"],
    ["/lab/aurora", "/lab"],
    ["/lab/grain", "/lab"],
    ["/odyssey", "/films/odyssey"],
  ])("keeps the locale and query in permanent redirects from %s", async (path, target) => {
    for (const [locale, method] of [
      ["zh", "GET"],
      ["en", "HEAD"],
    ]) {
      const next = vi.fn();
      const response = (await middleware!({
        ...request(`/${locale}${path}?x=a+b&x=%2f`, {
          method,
          headers: { cookie: "NEXT_LOCALE=zh", "accept-language": "zh-CN" },
        }),
        next,
      })) as Response;
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(`/${locale}${target}?x=a+b&x=%2f`);
      expect(response.headers.has("vary")).toBe(false);
      expect(await response.text()).toBe("");
      expect(next).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["GET", "/software/"],
    ["GET", "/%73oftware"],
    ["GET", "/lab/%67rove"],
    ["GET", "/lab/grove%2F"],
    ["GET", "/lab/grove%5c"],
    ["GET", "/lab/grove%"],
    ["GET", "/lab/bad.slug"],
    ["GET", "/blog/notes/bad.slug"],
    ["GET", "/blog/tags/broken%"],
    ["GET", "/blog/tags/extra/path"],
    ["GET", "/unlisted"],
    ["GET", "/fr/grove"],
    ["GET", "/en/%67rove"],
    ["GET", "/en/portfolio/archive"],
    ["GET", "/zh/software?app=file-tidy"],
    ["GET", "/en/lab/grove"],
    ["GET", "/admin"],
    ["GET", "/api/health"],
    ["GET", "/api/github/webhook"],
    ["GET", "/icon.svg"],
    ["GET", "/rss.xml"],
    ["GET", "/sitemap.xml"],
    ["GET", "/zh/search.json"],
    ["POST", "/software"],
    ["POST", "/en/portfolio"],
    ["OPTIONS", "/software"],
  ])("leaves %s %s to the existing router", async (method, path) => {
    const result = { response: new Response(null, { status: 404 }) };
    const next = vi.fn(async () => result);
    expect(await middleware!({ ...request(path, { method }), next })).toBe(result);
    expect(next).toHaveBeenCalledOnce();
  });
});
