import { describe, expect, it } from "vite-plus/test";
import { shareImagePath, shareSignature, type SharePost } from "../shareImage";

describe("build-time share images", () => {
  const post: SharePost = { title: "文章", date: "2026-10-19", tags: ["React", "随笔"] };
  const counterpart: SharePost = { ...post, title: "An article" };
  const images = {
    "zh/article": {
      signature: shareSignature(post, counterpart),
      path: "/share-images/article.png",
    },
  };
  it("uses a snapshot only when both printed headlines and metadata still match", () => {
    expect(shareImagePath(images, "zh", "article", post, counterpart)).toBe(
      "/share-images/article.png",
    );
    for (const changed of [
      { ...post, title: "新标题" },
      { ...post, date: "2026-10-20" },
      { ...post, tags: ["其他"] },
    ]) {
      expect(shareImagePath(images, "zh", "article", changed, counterpart)).toBe(
        "/share-images/cover-zh.png",
      );
    }
    expect(
      shareImagePath(images, "zh", "article", post, { ...counterpart, title: "Updated" }),
    ).toBe("/share-images/cover-zh.png");
  });
  it("uses the locale cover for a missing, unpublished or new article", () => {
    expect(shareImagePath(images, "zh", "article")).toBe("/share-images/cover-zh.png");
    expect(shareImagePath(images, "en", "new", counterpart, post)).toBe(
      "/share-images/cover-en.png",
    );
  });
  it("matches the bilingual fallback and ignores tags that do not appear on the card", () => {
    expect(shareSignature(post, post)).toBe(shareSignature(post));
    expect(shareSignature({ ...post, tags: ["a", "b", "c", "d"] })).toBe(
      shareSignature({ ...post, tags: ["a", "b", "c", "e"] }),
    );
  });
});
