import { createStart, createMiddleware } from "@tanstack/react-start";
import { contentSecurityPolicy } from "@/config/csp";
import { env } from "@/lib/server/env";
const security = createMiddleware().server(async ({ request, pathname, next }) => {
  // Both sites use the original admin by default. Its Next cache is
  // invalidated there; this site's public cache sees the edit within 30s.
  // The migrated native admin is opt-in until fhfs-site has a cross-site
  // invalidation endpoint. Do not allow writes to leave that site stale.
  if (pathname.startsWith("/admin") && env.ADMIN_MODE !== "local") {
    if (request.method !== "GET" && request.method !== "HEAD")
      return new Response("Use the shared admin", { status: 403 });
    const target = new URL(request.url);
    target.protocol = "https:";
    target.host = "fhfs-site.vercel.app";
    target.port = "";
    return Response.redirect(target, 307);
  }
  const path = pathname;
  // Reuse the original site's image renderer alongside its database/media.
  if (/^\/(zh|en)(?:\/blog\/[^/]+)?\/opengraph-image$/.test(path) || path === "/admin/apple-icon") {
    const image = await fetch(`https://fhfs-site.vercel.app${path}`, { redirect: "follow" });
    return new Response(image.body, { status: image.status, headers: image.headers });
  }
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
  const result = await next();
  const response = result.response;
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy({ dev: import.meta.env.DEV }));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
export const startInstance = createStart(() => ({ requestMiddleware: [security] }));
