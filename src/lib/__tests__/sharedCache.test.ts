import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { unstable_cache, updateTag, SHARED_CONTENT_TTL_SECONDS } from "@/lib/server/cache";
import { withContentCacheBypass } from "@/lib/server/cacheScope";

afterEach(() => vi.useRealTimers());
describe("content shared with fhfs-site", () => {
  it("refreshes external edits after 30 seconds and isolates argument values", async () => {
    vi.useFakeTimers();
    const read = vi.fn(async (locale: string) => locale);
    const cached = unstable_cache(read, ["shared-edit-test"], { tags: ["shared-edit-test"] });
    await cached("zh");
    await cached("zh");
    await cached("en");
    expect(read).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(SHARED_CONTENT_TTL_SECONDS * 1000 + 1);
    await cached("zh");
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("invalidates immediately for this deployment's saves and retries failed reads", async () => {
    const read = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(7);
    const cached = unstable_cache(read, ["shared-save-test"], { tags: ["shared-save-test"] });
    await expect(cached()).rejects.toThrow("offline");
    expect(await cached()).toBe(7);
    updateTag("shared-save-test");
    await cached();
    expect(read).toHaveBeenCalledTimes(3);
  });
});

describe("Worker request boundaries", () => {
  it("shares concurrent reads only within one request, including common search translations", async () => {
    const read = vi.fn(async () => 7);
    const cached = unstable_cache(read, ["same-request"]);
    expect(
      await withContentCacheBypass(false, () => Promise.all([cached(), cached(), cached()])),
    ).toEqual([7, 7, 7]);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("does not share I/O between two request scopes or deduplicate admin reads", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const read = vi.fn(async () => {
      await pending;
      return 1;
    });
    const cached = unstable_cache(read, ["separate-scopes"]);
    const first = withContentCacheBypass(false, cached);
    const second = withContentCacheBypass(false, cached);
    expect(read).toHaveBeenCalledTimes(2);
    finish();
    await Promise.all([first, second]);
    await withContentCacheBypass(true, () => Promise.all([cached(), cached()]));
    expect(read).toHaveBeenCalledTimes(4);
  });

  it("clears failed in-flight reads so the same request can recover", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(2);
    const cached = unstable_cache(read, ["pending-recovery"]);
    await withContentCacheBypass(false, async () => {
      await expect(Promise.all([cached(), cached()])).rejects.toThrow("offline");
      expect(read).toHaveBeenCalledTimes(1);
      expect(await cached()).toBe(2);
    });
  });

  it("does not reuse an in-flight read after invalidation in the same request", async () => {
    let finish!: (value: number) => void;
    const read = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue(2);
    const cached = unstable_cache(read, ["same-request-invalidation"], {
      tags: ["same-request-invalidation"],
    });
    await withContentCacheBypass(false, async () => {
      const old = cached();
      updateTag("same-request-invalidation");
      expect(await cached()).toBe(2);
      finish(1);
      expect(await old).toBe(1);
    });
    expect(await cached()).toBe(2);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("never shares a pending read between requests", async () => {
    vi.useFakeTimers();
    const resolvers: Array<(value: number) => void> = [];
    const read = vi.fn(() => new Promise<number>((resolve) => resolvers.push(resolve)));
    const cached = unstable_cache(read, ["pending-request-test"]);
    const first = cached();
    const second = cached();
    expect(read).toHaveBeenCalledTimes(2);
    resolvers[1]!(2);
    expect(await second).toBe(2);
    resolvers[0]!(1);
    expect(await first).toBe(1);
    expect(await cached()).toBe(2);
  });

  it("does not restore an invalidated value when an older read finishes", async () => {
    let finish!: (value: number) => void;
    const read = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    const cached = unstable_cache(read, ["invalidation-race"], { tags: ["invalidation-race"] });
    const old = cached();
    updateTag("invalidation-race");
    finish(1);
    await old;
    const fresh = cached();
    expect(read).toHaveBeenCalledTimes(2);
    finish(2);
    expect(await fresh).toBe(2);
  });

  it("bypasses public results in an admin or preview request", async () => {
    const { withContentCacheBypass } = await import("@/lib/server/cacheScope");
    let value = 1;
    const cached = unstable_cache(async () => value, ["preview-bypass"]);
    expect(await cached()).toBe(1);
    value = 2;
    expect(await withContentCacheBypass(true, cached)).toBe(2);
    expect(await cached()).toBe(1);
  });

  it("caps an explicit cache lifetime at 30 seconds", async () => {
    vi.useFakeTimers();
    const read = vi.fn(async () => 1);
    const cached = unstable_cache(read, ["bounded-cache-test"], { revalidate: 3600 });
    await cached();
    vi.advanceTimersByTime(30_001);
    await cached();
    expect(read).toHaveBeenCalledTimes(2);
  });
});
