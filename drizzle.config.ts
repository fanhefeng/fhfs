import { defineConfig } from "drizzle-kit";

// Select a deliberately provisioned direct connection for migration tooling.
const url = process.env.DRIZZLE_MIGRATION_DATABASE_URL;
if (!url) throw new Error("Set an explicit DRIZZLE_MIGRATION_DATABASE_URL");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // No `casing` option on purpose: every multi-word column in schema.ts names
  // itself explicitly, so there is no convention to keep in sync with the
  // runtime handle in src/db/index.ts.
  dbCredentials: { url },
});
