import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/media/cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => (await import("@/app/api/media/cleanup/route")).POST(request),
    },
  },
});
