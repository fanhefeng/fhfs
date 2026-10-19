import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$locale/search.json")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/app/[locale]/search.json/route")).GET(request, {
          params: Promise.resolve(params),
        }),
    },
  },
});
