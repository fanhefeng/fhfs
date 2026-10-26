import { describe, expect, it, vi } from "vite-plus/test";
import { checkPublicSite, PUBLIC_PROBES, reportUptime, validUptimePing } from "../uptime";

const ping = "https://hc-ping.com/00000000-0000-0000-0000-000000000000";
function healthy(input: RequestInfo | URL): Response {
  const url = new URL(String(input));
  if (url.pathname === "/admin")
    return new Response(null, { status: 307, headers: { location: "/admin/login" } });
  if (url.hostname.startsWith("fhfs-media")) {
    const bytes = new Uint8Array(64);
    bytes.set([255, 216]);
    return new Response(bytes, {
      status: 206,
      headers: {
        "content-type": url.pathname.endsWith(".jpg") ? "image/jpeg" : "audio/mp4",
        "content-range": "bytes 0-63/1000",
      },
    });
  }
  if (url.pathname.endsWith("search.json")) return Response.json([]);
  return new Response(
    url.pathname === "/admin/login" ? '<input name="password">' : "<main>Healthy</main>",
    { headers: { "content-type": "text/html" } },
  );
}
const fakeFetch = (handler = healthy) =>
  vi.fn(async (input: RequestInfo | URL) => handler(input)) as unknown as typeof fetch;

describe("public uptime", () => {
  it("checks both languages, native authentication and real media ranges without credentials", async () => {
    const fetcher = fakeFetch();
    const results = await checkPublicSite(fetcher);
    expect(results).toHaveLength(8);
    expect(results.every((r) => r.ok)).toBe(true);
    for (const [, options] of vi.mocked(fetcher).mock.calls) {
      expect(options?.method).toBeUndefined();
      expect(options?.redirect).toBe("manual");
      expect(options?.headers).not.toHaveProperty("Authorization");
    }
  });
  it.each([
    [
      "root error boundary",
      () =>
        new Response("<main><h1>This page failed to load</h1></main>", {
          headers: { "content-type": "text/html" },
        }),
    ],
    ["HTTP failure", () => new Response("unavailable", { status: 503 })],
    [
      "error inside a 200 page",
      () => new Response('<main>s:"error"</main>', { headers: { "content-type": "text/html" } }),
    ],
    [
      "unexpected HTML",
      () => new Response("<html>challenge</html>", { headers: { "content-type": "text/html" } }),
    ],
    [
      "network exception",
      () => {
        throw new Error("private connection details");
      },
    ],
  ])("detects %s and does not leak response or exception text", async (_name, handler) => {
    const results = await checkPublicSite(fakeFetch(handler));
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(JSON.stringify(results)).not.toMatch(/private|unavailable|challenge/);
  });
  it("accepts healthy pages that serialize the English error catalogue", async () => {
    const results = await checkPublicSite(
      fakeFetch((input) =>
        String(input).endsWith("/en")
          ? new Response(
              '<main>Welcome</main><script>{"errorTitle":"This page failed to load"}</script>',
              { headers: { "content-type": "text/html" } },
            )
          : healthy(input),
      ),
    );
    expect(results.every((r) => r.ok)).toBe(true);
  });
  it("uses the Workers-supported manual redirect policy for reports", async () => {
    const results = await checkPublicSite(fakeFetch());
    const reporter = vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.redirect !== "manual") throw new TypeError("Unsupported redirect policy");
      return new Response("OK");
    }) as unknown as typeof fetch;
    expect(await reportUptime(ping, results, reporter)).toBe(true);
  });
  it("refuses an admin redirect to the other deployment", async () => {
    const results = await checkPublicSite(
      fakeFetch((input) =>
        String(input).endsWith("/admin")
          ? new Response(null, {
              status: 307,
              headers: { location: "https://fhfs-site.vercel.app/admin/login" },
            })
          : healthy(input),
      ),
    );
    expect(results.find((r) => r.label === "admin session guard")?.ok).toBe(false);
  });
  it("rejects malformed JSON and media servers that ignore Range", async () => {
    const results = await checkPublicSite(
      fakeFetch((input) =>
        String(input).endsWith("search.json")
          ? Response.json({ error: true })
          : String(input).includes("fhfs-media")
            ? new Response("asset", { status: 200 })
            : healthy(input),
      ),
    );
    expect(results.filter((r) => !r.ok).map((r) => r.label)).toEqual([
      "zh content",
      "en content",
      "media image",
      "media audio",
    ]);
  });
  it("bounds response bodies", async () => {
    const results = await checkPublicSite(
      fakeFetch(() => new Response(new Uint8Array(512 * 1024 + 1))),
    );
    expect(results.every((r) => !r.ok)).toBe(true);
  });
  it("reports failure and recovery to the dedicated watchdog", async () => {
    const results = await checkPublicSite(fakeFetch());
    const reporter = vi.fn(async () => new Response("OK")) as unknown as typeof fetch;
    expect(await reportUptime(ping, results, reporter)).toBe(true);
    expect(vi.mocked(reporter).mock.calls[0]?.[0]).toBe(ping);
    results[0]!.ok = false;
    results[0]!.reason = "http";
    expect(await reportUptime(ping, results, reporter)).toBe(false);
    expect(vi.mocked(reporter).mock.calls[1]?.[0]).toBe(ping + "/fail");
    expect(await reportUptime(ping, [], reporter)).toBe(false);
  });
  it("rejects invalid watchdogs and ignored/failed reports", async () => {
    const results = PUBLIC_PROBES.map((p) => ({ label: p.label, ok: true, status: 200 }));
    for (const value of [
      undefined,
      "http://hc-ping.com/anything",
      ping + "/fail",
      ping + "?x=1",
      ping.replace("hc-ping.com", "evil.example"),
    ]) {
      expect(validUptimePing(value)).toBe(false);
      await expect(reportUptime(value, results, fakeFetch())).rejects.toThrow("not configured");
    }
    for (const body of ["OK (not found)", "OK (rate limited)"]) {
      await expect(
        reportUptime(
          ping,
          results,
          fakeFetch(() => new Response(body)),
        ),
      ).rejects.toThrow("did not acknowledge");
    }
    await expect(
      reportUptime(
        ping,
        results,
        fakeFetch(() => {
          throw new Error(ping);
        }),
      ),
    ).rejects.toThrow(/^Uptime watchdog did not acknowledge the report$/);
  });
});
