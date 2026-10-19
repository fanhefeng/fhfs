import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/preview/exit")({
  server: {
    handlers: {
      POST: async ({ request }) => (await import("@/app/admin/preview/exit/route")).POST(request),
    },
  },
});
