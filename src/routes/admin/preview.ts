import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/preview")({
  server: {
    handlers: {
      GET: async ({ request }) => (await import("@/app/admin/preview/route")).GET(request),
    },
  },
});
