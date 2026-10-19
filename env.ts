import { defineEnv, string } from "void/env";

export default defineEnv({
  DATABASE_URL: string(),
  AUTH_SECRET: string(),
  ADMIN_PASSWORD_HASH: string(),
  MEDIA_UPLOAD_SECRET: string().optional(),
  GITHUB_TOKEN: string().optional(),
  GITHUB_WEBHOOK_SECRET: string().optional(),
  SITE_URL: string().optional(),
  VITE_SITE_URL: string().optional(),
});
