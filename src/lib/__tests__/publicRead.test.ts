import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { diagnosePublicRead, PublicReadError, withPublicRead } from "../server/publicRead";
import { withContentCacheBypass } from "../server/cacheScope";
import { unstable_cache } from "../server/cache";

const workerFailure = () => new Error("Network connection lost.");
const wrapped = (cause: unknown) =>
  new DrizzleQueryError("select PRIVATE-SQL", ["PRIVATE-PARAM"], cause as Error);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("public read diagnostics without a transport policy", () => {
  it("returns normal content without adding calls or routine logs", async () => {
    const read = vi.fn(async () => ({ title: "PRIVATE-CONTENT" }));
    expect(await withPublicRead("posts", read)).toEqual({ title: "PRIVATE-CONTENT" });
    expect(read).toHaveBeenCalledTimes(1);
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["Workers", workerFailure()],
    [
      "Node cause",
      new TypeError("fetch failed", {
        cause: Object.assign(new Error("PRIVATE-SOCKET"), { code: "ECONNRESET" }),
      }),
    ],
    [
      "Drizzle/Neon cause",
      wrapped(
        Object.assign(new Error("PRIVATE-URL"), { name: "NeonDbError", cause: workerFailure() }),
      ),
    ],
    [
      "Neon sourceError",
      wrapped(
        Object.assign(new Error("PRIVATE-URL"), {
          name: "NeonDbError",
          sourceError: workerFailure(),
        }),
      ),
    ],
  ])("diagnoses %s without retrying or leaking the cause", async (_name, error) => {
    const read = vi.fn().mockRejectedValue(error);
    const result = withPublicRead("posts", read);
    await expect(result).rejects.toThrow(/^Public content temporarily unavailable$/);
    await expect(result).rejects.toBeInstanceOf(PublicReadError);
    await expect(result).rejects.not.toHaveProperty("cause");
    expect(read).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      kind: "connection",
      operation: "posts",
      outcome: "failed",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /PRIVATE|select |postgresql|db.invalid/,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("prioritizes SQLSTATE over a nested connection failure without changing behavior", async () => {
    const error = wrapped(
      Object.assign(new Error("PRIVATE-CONNECTION-STRING"), {
        name: "NeonDbError",
        code: "42P01",
        cause: workerFailure(),
      }),
    );
    const read = vi.fn().mockRejectedValue(error);
    await expect(withPublicRead("posts", read)).rejects.toThrow(
      "Public content temporarily unavailable",
    );
    expect(read).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      kind: "database",
      sqlstate: "42P01",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/PRIVATE|select /);
  });

  it.each(["AbortError", "TimeoutError"])(
    "classifies an existing %s without restarting the read",
    async (name) => {
      const read = vi.fn().mockRejectedValue(new DOMException("PRIVATE-REASON", name));
      await expect(withPublicRead("posts", read)).rejects.toThrow(
        "Public content temporarily unavailable",
      );
      expect(read).toHaveBeenCalledTimes(1);
      expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
        kind: name === "AbortError" ? "aborted" : "timeout",
      });
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/PRIVATE/);
    },
  );

  it("does not impose a shared deadline on sequential cache misses", async () => {
    const read = vi.fn(() => new Promise<number>((resolve) => setTimeout(() => resolve(1), 2_500)));
    const loaders = Array.from({ length: 4 }, (_, index) =>
      unstable_cache(read, [`sequential-${index}`], { publicRead: true }),
    );
    const result = withContentCacheBypass(false, async () => {
      const values: number[] = [];
      for (const loader of loaders) values.push(await loader());
      return values;
    });
    const outcome = result.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await outcome).toEqual({ value: [1, 1, 1, 1] });
    expect(read).toHaveBeenCalledTimes(4);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("logs a nested failure only once with a fixed public error", async () => {
    await expect(
      withPublicRead("outer", () =>
        withPublicRead("inner", async () => {
          throw wrapped(new Error("PRIVATE-CONTENT"));
        }),
      ),
    ).rejects.toThrow("Public content temporarily unavailable");
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      operation: "outer",
      errorType: "DrizzleQueryError",
    });
  });

  it("sanitizes arbitrary operation names and cyclic error metadata", async () => {
    const error = {
      name: "PRIVATE-NAME",
      message: "PRIVATE-MESSAGE",
      code: "PRIVATE-CODE",
      cause: null as unknown,
    };
    error.cause = error;
    expect(diagnosePublicRead(error)).toEqual({
      errorType: "UnknownError",
      causeType: "UnknownError",
      kind: "unknown",
    });
    await expect(
      withPublicRead("PRIVATE-OPERATION", async () => {
        throw error;
      }),
    ).rejects.toThrow("Public content temporarily unavailable");
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      operation: "content",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/PRIVATE/);
  });

  it("keeps admin and preview outside public diagnostics, deduplication and result caching", async () => {
    const failure = workerFailure();
    const read = vi.fn().mockRejectedValue(failure);
    const cached = unstable_cache(read, ["admin-diagnostics-bypass"], { publicRead: true });
    const outcome = await withContentCacheBypass(true, () =>
      Promise.allSettled([cached(), cached()]),
    );
    expect(outcome).toEqual([
      { status: "rejected", reason: failure },
      { status: "rejected", reason: failure },
    ]);
    expect(read).toHaveBeenCalledTimes(2);
    expect(console.error).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
