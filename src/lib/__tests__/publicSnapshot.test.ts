import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createHash } from "node:crypto";
import { DrizzleQueryError } from "drizzle-orm/errors";
import bundled from "../../../backup/db.json";
import { unstable_cache } from "../server/cache";
import { withContentCacheBypass } from "../server/cacheScope";
import { isNeonUnavailable } from "../server/neonAvailability";
import { snapshotContent } from "../server/snapshotContent";
import { parsePublicSnapshot, readPublicSnapshot } from "../server/snapshotSource";

const publishedAt = "2026-10-19T01:26:53Z";
const outage = new DrizzleQueryError(
  "SELECT PRIVATE-SQL",
  [],
  Object.assign(new Error("Server error (HTTP status 402): quota exceeded"), {
    name: "NeonDbError",
  }),
);

vi.mock("../server/snapshotSource", async (original) => ({
  ...(await original<typeof import("../server/snapshotSource")>()),
  readPublicSnapshot: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readPublicSnapshot).mockResolvedValue(parsePublicSnapshot(publishedAt, bundled));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("published snapshot", () => {
  it("rejects partial exports and any export containing draft rows", () => {
    expect(() => parsePublicSnapshot(publishedAt, { posts: [] })).toThrow("Incomplete");
    expect(() =>
      parsePublicSnapshot(publishedAt, {
        ...bundled,
        posts: [{ ...bundled.posts[0], draft: true }],
      }),
    ).toThrow("Unpublished");
  });

  it("keeps the last verified copy when GitHub returns mismatched data", async () => {
    const { readPublicSnapshot: read } = await vi.importActual<
      typeof import("../server/snapshotSource")
    >("../server/snapshotSource");
    const data = JSON.stringify(bundled);
    const sha256 = createHash("sha256").update(data).digest("hex");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ publishedAt, sha256 }))
      .mockResolvedValueOnce(new Response(data))
      .mockResolvedValueOnce(Response.json({ publishedAt: "2026-11-20T00:00:00Z", sha256 }))
      .mockResolvedValueOnce(Response.json({ ...bundled, posts: [] }));
    vi.stubGlobal("fetch", fetch);
    vi.useFakeTimers({ toFake: ["Date"] });

    const verified = await read();
    expect(verified.publishedAt).toBe(publishedAt);
    vi.setSystemTime(Date.now() + 30_001);
    await expect(read()).resolves.toBe(verified);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://raw.githubusercontent.com/fanhefeng/fhfs/db-snapshots/backup/snapshot-version.json",
      "https://raw.githubusercontent.com/fanhefeng/fhfs/db-snapshots/backup/db.json",
      "https://raw.githubusercontent.com/fanhefeng/fhfs/db-snapshots/backup/snapshot-version.json",
      "https://raw.githubusercontent.com/fanhefeng/fhfs/db-snapshots/backup/db.json",
    ]);
  });

  it("uses published locale editions and excludes article bodies from the index", () => {
    const snapshot = parsePublicSnapshot(publishedAt, bundled);
    const first = snapshotContent.posts(snapshot, "en")[0]!;
    const post = snapshotContent.post(snapshot, first.slug, "en");
    expect(first).toMatchObject({ snapshotAt: publishedAt, slug: post?.slug });
    expect(first).not.toHaveProperty("bodyHtml");
    expect(first).not.toHaveProperty("html");
    expect(post?.html).toBeTruthy();
    expect(snapshotContent.post(snapshot, first.slug, "en", true)).toBeUndefined();
    expect(snapshotContent.post(snapshot, "missing-from-this-copy", "en")).toBeUndefined();
  });

  it("recognizes driver availability errors but leaves application and SQL failures visible", () => {
    expect(isNeonUnavailable(outage)).toBe(true);
    expect(isNeonUnavailable(new Error("Server error (HTTP status 402): unrelated"))).toBe(false);
    expect(
      isNeonUnavailable(
        Object.assign(new Error("syntax error"), {
          name: "NeonDbError",
          code: "42601",
        }),
      ),
    ).toBe(false);
  });
});

describe("public reads during a Neon outage", () => {
  it("serves the copy once Neon fails and returns live results as soon as it recovers", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(outage)
      .mockResolvedValue("live");
    const getter = unstable_cache(
      read,
      ["outage-recovery"],
      { publicRead: true },
      (snapshot) => snapshot.publishedAt,
    );
    await expect(getter()).resolves.toBe(publishedAt);
    await expect(getter()).resolves.toBe("live");
    await expect(getter()).resolves.toBe("live");
    expect(read).toHaveBeenCalledTimes(2);
    expect(readPublicSnapshot).toHaveBeenCalledTimes(1);
  });

  it("fails closed for snapshot misses and keeps protected reads on Neon", async () => {
    const read = vi.fn<() => Promise<string>>().mockRejectedValue(outage);
    const getter = unstable_cache(
      read,
      ["outage-protected"],
      { publicRead: true },
      () => undefined,
    );
    await expect(getter()).rejects.toThrow("Public content temporarily unavailable");
    vi.mocked(readPublicSnapshot).mockClear();
    await expect(withContentCacheBypass(true, getter)).rejects.toBe(outage);
    expect(readPublicSnapshot).not.toHaveBeenCalled();
  });
});
