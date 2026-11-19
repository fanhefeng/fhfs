import { describe, expect, it, vi } from "vite-plus/test";
import { GET } from "@/app/[locale]/rss.xml/route";
import { getPosts } from "@/lib/server/content";
import { PublicReadError } from "@/lib/server/publicRead";
import { site } from "@/config/site";

vi.mock("@/lib/server/content", () => ({ getPosts: vi.fn() }));
vi.mock("@/i18n/server", () => ({ getTranslations: async () => () => "(Chinese)" }));

function request(locale: string) {
  return GET(new Request(`${site.url}/${locale}/rss.xml`), { params: Promise.resolve({ locale }) });
}

describe("RSS reads", () => {
  it("reports a temporary upstream outage without serving an empty subscription", async () => {
    vi.mocked(getPosts).mockRejectedValueOnce(new PublicReadError());
    const response = await request("zh");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("<rss");
  });

  it("uses the edition's canonical URL as the item ID and leaves out undated entries", async () => {
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
    vi.mocked(getPosts).mockResolvedValueOnce([post, { ...post, slug: "undated", date: null }]);
    const response = await request("en");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    const xml = await response.text();
    expect(xml).toContain(`${site.url}/en/rss.xml`);
    expect(xml).toContain(`<guid isPermaLink="false">${site.url}/zh/blog/fixture</guid>`);
    expect(xml).toContain("<![CDATA[Article & notes (Chinese)]]>");
    expect(xml).not.toContain("undated");
  });
});
