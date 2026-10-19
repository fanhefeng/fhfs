import { describe, expect, it } from "vite-plus/test";
import { FALLBACK_SITE_URL, siteUrl } from "@/lib/siteUrl";

describe("siteUrl", () => {
  it("defaults to this Worker even when a legacy platform variable is present", () => {
    expect(siteUrl({})).toBe(FALLBACK_SITE_URL);
    expect(siteUrl({ SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: " " })).toBe(FALLBACK_SITE_URL);
  });

  it("does not inherit another deployment's production domain", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "legacy.example" })).toBe(FALLBACK_SITE_URL);
  });

  it("lets SITE_URL override it", () => {
    expect(
      siteUrl({ SITE_URL: "https://a.example", VERCEL_PROJECT_PRODUCTION_URL: "b.example" }),
    ).toBe("https://a.example");
  });

  it("uses the public build origin before a server-only setting", () => {
    expect(
      siteUrl({ VITE_SITE_URL: "https://new.example/", SITE_URL: "https://other.example" }),
    ).toBe("https://new.example");
  });

  it("never ends in a slash — every caller appends a path", () => {
    expect(siteUrl({ SITE_URL: "https://a.example//" })).toBe("https://a.example");
    expect(FALLBACK_SITE_URL.endsWith("/")).toBe(false);
  });
});
