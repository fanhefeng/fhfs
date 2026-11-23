import { describe, expect, it, vi } from "vite-plus/test";
import { GET } from "@/app/[locale]/rss.xml/route";
import { site } from "@/config/site";
import { getPosts } from "@/lib/server/content";
import { PublicReadError } from "@/lib/server/publicRead";

vi.mock("@/lib/server/content", () => ({ getPosts: vi.fn() }));
vi.mock("@/i18n/server", () => ({ getTranslations: async () => () => "(Chinese)" }));

const post = {
  slug: "fixture",
  locale: "zh" as const,
  title: "Article & notes",
  summary: "Summary",
  date: "2026-11-12",
  tags: [],
  readingMinutes: 1,
  isFallback: true,
};

function request(locale: string) {
  return GET(new Request(`${site.url}/${locale}/rss.xml`), {
    params: Promise.resolve({ locale }),
  });
}

describe("RSS reads", () => {
  it.each(["fr", "admin"])("rejects unsupported locale %s before content reads", async (locale) => {
    vi.mocked(getPosts).mockClear();
    expect((await request(locale)).status).toBe(404);
    expect(getPosts).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "returns a retryable 503 when the public read failed (%s)",
    async (eligible) => {
      vi.mocked(getPosts).mockRejectedValueOnce(new PublicReadError(eligible));
      const response = await request("zh");
      expect(response.status).toBe(503);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("retry-after")).toBe("120");
      expect(response.headers.has("x-fhfs-content-status")).toBe(false);
      expect(await response.text()).toBe("Feed temporarily unavailable");
    },
  );

  it("keeps a usable published snapshot and its canonical edition in RSS", async () => {
    vi.mocked(getPosts).mockResolvedValueOnce([
      { ...post, snapshotAt: "2026-10-20T03:09:06Z" },
      { ...post, slug: "undated", date: null },
    ]);
    const response = await request("en");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    const xml = await response.text();
    expect(xml).toContain(`${site.url}/en/rss.xml`);
    expect(xml).toContain(`<guid isPermaLink="false">${site.url}/zh/blog/fixture</guid>`);
    expect(xml).toContain("<![CDATA[Article & notes (Chinese)]]>");
    expect(xml).not.toContain("undated");
  });

  it("accepts an intentionally empty successful feed", async () => {
    vi.mocked(getPosts).mockResolvedValueOnce([]);
    const response = await request("zh");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<rss");
  });

  it("does not swallow unexpected errors", async () => {
    const error = new Error("unexpected");
    vi.mocked(getPosts).mockRejectedValueOnce(error);
    await expect(request("zh")).rejects.toBe(error);
  });
});
