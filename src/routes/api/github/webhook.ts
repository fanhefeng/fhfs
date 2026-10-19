import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/github/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => (await import("@/app/api/github/webhook/route")).POST(request),
    },
  },
});
