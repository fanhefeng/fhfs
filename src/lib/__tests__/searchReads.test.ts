import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { withContentCacheBypass } from "../server/cacheScope";
import { updateTag } from "../server/cache";
import notebook from "@/content/notebook/index.json";
import { noteDestination, type NoteSummary } from "@/lib/notebook";

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
});
