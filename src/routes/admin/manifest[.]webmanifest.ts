import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/manifest.webmanifest")({
  server: {
    handlers: { GET: async () => (await import("@/app/admin/manifest.webmanifest/route")).GET() },
  },
});
