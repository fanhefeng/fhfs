import "@tanstack/react-start/server-only";

const assetFiles = new Map([
  [
    "/share-images/cover-zh.png",
    () => import("../../../.generated/public/share-images/cover-zh.png?inline"),
  ],
  [
    "/share-images/cover-en.png",
    () => import("../../../.generated/public/share-images/cover-en.png?inline"),
  ],
  [
    "/share-images/admin-icon.png",
    () => import("../../../.generated/public/share-images/admin-icon.png?inline"),
  ],
]);

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  MEDIA_UPLOAD_SECRET: process.env.MEDIA_UPLOAD_SECRET,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  SITE_URL: process.env.SITE_URL,
  ASSETS: {
    async fetch(request: Request) {
      const load = assetFiles.get(new URL(request.url).pathname);
      if (!load) return new Response(null, { status: 404 });
      const { default: dataUrl } = await load();
      return fetch(dataUrl);
    },
  },
};
