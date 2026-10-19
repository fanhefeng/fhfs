import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/preview/markdown")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        (await import("@/app/admin/preview/markdown/route")).POST(request),
    },
  },
});
