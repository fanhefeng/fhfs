import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$locale/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/app/[locale]/rss.xml/route")).GET(request, {
          params: Promise.resolve(params),
        }),
    },
  },
});
