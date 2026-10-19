import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    name: "fhfs",
    account_id: "fb12b12d229e15430dd17b9af5d6f1fe",
    workers_dev: true,
    compatibility_date: "2026-10-19",
    compatibility_flags: ["nodejs_compat"],
    assets: { binding: "ASSETS" },
  },
});
