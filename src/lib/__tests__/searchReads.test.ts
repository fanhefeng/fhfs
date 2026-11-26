import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { withContentCacheBypass } from "../server/cacheScope";
import { updateTag } from "../server/cache";
import notebook from "@/content/notebook/index.json";
import { noteDestination, type NoteSummary } from "@/lib/notebook";
import bundle from "../../../backup/db.json";
import { createHash } from "node:crypto";

type Statement = { query: string; params: unknown[] };
type Payload = Statement | { queries: Statement[] };

const transport = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
const empty = { fields: [], rows: [], rowCount: 0, command: "SELECT", rowAsArray: true };
const ownedNote = notebook.find((note) => note.section === "it")!;

function fixture(init?: RequestInit) {
  const body = JSON.parse(String(init?.body)) as Payload;
  if (!("queries" in body)) return Response.json(empty);
  return Response.json({
    results: body.queries.map(({ query }) =>
      query.includes('from "posts"')
        ? {
            ...empty,
            fields: [25, 25, 25, 25, 25, 1009, 23, 16].map((dataTypeID, index) => ({
              dataTypeID,
              name: "column" + index,
            })),
            rows: [
              [ownedNote.slug, "en", "Unpublished title", null, "", "{}", "1", "t"],
              ["search-fixture", "zh", "Fallback title", null, "Summary", "{}", "1", "f"],
            ],
            rowCount: 2,
          }
        : empty,
    ),
  });
}

async function request(locale: string) {
  const { GET } = await import("@/app/[locale]/search.json/route");
  return withContentCacheBypass(false, () =>
    GET(new Request(`https://site.invalid/${locale}/search.json`), {
      params: Promise.resolve({ locale }),
    }),
  );
}

function payloads() {
  return transport.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as Payload);
}

beforeEach(() => {
  updateTag("content");
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://fixture:fixture@example.invalid/fixture?sslmode=require",
  );
  vi.stubGlobal("fetch", transport);
  transport.mockReset().mockImplementation(async (_input, init) => fixture(init));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("search read aggregation", () => {
  it("batches seven distinct content reads and retains one independent catalogue read", async () => {
    const response = await request("en");
    expect(response.status).toBe(200);
    const entries = await response.json();
    for (const note of notebook.filter((note) => note !== ownedNote)) {
      expect(entries).toContainEqual(
        expect.objectContaining({
          kind: note.section === "it" ? "post" : "secret",
          href: `${noteDestination(note as NoteSummary)}/${note.slug}`,
          title: note.title,
        }),
      );
    }
    expect(entries).toContainEqual(
      expect.objectContaining({ href: "/blog/search-fixture", title: "Fallback title" }),
    );
    expect(entries).not.toContainEqual(
      expect.objectContaining({ href: `/blog/${ownedNote.slug}` }),
    );

    expect(transport).toHaveBeenCalledTimes(2);
    const batch = payloads().find((item) => "queries" in item);
    expect(batch?.queries.map(({ query }) => /from "(\w+)"/.exec(query)?.[1])).toEqual([
      "nav_items",
      "posts",
      "secrets",
      "apps",
      "films",
      "idols",
      "moments",
    ]);
    expect(payloads().find((item) => "query" in item)?.query).toContain('from "copy_blocks"');

    await request("en");
    expect(transport).toHaveBeenCalledTimes(2);

    updateTag("posts");
    await request("en");
    expect(transport).toHaveBeenCalledTimes(3);
    expect(payloads().at(-1)).toHaveProperty("queries.1.params", ["en"]);

    await request("zh");
    expect(transport).toHaveBeenCalledTimes(5);
    expect(
      payloads().some((item) => "queries" in item && item.queries[1]?.params[0] === "zh"),
    ).toBe(true);
  });

  it("serves the search index with default copy and retries the copy on the next request", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    transport.mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Payload;
      return "query" in body
        ? Response.json({ message: "Unavailable" }, { status: 503 })
        : fixture(init);
    });
    expect((await request("en")).status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledWith(
      "copy overrides unavailable, using message catalogue",
    );

    transport.mockImplementation(async (_input, init) => fixture(init));
    expect((await request("en")).status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(3);
    expect(payloads().at(-1)).toHaveProperty(
      "query",
      expect.stringContaining('from "copy_blocks"'),
    );
  });

  it("returns verified bilingual snapshots after a 402 without waiting for stuck copy", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const publishedAt = "2026-10-20T03:09:06.000Z";
    const data = JSON.stringify({
      ...Object.fromEntries(Object.keys(bundle).map((key) => [key, []])),
      navItems: [{ href: "/about", labelKey: "about", surfaces: [], group: null, sort: 1 }],
    });
    const sha256 = createHash("sha256").update(data).digest("hex");
    const copySignals: AbortSignal[] = [];
    transport.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "raw.githubusercontent.com")
        return url.pathname.endsWith("/snapshot-version.json")
          ? Response.json({ publishedAt, sha256 })
          : new Response(data);
      const body = JSON.parse(String(init?.body)) as Payload;
      if ("queries" in body) {
        // Allow the copy request to start first, then reject the content batch.
        await new Promise((resolve) => setTimeout(resolve, 20));
        return Response.json({ message: "Quota exhausted" }, { status: 402 });
      }
      copySignals.push(init!.signal!);
      return new Promise<Response>(() => {});
    });
    for (const lang of ["zh", "en"]) {
      const result = await request(lang);
      expect(result.status).toBe(200);
      expect(result.headers.get("X-FHFS-Snapshot-At")).toBe(publishedAt);
      expect(result.headers.get("X-FHFS-Content-Status")).toBe("snapshot");
      expect(result.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await result.json()).toContainEqual(
        expect.objectContaining({ kind: "page", href: "/about" }),
      );
    }
    expect(copySignals).toHaveLength(2);
    expect(copySignals.every((signal) => signal.aborted)).toBe(true);
    expect(
      transport.mock.calls.filter(([input]) => String(input).includes("/backup/")),
    ).toHaveLength(2);
    transport.mockReset().mockImplementation(async (_input, init) => fixture(init));
    const live = await request("en");
    expect(live.headers.get("X-FHFS-Snapshot-At")).toBeNull();
    expect(await live.json()).toContainEqual(
      expect.objectContaining({ href: "/blog/search-fixture" }),
    );
  });

  it("keeps 18-second live content and falls back to default copy if that read is still stuck", async () => {
    const { SEARCH_RESPONSE_BUDGET_MS } = await import("../server/searchAvailability");
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const copyStarted = Promise.withResolvers<AbortSignal>();
    const contentStarted = Promise.withResolvers<void>();
    transport.mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Payload;
      if ("queries" in body) {
        contentStarted.resolve();
        await new Promise((resolve) => setTimeout(resolve, 18_000));
        return fixture(init);
      }
      copyStarted.resolve(init!.signal!);
      return new Promise<Response>(() => {});
    });
    const response = request("en");
    const [signal] = await Promise.all([copyStarted.promise, contentStarted.promise]);
    await vi.advanceTimersByTimeAsync(SEARCH_RESPONSE_BUDGET_MS);
    const result = await response;
    expect(result.status).toBe(200);
    expect(result.headers.get("X-FHFS-Snapshot-At")).toBeNull();
    expect(await result.json()).toContainEqual(
      expect.objectContaining({ href: "/blog/search-fixture" }),
    );
    expect(signal.aborted).toBe(true);
  });

  it("responds with 503 before the watchdog deadline when no usable content is ready", async () => {
    const { SEARCH_RESPONSE_BUDGET_MS } = await import("../server/searchAvailability");
    vi.useFakeTimers();
    const started = Promise.withResolvers<AbortSignal>();
    transport.mockImplementation(async (_input, init) => {
      started.resolve(init!.signal!);
      return new Promise<Response>(() => {});
    });
    const response = request("zh");
    const signal = await started.promise;
    await vi.advanceTimersByTimeAsync(SEARCH_RESPONSE_BUDGET_MS);
    const result = await response;
    expect(result.status).toBe(503);
    expect(result.headers.get("Retry-After")).toBe("30");
    expect(result.headers.get("X-FHFS-Snapshot-At")).toBeNull();
    expect(signal.aborted).toBe(true);
  });
});
