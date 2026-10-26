import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// These published CLIs bundle Undici 7.29.1, outside pnpm's dependency graph.
// Replace only the bundled Undici entry with require("undici"). The offsets
// are the entry initializer's AST range in each exact, hash-verified release.
// Unknown versions/content fail closed and require an upstream security review.
const targets = [
  {
    name: "wrangler",
    version: "4.151.3",
    file: "wrangler-dist/cli.js",
    range: [2447459, 2456199],
    esm: false,
    original: "85a0fd68160392c7b9233a2a3406a94d61ab2a84d6dc192ebcb758774a76ee61",
    patched: "7508c11105390176b4285899ca6fdb4f7949dc6f82e73b7e691bb02ea78d086e",
  },
  {
    name: "@cloudflare/vite-plugin",
    version: "1.64.0",
    file: "dist/index.mjs",
    range: [1806500, 1814151],
    esm: true,
    original: "fe86b2c409772cb658564eec127c71b79f7e024acf4eeeff784e2ef1cafd8849",
    patched: "7d47275629d960f0922a797535bbc9ce7eaf9a1b8ada74bb3b7e9e7940f25597",
  },
  {
    name: "cf",
    version: "1.0.0-beta.18",
    file: "dist/wrangler-migration-R9TQ_4Qd.mjs",
    range: [565197, 569329],
    esm: true,
    original: "71158f42362fa0290ad17d1aceaf6551509c86714f6624ac1d6f6deb5fbd27e7",
    previousPatched: "9eb0cb520e6e2ae556b2a669191c67996bec844b9db83e1f72c48462f599105e",
    patched: "4241a394ffcf6bec54d61ae023a5012f9c633554842bced73e8dbeedbe511f74",
  },
];

const require = createRequire(import.meta.url);
const voidRequire = createRequire(require.resolve("void"));
const digest = (text) => createHash("sha256").update(text).digest("hex");
const prefix =
  'import { createRequire as fhfsCreateRequire } from "node:module";\n' +
  "const fhfsUndiciRequire = fhfsCreateRequire(import.meta.url);\n";

function insertImports(source) {
  // A shebang is valid only on the first line, including in imported ESM chunks.
  const start = source.startsWith("#!") ? source.indexOf("\n") + 1 : 0;
  return source.slice(0, start) + prefix + source.slice(start);
}

function checkSyntax(source, target) {
  const checked = spawnSync(
    process.execPath,
    ["--check", "--input-type", target.esm ? "module" : "commonjs"],
    { input: source, encoding: "utf8" },
  );
  assert.equal(checked.status, 0, `${target.name} security patch is invalid: ${checked.stderr}`);
}

export function checkBundledUndici({ repair = false } = {}) {
  for (const target of targets) {
    const installedManifest = voidRequire.resolve
      .paths(target.name)
      .map((path) => join(path, target.name, "package.json"))
      .find(existsSync);
    assert.ok(installedManifest, `Missing ${target.name}; run pnpm install`);
    // Direct dependencies can be pnpm symlinks: resolve their private dependency
    // tree from the actual package, rather than the root node_modules alias.
    const manifest = realpathSync(installedManifest);
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    assert.equal(pkg.version, target.version, `Review the bundled Undici fix for ${target.name}`);
    const dependency = createRequire(manifest);
    assert.equal(dependency("undici/package.json").version, "7.30.1");
    const file = join(dirname(manifest), target.file);
    const source = readFileSync(file, "utf8");
    const current = digest(source);
    if (current === target.patched) {
      checkSyntax(source, target);
      continue;
    }
    assert.ok(
      current === target.original || current === target.previousPatched,
      `Unexpected ${target.name} bundle; reinstall and review`,
    );
    assert.ok(repair, `${target.name} still bundles old Undici; run pnpm install`);
    const replacement = target.esm
      ? '() => fhfsUndiciRequire("undici")'
      : '() => require("undici")';
    // Repair the known earlier installation without accepting unknown content.
    const rewritten =
      current === target.previousPatched
        ? source.slice(prefix.length)
        : source.slice(0, target.range[0]) + replacement + source.slice(target.range[1]);
    const patched = target.esm ? insertImports(rewritten) : rewritten;
    assert.equal(digest(patched), target.patched, `Invalid ${target.name} security patch`);
    checkSyntax(patched, target);
    // Replace the file so pnpm hardlinks cannot modify a shared package store.
    const temporary = `${file}.fhfs-${process.pid}`;
    try {
      writeFileSync(temporary, patched, { mode: statSync(file).mode });
      renameSync(temporary, file);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
  console.log("Verified Wrangler, Cloudflare Vite plugin and cf use external Undici 7.30.1.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkBundledUndici({ repair: true });
}
