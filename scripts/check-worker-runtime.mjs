import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { brotliCompressSync, gzipSync } from "node:zlib";
import config from "../void.config.ts";
import { checkBundledUndici } from "./patch-bundled-undici.mjs";

checkBundledUndici();

// Exercise the same native runtime used by Void with this app's actual flags.
// Use fixed valid data and a loopback upstream; no production services or data.
const require = createRequire(import.meta.url);
const voidRequire = createRequire(require.resolve("void"));
const { Miniflare, convertV4MiniflareOptions } = await import(voidRequire.resolve("miniflare"));
const cloudflare = config.cloudflare;
for (const flag of ["no_nodejs_zlib", "no_brotli_content_encoding"]) {
  assert.ok(cloudflare.compatibility_flags.includes(flag), `Missing Workers safety flag: ${flag}`);
}

const plain = "fhfs runtime safety";
const bodies = {
  br: brotliCompressSync(Buffer.from(plain)),
  gzip: gzipSync(Buffer.from(plain)),
};
const server = createServer((request, response) => {
  const format = request.url.slice(1);
  const body = bodies[format];
  if (!body) return response.writeHead(404).end();
  response.writeHead(200, { "content-encoding": format, "content-length": body.length });
  response.end(body);
});
let mf;
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  mf = new Miniflare(
    convertV4MiniflareOptions({
      compatibilityDate: cloudflare.compatibility_date,
      compatibilityFlags: cloudflare.compatibility_flags,
      modules: true,
      script: `export default { async fetch() {
        const result = {};
        for (const format of ["br", "brotli"]) {
          try { new DecompressionStream(format); result[format] = "enabled"; }
          catch { result[format] = "disabled"; }
        }
        for (const format of ["br", "gzip"]) {
          const response = await fetch(${JSON.stringify(origin)} + "/" + format);
          result[format + "Fetch"] = await response.text();
        }
        try {
          const zlib = await import("node:zlib");
          zlib.brotliDecompressSync(new Uint8Array(${JSON.stringify([...bodies.br])}));
          result.zlib = "enabled";
        } catch (error) { result.zlib = error.message; }
        return Response.json(result);
      }};`,
    }),
  );
  const result = await (await mf.dispatchFetch("https://worker.example")).json();
  assert.equal(result.br, "disabled");
  assert.equal(result.brotli, "disabled");
  assert.notEqual(result.brFetch, plain, "Workers fetch must not decode Brotli");
  assert.match(result.zlib, /Compatibility flag "nodejs_zlib" is not enabled/);
  assert.equal(result.gzipFetch, plain, "Workers fetch must still decode gzip");
  console.log("Verified Workers: Brotli decoding and node:zlib disabled; gzip works.");
} finally {
  try {
    await mf?.dispose();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
