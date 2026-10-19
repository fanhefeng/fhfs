import assert from "node:assert/strict";

const sharedAdmin = process.argv.includes("--shared-admin");
const base = new URL(process.argv[2] ?? "http://127.0.0.1:4173");
const read = async (path, options) =>
  fetch(new URL(path, base), { signal: AbortSignal.timeout(30_000), ...options });
const sitemap = await read("/sitemap.xml");
assert.equal(sitemap.status, 200, "sitemap responds");
const xml = await sitemap.text();
const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => new URL(match[1].replaceAll("&amp;", "&")).pathname,
);
assert.ok(paths.length > 50, "sitemap includes public content and studies");
let checked = 0;
const failures = [];
for (let i = 0; i < paths.length; i += 4) {
  await Promise.all(
    paths.slice(i, i + 4).map(async (path) => {
      const response = await read(path);
      const html = await response.text();
      if (
        response.status !== 200 ||
        !html.includes("<main") ||
        /s:"error"|The page could not be loaded/.test(html)
      )
        failures.push(`${path}: ${response.status}`);
      checked++;
    }),
  );
}
for (const locale of ["zh", "en"]) {
  const rss = await read(`/${locale}/rss.xml`);
  assert.equal(rss.status, 200);
  assert.match(await rss.text(), /<rss/);
  const search = await read(`/${locale}/search.json`);
  assert.equal(search.status, 200);
  assert.ok(Array.isArray(await search.json()));
}
for (const path of ["/fr", "/fr/search.json", "/fr/rss.xml", "/zh/blog/this-page-does-not-exist"])
  assert.equal((await read(path)).status, 404, path);
for (const path of ["/admin", "/admin/posts", "/admin/copy", "/admin/posts/new"]) {
  const response = await read(path, { redirect: "manual" });
  assert.ok([302, 303, 307].includes(response.status), `${path} must require login`);
  assert.match(
    response.headers.get("location"),
    sharedAdmin ? /^https:\/\/fhfs-site\.vercel\.app\/admin/ : /\/admin\/login/,
  );
}
assert.equal((await read("/admin/login", { redirect: "manual" })).status, sharedAdmin ? 307 : 200);
assert.equal(
  (
    await read("/admin/media/uploads", {
      method: "POST",
      headers: { Origin: "https://other.example", "Content-Type": "application/json" },
      body: "{}",
    })
  ).status,
  403,
);
const manifest = await import("../src/lib/assets.gen.json", { with: { type: "json" } });
const [file, hash] = Object.entries(manifest.default.files).find(([name]) => name.endsWith(".jpg"));
const at = file.lastIndexOf(".");
assert.equal(
  (await read(`${file.slice(0, at)}.${hash}${file.slice(at)}`)).status,
  200,
  "hashed image",
);
const home = await read("/zh");
assert.match(home.headers.get("content-security-policy"), /frame-ancestors 'none'/);
assert.match(home.headers.get("cache-control"), /no-store/);
assert.deepEqual(failures, []);
console.log(
  `Verified ${checked} sitemap pages, bilingual feeds/search, 404s, auth redirects, CSRF, assets, and security headers.`,
);
