import { createFileRoute } from "@tanstack/react-router";
import { site } from "@/config/site";
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${site.url}/sitemap.xml\n`,
          { headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
