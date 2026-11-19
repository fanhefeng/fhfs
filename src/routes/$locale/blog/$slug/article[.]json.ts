import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$locale/blog/$slug/article.json")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        (await import("@/app/[locale]/blog/[slug]/article.json/route")).GET(
          params.locale,
          params.slug,
        ),
    },
  },
});
