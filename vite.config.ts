import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const rawPublic = fileURLToPath(new URL("./public", import.meta.url)).replace(/\/$/, "");
const generatedPublic = fileURLToPath(new URL("./.generated/public", import.meta.url));
const vercel = process.env.FHFS_TARGET === "vercel";
const nitro = vercel && !process.env.VITEST ? (await import("nitro/vite")).nitro : undefined;
const motionEntry = fileURLToPath(new URL("./src/lib/client/gsap.ts", import.meta.url));
const motionSsr = fileURLToPath(new URL("./src/lib/client/gsap-ssr.ts", import.meta.url));

export default defineConfig({
  publicDir: ".generated/public",
  plugins: process.env.VITEST
    ? []
    : [
        {
          name: "fhfs-motion-ssr",
          enforce: "pre",
          resolveId(id, importer) {
            if (
              this.environment.name !== "client" &&
              (id === motionEntry ||
                id === motionEntry.slice(0, -3) ||
                (id === "./gsap" && importer?.endsWith("/gsap-extras.ts")))
            )
              return motionSsr;
          },
        },
        ...(vercel ? [] : [voidPlugin()]),
        tailwindcss(),
        tanstackStart(),
        ...(nitro
          ? [
              nitro({
                preset: "vercel",
                publicAssets: [{ dir: generatedPublic }],
                hooks: {
                  "build:before": (context) => {
                    // Do not serve the unprocessed public tree alongside hashed assets.
                    context.options.publicAssets = context.options.publicAssets.filter(
                      ({ dir }) => dir !== rawPublic,
                    );
                  },
                },
              }),
            ]
          : []),
        react(),
      ],
  resolve: {
    alias: [
      ...(vercel
        ? [
            {
              find: /^cloudflare:workers$/,
              replacement: fileURLToPath(
                new URL("./src/lib/server/vercelBindings.ts", import.meta.url),
              ),
            },
          ]
        : []),
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: /^shiki$/, replacement: "shiki/bundle/web" },
      // Workers require precompiled WASM modules, not runtime compilation of bytes.
      ...(process.env.VITEST || vercel
        ? []
        : [{ find: "shiki/wasm", replacement: "shiki/onig.wasm" }]),
    ],
  },
  lint: {
    plugins: ["react", "typescript", "unicorn", "oxc", "jsx-a11y"],
    categories: { correctness: "error" },
    rules: {
      "react/exhaustive-deps": "error",
      "react/rules-of-hooks": "error",
      "react/react-in-jsx-scope": "off",
      "react/set-state-in-effect": "off",
      "react/refs": "off",
      "react/immutability": "off",
      "jsx-a11y/prefer-tag-over-role": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "jsx-a11y/no-noninteractive-tabindex": "off",
      "jsx-a11y/no-autofocus": "off",
    },
    ignorePatterns: ["dist", ".void", ".tanstack", "src/routeTree.gen.ts", "public"],
  },
  fmt: {
    printWidth: 100,
    sortPackageJson: false,
    ignorePatterns: [
      "dist",
      ".void",
      ".tanstack",
      "node_modules",
      "pnpm-lock.yaml",
      "drizzle/meta",
      "public",
      "src/routeTree.gen.ts",
      "src/lib/assets.gen.json",
      "src/app/rounded.css",
      "src/app/yozai.css",
      "*.md",
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
