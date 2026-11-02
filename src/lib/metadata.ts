import { site } from "@/config/site";
export type Metadata = {
  title?: string | { default: string; template?: string };
  description?: string;
  alternates?: {
    canonical?: string;
    languages?: Record<string, string>;
    types?: Record<string, string>;
  };
  robots?: { index?: boolean; follow?: boolean };
  openGraph?: { type?: string; siteName?: string; locale?: string };
  metadataBase?: string;
  manifest?: string;
  appleWebApp?: { capable?: boolean; title?: string; statusBarStyle?: string };
};
export type Viewport = Record<string, unknown>;
export namespace MetadataRoute {
  export type Sitemap = Array<{
    url: string;
    lastModified?: string | Date;
    changeFrequency?: string;
    priority?: number;
    alternates?: { languages?: Record<string, string> };
  }>;
  export type Robots = {
    rules: { userAgent: string; allow?: string | string[]; disallow?: string | string[] };
    sitemap?: string;
  };
}
export function routeHead(metadata?: Metadata, admin = false) {
  const title =
    typeof metadata?.title === "string" ? `${metadata.title} | ${site.signName}` : site.title.zh;
  const description = metadata?.description ?? site.description.zh;
  const canonical = metadata?.alternates?.canonical?.toString();
  const path = canonical ? new URL(canonical).pathname : "/zh";
  const imagePath = /^\/(zh|en)\/blog\/(?!notes$)[^/]+$/.test(path)
    ? path
    : `/${path.split("/")[1] || "zh"}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: `${site.url}${imagePath}/opengraph-image` },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: site.signName },
      ...(canonical ? [{ property: "og:url", content: canonical }] : []),
      ...(admin ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      ...(canonical ? [{ rel: "canonical", href: canonical }] : []),
      ...Object.entries(metadata?.alternates?.languages ?? {}).map(([hrefLang, href]) => ({
        rel: "alternate",
        hrefLang,
        href,
      })),
      ...Object.entries(metadata?.alternates?.types ?? {}).map(([type, href]) => ({
        rel: "alternate",
        type,
        href,
      })),
    ],
  };
}
