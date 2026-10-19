import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
        voidPlugin(),
        tailwindcss(),
        tanstackStart(),
        react(),
      ],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: /^shiki$/, replacement: "shiki/bundle/web" },
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
