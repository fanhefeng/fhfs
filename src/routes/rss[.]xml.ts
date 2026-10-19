import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: { GET: async ({ request }) => (await import("@/app/rss.xml/route")).GET(request) },
  },
});
