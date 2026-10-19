import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/apple-icon")({
  server: {
    handlers: { GET: async () => (await import("@/lib/server/ogRoute")).adminIcon() },
  },
});
