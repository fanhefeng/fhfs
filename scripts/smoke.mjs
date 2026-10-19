import assert from "node:assert/strict";

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
  const login = new URL(response.headers.get("location"), base);
  assert.equal(login.origin, base.origin, `${path} stays on this deployment`);
  assert.equal(login.pathname, "/admin/login");
}
assert.equal((await read("/admin/login", { redirect: "manual" })).status, 200);
const article = paths.find((path) => /^\/zh\/blog\/[^/]+$/.test(path));
assert.ok(article, "sitemap includes a published article");
for (const path of [
  "/zh/opengraph-image",
  "/en/opengraph-image",
  `${article}/opengraph-image`,
  "/admin/apple-icon",
]) {
  const response = await read(path);
  if (!response.ok) {
    const body = await response.text();
    const reason = body.match(/<title>(.*?)<\/title>/s)?.[1] ?? body.slice(0, 250);
    assert.fail(`${path}: HTTP ${response.status}: ${reason}`);
  }
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type"), /^image\/png/);
  const png = new Uint8Array(await response.arrayBuffer());
  assert.deepEqual(
    Array.from(png.subarray(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10],
    `${path} is a PNG`,
  );
}
for (const path of ["/fr/opengraph-image", "/zh/blog/invalid.slug/opengraph-image"])
  assert.equal((await read(path)).status, 404, path);
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
  `Verified ${checked} sitemap pages, bilingual feeds/search, local share images, 404s, native admin auth, CSRF, assets, and security headers.`,
);
