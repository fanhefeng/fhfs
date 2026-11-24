import { describe, expect, it, vi } from "vite-plus/test";
import { articleShareTarget, shareArticle } from "@/lib/articleShare";

const origin = "https://articles.example.invalid";
const article = {
  locale: "zh" as const,
  slug: "fixture-article",
  title: "Fixture title",
  summary: "Fixture summary",
  isFallback: false,
};
const target = {
  url: `${origin}/zh/blog/fixture-article`,
  title: article.title,
  text: article.summary,
};

describe("article share target", () => {
  it("uses the displayed published edition's canonical path and copy", () => {
    expect(articleShareTarget(origin, article, false)).toEqual(target);
    expect(articleShareTarget(origin, { ...article, locale: "en" }, false)).toEqual({
      ...target,
      url: `${origin}/en/blog/fixture-article`,
    });
  });

  it("never emits a target for privileged preview or malformed slugs", () => {
    expect(articleShareTarget(origin, article, true)).toBeNull();
    expect(articleShareTarget(origin, { ...article, slug: "../admin" }, false)).toBeNull();
    expect(articleShareTarget(origin, { ...article, slug: "x?token=fixture" }, false)).toBeNull();
  });

  it("uses link-only behavior on snapshot and locale fallback despite visible old copy", () => {
    for (const post of [
      { ...article, snapshotAt: "2026-10-20T00:00:00.000Z" },
      { ...article, isFallback: true },
      { ...article, isFallback: true, snapshotAt: "2026-10-20T00:00:00.000Z" },
    ]) {
      expect(articleShareTarget(origin, post, false)).toEqual({ url: target.url });
      expect(articleShareTarget(origin, post, true)).toBeNull();
    }
  });
});

describe("article user sharing", () => {
  it("invokes native share with only the trusted target; does not preemptively copy", async () => {
    const share = vi.fn(async () => {});
    const clipboard = { writeText: vi.fn(async () => {}) };
    expect(await shareArticle(target, { share, clipboard })).toBe("shared");
    expect(share).toHaveBeenCalledExactlyOnceWith(target);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copies only the URL when native sharing is absent or genuinely fails", async () => {
    const failingNative = vi.fn().mockRejectedValue(new Error("unavailable"));
    const clipboard = { writeText: vi.fn(async () => {}) };
    expect(await shareArticle(target, { clipboard })).toBe("copied");
    expect(await shareArticle(target, { share: failingNative, clipboard })).toBe("copied");
    expect(clipboard.writeText.mock.calls).toEqual([[target.url], [target.url]]);
  });

  it("never writes to the clipboard on native cancellation", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("User cancelled", "AbortError"));
    const clipboard = { writeText: vi.fn(async () => {}) };
    expect(await shareArticle(target, { share, clipboard })).toBe("cancelled");
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it("opens manual copy mode if browser facilities are absent or denied", async () => {
    expect(await shareArticle(target, {})).toBe("manual");
    expect(
      await shareArticle(target, {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Not allowed")) },
      }),
    ).toBe("manual");
  });
  it.each(["different article", "privileged preview"])(
    "does not copy the old URL when native failure arrives after entering %s",
    async () => {
      let active = true;
      const native = Promise.withResolvers<void>();
      const share = vi.fn(() => native.promise);
      const clipboard = { writeText: vi.fn(async () => {}) };
      const pending = shareArticle(target, { share, clipboard }, () => active);
      expect(share).toHaveBeenCalledExactlyOnceWith(target);
      active = false;
      native.reject(new TypeError("Native share unavailable"));
      expect(await pending).toBe("cancelled");
      expect(clipboard.writeText).not.toHaveBeenCalled();
    },
  );

  it("does not return a manual-copy result after a late denial on the previous article", async () => {
    let active = true;
    const copy = Promise.withResolvers<void>();
    const clipboard = { writeText: vi.fn(() => copy.promise) };
    const pending = shareArticle(target, { clipboard }, () => active);
    expect(clipboard.writeText).toHaveBeenCalledExactlyOnceWith(target.url);
    active = false;
    copy.reject(new TypeError("Clipboard denied"));
    expect(await pending).toBe("cancelled");
  });
});
