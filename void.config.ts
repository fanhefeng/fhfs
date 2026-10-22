import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    name: "fhfs",
    account_id: "fb12b12d229e15430dd17b9af5d6f1fe",
    workers_dev: true,
    preview_urls: true,
    routes: [],
    compatibility_date: "2026-10-19",
    // The current workerd still bundles Brotli without the decoder security fix.
    // This app uses neither API; keep them disabled until upstream ships a fix.
    compatibility_flags: ["nodejs_compat", "no_nodejs_zlib", "no_brotli_content_encoding"],
    assets: { binding: "ASSETS" },
  },
});
