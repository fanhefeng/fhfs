import { createStart, createMiddleware } from "@tanstack/react-start";
import { contentSecurityPolicy } from "@/config/csp";
const security = createMiddleware().server(async ({ request, pathname, next }) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    (pathname.startsWith("/admin") || pathname.startsWith("/_server"))
  ) {
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return new Response("Forbidden", { status: 403 });
  }
  const { withContentCacheBypass } = await import("@/lib/server/cacheScope");
  const { showDrafts } = await import("@/lib/server/auth/session");
  const { setResponseHeaders } = await import("@tanstack/react-start/server");
  // Let Start reconcile headers without replacing its redirect/stream metadata.
  setResponseHeaders(
    new Headers({
      "content-security-policy": contentSecurityPolicy({ dev: import.meta.env.DEV }),
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "cache-control": "private, no-store",
    }),
  );
  const bypass = pathname.startsWith("/admin") || (await showDrafts());
  return withContentCacheBypass(bypass, next);
});
export const startInstance = createStart(() => ({ requestMiddleware: [security] }));
