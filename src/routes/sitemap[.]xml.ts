import { createFileRoute } from "@tanstack/react-router";
const xml = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const rows = await (await import("@/app/sitemap")).default();
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
            rows
              .map(
                (row) =>
                  "<url><loc>" +
                  xml(row.url) +
                  "</loc>" +
                  Object.entries(row.alternates?.languages ?? {})
                    .map(
                      ([lang, href]) =>
                        '<xhtml:link rel="alternate" hreflang="' +
                        xml(lang) +
                        '" href="' +
                        xml(href) +
                        '"/>',
                    )
                    .join("") +
                  "</url>",
              )
              .join("") +
            "</urlset>",
          { headers: { "Content-Type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
