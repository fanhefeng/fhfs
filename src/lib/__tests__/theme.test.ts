import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

let theme: typeof import("../theme");
let root: { dataset: { theme?: string; vt?: string } };
let page: {
  documentElement: typeof root;
  querySelectorAll: () => unknown[];
  startViewTransition?: unknown;
};
let dispatch: ReturnType<typeof vi.fn>;
let save: ReturnType<typeof vi.fn>;

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

beforeEach(async () => {
  vi.resetModules();
  root = { dataset: { theme: "light" } };
  page = { documentElement: root, querySelectorAll: () => [] };
  dispatch = vi.fn();
  save = vi.fn();
  vi.stubGlobal("document", page);
  vi.stubGlobal("window", { dispatchEvent: dispatch });
  vi.stubGlobal("localStorage", { setItem: save });
  theme = await import("../theme");
});

afterEach(() => vi.unstubAllGlobals());

describe("theme transition lifetime", () => {
  it("changes the theme, storage and event without a transition API", () => {
    theme.toggleTheme();
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.vt).toBeUndefined();
    expect(save).toHaveBeenCalledExactlyOnceWith("fhfs-theme", "dark");
    expect(dispatch.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
    expect(dispatch.mock.calls[0]?.[0].type).toBe("fhfs:theme");
  });

  it("keeps transition styling until the actual animation finishes", async () => {
    const finished = deferred();
    page.startViewTransition = (update: () => void) => {
      update();
      return { finished: finished.promise };
    };
    theme.toggleTheme();
    expect(root.dataset.vt).toBe("theme");
    expect(root.dataset.theme).toBe("dark");
    finished.resolve();
    await finished.promise;
    expect(root.dataset.vt).toBeUndefined();
  });

  it("does not let an older completion clear the current transition", async () => {
    const first = deferred();
    const second = deferred();
    const updates: (() => void)[] = [];
    const pending = [first, second];
    page.startViewTransition = (update: () => void) => {
      updates.push(update);
      return { finished: pending.shift()!.promise };
    };
    theme.toggleTheme();
    theme.toggleTheme();
    // Snapshot callbacks may be deferred; each toggle reads at its own update.
    updates[0]!();
    updates[1]!();
    expect(root.dataset.theme).toBe("light");
    first.resolve();
    await first.promise;
    expect(root.dataset.vt).toBe("theme");
    second.resolve();
    await second.promise;
    expect(root.dataset.vt).toBeUndefined();
  });

  it("cleans up a rejected transition without leaking a rejection", async () => {
    const finished = deferred();
    page.startViewTransition = () => ({ finished: finished.promise });
    theme.toggleTheme();
    finished.reject(new Error("update failed"));
    await finished.promise.catch(() => {});
    expect(root.dataset.vt).toBeUndefined();
  });

  it("falls back once when starting the transition throws", () => {
    page.startViewTransition = () => {
      throw new Error("cannot capture");
    };
    theme.toggleTheme();
    expect(root.dataset.theme).toBe("dark");
    expect(root.dataset.vt).toBeUndefined();
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("does not apply twice if a partial implementation throws after updating", () => {
    page.startViewTransition = (update: () => void) => {
      update();
      throw new Error("cannot animate");
    };
    theme.toggleTheme();
    expect(root.dataset.theme).toBe("dark");
    expect(dispatch).toHaveBeenCalledOnce();
  });

  it("still changes the current page when storage is unavailable", () => {
    save.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    theme.toggleTheme();
    expect(root.dataset.theme).toBe("dark");
    expect(dispatch).toHaveBeenCalledOnce();
  });
});
