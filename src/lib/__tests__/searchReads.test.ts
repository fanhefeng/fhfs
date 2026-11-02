import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { transport } = vi.hoisted(() => ({ transport: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://site.invalid/en/search.json"),
}));
vi.mock("@/lib/server/content", async () => {
  const { unstable_cache } = await import("../server/cache");
  return Object.fromEntries(
    [
      "getAllNavItems",
      "getPosts",
      "getSecrets",
      "getApps",
      "getFilms",
      "getIdols",
      "getMoments",
      "getCopyOverrides",
    ].map((name) => [
      name,
      unstable_cache(
        async () => {
          await transport("https://db.invalid/sql", {
            method: "POST",
            body: JSON.stringify({ query: `select * from ${name}`, params: [] }),
          });
          return name === "getCopyOverrides" ? {} : [];
        },
        [`search-${name.toLowerCase()}`],
        { tags: ["search-regression"], publicRead: true },
      ),
    ]),
  );
});

import { GET } from "@/app/[locale]/search.json/route";
import { withContentCacheBypass } from "../server/cacheScope";
import { updateTag } from "../server/cache";
import notebook from "@/content/notebook/index.json";

beforeEach(() => {
  updateTag("search-regression");
  transport.mockReset().mockImplementation(async () => new Response("{}"));
});

describe("search read aggregation", () => {
  it("loads the seven distinct data sets and one shared catalogue read on a cold request", async () => {
    const response = await withContentCacheBypass(false, () =>
      GET(new Request("https://site.invalid/en/search.json"), {
        params: Promise.resolve({ locale: "en" }),
      }),
    );
    expect(response.status).toBe(200);
    const entries = await response.json();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter((entry: { kind: string }) => entry.kind !== "lab")).toHaveLength(
      notebook.length + 1,
    );
    for (const note of notebook) {
      expect(entries).toContainEqual(
        expect.objectContaining({
          kind: "post",
          href: `/blog/notes/${note.slug}`,
          title: note.title,
        }),
      );
    }
    const queries = transport.mock.calls.map(([, init]) => JSON.parse(init.body).query);
    expect(queries).toHaveLength(8);
    expect(queries.filter((query) => query.includes("getCopyOverrides"))).toHaveLength(1);
    expect(new Set(queries).size).toBe(8);
    await withContentCacheBypass(false, () =>
      GET(new Request("https://site.invalid/en/search.json"), {
        params: Promise.resolve({ locale: "en" }),
      }),
    );
    expect(transport).toHaveBeenCalledTimes(8);
  });
});
