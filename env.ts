import { defineEnv, string, oneOf } from "void/env";

export default defineEnv({
  DATABASE_URL: string(),
  ADMIN_MODE: oneOf(["shared", "local"]).default("shared"),
  AUTH_SECRET: string().optional(),
  ADMIN_PASSWORD_HASH: string().optional(),
  MEDIA_UPLOAD_SECRET: string().optional(),
  GITHUB_TOKEN: string().optional(),
  GITHUB_WEBHOOK_SECRET: string().optional(),
  SITE_URL: string().optional(),
});
