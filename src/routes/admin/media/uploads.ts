import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/media/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => (await import("@/app/admin/media/uploads/route")).POST(request),
    },
  },
});
