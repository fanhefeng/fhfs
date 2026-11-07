import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { sql } from "drizzle-orm";
import { withPublicRead } from "../server/publicRead";
import { unstable_cache } from "../server/cache";
import { withContentCacheBypass } from "../server/cacheScope";

const transport = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://fixture:fixture@example.invalid/fixture?sslmode=require",
  );
  vi.stubGlobal("fetch", transport);
  transport.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const rows = () =>
  Response.json({
    fields: [{ name: "n", dataTypeID: 23 }],
    rows: [[1]],
    rowCount: 1,
    command: "SELECT",
    rowAsArray: true,
  });
const connectionFailure = () =>
  new TypeError("fetch failed", {
    cause: Object.assign(new Error("PRIVATE-SOCKET"), { code: "ECONNRESET" }),
  });

describe("real Neon/Drizzle with mock-only transport", () => {
  it.each([3_100, 18_000])("preserves a healthy %ims read with one request", async (delay) => {
    const { db } = await import("@/db");
    transport.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(rows()), delay);
        }),
    );
    const result = withPublicRead("driver-read", () => db.execute(sql`select 1 as n`));
    const outcome = result.then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(delay + 8_000);
    expect(await outcome).toMatchObject({ value: { rows: [{ n: 1 }] } });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]![1].signal).toBeUndefined();
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining(`"durationMs":${delay}`));
    expect(console.error).not.toHaveBeenCalled();
  });

  it("reports time waiting for headers separately from time reading the body", async () => {
    const { db } = await import("@/db");
    const bytes = new Uint8Array(await rows().arrayBuffer());
    transport.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            const body = new ReadableStream<Uint8Array>({
              start(controller) {
                setTimeout(() => {
                  controller.enqueue(bytes);
                  controller.close();
                }, 1_300);
              },
            });
            resolve(new Response(body, { headers: { "Content-Type": "application/json" } }));
          }, 400);
        }),
    );
    const assertion = expect(
      withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
    ).resolves.toMatchObject({ rows: [{ n: 1 }] });
    await vi.advanceTimersByTimeAsync(1_700);
    await assertion;
    const logs = vi.mocked(console.info).mock.calls.map(([line]) => JSON.parse(line));
    expect(logs).toContainEqual({
      service: "fhfs public read transport",
      operation: "driver-read",
      attempt: 1,
      headersMs: 400,
      bodyMs: 1_300,
      status: 200,
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("does not restart or pretend to cancel a noncooperative upstream", async () => {
    const { db } = await import("@/db");
    const pending: Array<(response: Response) => void> = [];
    transport.mockImplementation(() => new Promise<Response>((resolve) => pending.push(resolve)));
    let settled = false;
    const result = withPublicRead("driver-read", () => db.execute(sql`select 1 as n`));
    void result.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await vi.advanceTimersByTimeAsync(60_000);
    try {
      expect(transport).toHaveBeenCalledTimes(1);
      expect(settled).toBe(false);
      expect(transport.mock.calls[0]![1].signal).toBeUndefined();
    } finally {
      for (const resolve of pending) resolve(rows());
      await result.catch(() => {});
    }
    await expect(result).resolves.toMatchObject({ rows: [{ n: 1 }] });
  });

  it("does not amplify seven concurrent slow reads", async () => {
    const { db } = await import("@/db");
    transport.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => resolve(rows()), 18_000);
        }),
    );
    const result = Promise.all(
      Array.from({ length: 7 }, () =>
        withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
      ),
    );
    const assertion = expect(result).resolves.toHaveLength(7);
    await vi.advanceTimersByTimeAsync(18_000);
    await assertion;
    expect(transport).toHaveBeenCalledTimes(7);
  });

  it.each([429, 503])("does not retry HTTP %i or disregard Retry-After", async (status) => {
    const { db } = await import("@/db");
    transport.mockImplementation(async () =>
      Response.json({ message: "PRIVATE-CONTENT" }, { status, headers: { "Retry-After": "3600" } }),
    );
    await expect(
      withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
    ).rejects.toThrow(/^Public content temporarily unavailable$/);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /PRIVATE|fixture|postgresql|select /,
    );
  });

  it("extracts permanent SQLSTATE from the actual cause chain without retry or private data", async () => {
    const { db } = await import("@/db");
    transport.mockImplementation(async () =>
      Response.json(
        { message: "PRIVATE-CONTENT", code: "42P01", detail: "PRIVATE-PARAM" },
        { status: 400 },
      ),
    );
    await expect(
      withPublicRead("driver-read", () => db.execute(sql`select ${"PRIVATE-PARAM"}`)),
    ).rejects.toThrow(/^Public content temporarily unavailable$/);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      kind: "database",
      sqlstate: "42P01",
      errorType: "DrizzleQueryError",
      causeType: "NeonDbError",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /PRIVATE|fixture|postgresql|select /,
    );
  });

  it("diagnoses Workers connection failures without adding a retry policy", async () => {
    const { db } = await import("@/db");
    transport.mockRejectedValue(new Error("Network connection lost."));
    await expect(
      withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
    ).rejects.toThrow(/^Public content temporarily unavailable$/);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      kind: "connection",
    });
  });

  it.each(["public", "admin", "preview", "write"] as const)(
    "preserves legacy connection recovery for %s without an extra retry layer",
    async (path) => {
      const { db } = await import("@/db");
      transport.mockRejectedValueOnce(connectionFailure()).mockImplementation(rows);
      const query = () =>
        db.execute(path === "write" ? sql`delete from posts where false` : sql`select 1 as n`);
      const cached = unstable_cache(query, [`driver-${path}`], { publicRead: true });
      const result = path === "write" ? query() : withContentCacheBypass(path !== "public", cached);
      const assertion = expect(result).resolves.toBeDefined();
      await vi.advanceTimersByTimeAsync(300);
      await assertion;
      expect(transport).toHaveBeenCalledTimes(2);
      expect(transport.mock.calls[0]![1].signal).toBeUndefined();
      if (path !== "public") {
        expect(console.error).not.toHaveBeenCalled();
        expect(console.info).not.toHaveBeenCalled();
      }
    },
  );

  it("records a failed transport attempt without recording credentials or changing retries", async () => {
    const { db } = await import("@/db");
    transport.mockRejectedValueOnce(connectionFailure()).mockImplementation(rows);
    const assertion = expect(
      withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
    ).resolves.toMatchObject({ rows: [{ n: 1 }] });
    await vi.advanceTimersByTimeAsync(300);
    await assertion;
    expect(transport).toHaveBeenCalledTimes(2);
    const logs = vi.mocked(console.info).mock.calls.map(([line]) => JSON.parse(line));
    expect(logs).toEqual([
      {
        service: "fhfs public read transport",
        operation: "driver-read",
        attempt: 1,
        headersMs: 0,
        bodyMs: null,
        status: null,
        failedPhase: "headers",
      },
    ]);
    expect(JSON.stringify(logs)).not.toMatch(/PRIVATE|fixture|postgresql|select /);
  });

  it("does not stack retries on the existing three-attempt connection exhaustion", async () => {
    const { db } = await import("@/db");
    transport.mockRejectedValue(connectionFailure());
    const assertion = expect(
      withPublicRead("driver-read", () => db.execute(sql`select 1 as n`)),
    ).rejects.toThrow(/^Public content temporarily unavailable$/);
    await vi.advanceTimersByTimeAsync(1_500);
    await assertion;
    expect(transport).toHaveBeenCalledTimes(3);
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0]![0])).toMatchObject({
      kind: "connection",
      code: "ECONNRESET",
    });
  });
});
