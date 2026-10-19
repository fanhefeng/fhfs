import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$locale/blog/$slug/opengraph-image")({
  server: {
    handlers: {
      GET: async ({ params }) =>
        (await import("@/lib/server/ogRoute")).openGraphImage(params.locale, params.slug),
    },
  },
});
