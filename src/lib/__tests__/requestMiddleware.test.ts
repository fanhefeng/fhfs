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
import { bypassContentCache } from "@/lib/server/cacheScope";

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
