import "@tanstack/react-start/server-only";
import { env as bindings } from "cloudflare:workers";

// Native bindings work in both TanStack server functions and Worker handlers.
// env.ts at the project root is Void's deployment validation schema.
export const env = bindings as unknown as {
  DATABASE_URL: string;
  AUTH_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  MEDIA_UPLOAD_SECRET?: string;
  GITHUB_TOKEN?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  SITE_URL?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
};
