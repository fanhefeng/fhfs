import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { unstable_cache, updateTag, SHARED_CONTENT_TTL_SECONDS } from "@/lib/server/cache";

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
