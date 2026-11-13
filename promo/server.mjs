import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function serve(port = 4190) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const repo = path.dirname(root);
  const mime = {
    ".html": "text/html",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".css": "text/css",
    ".mp4": "video/mp4",
    ".wav": "audio/wav",
  };
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        const name = decodeURIComponent(url.pathname);
        let file;
        if (name === "/rounded.css") {
          const css = await readFile(path.join(repo, "src/app/rounded.css"), "utf8");
          res.writeHead(200, { "Content-Type": "text/css" });
          res.end(css.replaceAll(/\/fonts\/rounded\/_[^/]+\//g, "/fonts/rounded/"));
          return;
        }
        if (/^\/fonts\/rounded\/v1\/[\w.-]+$/.test(name)) file = path.join(repo, "public", name);
        else if (/^\/fonts\/latin\/[\w.-]+$/.test(name))
          file = path.join(repo, "src/app/font-files", path.basename(name));
        else {
          const relative = name === "/" ? "index.html" : name.slice(1);
          file = path.resolve(root, relative);
          if (
            !file.startsWith(root + path.sep) ||
            relative.split("/").some((p) => p.startsWith("."))
          ) {
            res.writeHead(403);
            res.end();
            return;
          }
        }
        const bytes = await readFile(file);
        const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
        if (range) {
          const start = Number(range[1]),
            end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
          res.writeHead(206, {
            "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
            "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
          });
          res.end(bytes.subarray(start, end + 1));
        } else {
          res.writeHead(200, {
            "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
            "Cache-Control": "no-store",
            "Content-Length": bytes.length,
            "Accept-Ranges": "bytes",
          });
          res.end(bytes);
        }
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await serve(Number(process.argv[2] ?? 4190));
  console.log("Preview: http://127.0.0.1:4190");
}
