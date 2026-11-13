import { constants } from "node:zlib";

const [major, minor, patch] = process.versions.node.split(".").map(Number);
if (major !== 24 || minor < 22 || (minor === 22 && patch < 3)) {
  throw new Error(
    `Node.js ${process.versions.node} is unsupported. Use Node.js 24.22.3 or newer 24.x.`,
  );
}

// The Brotli version string stays 1.2.0 after Node backports the security fix.
if (!Object.hasOwn(constants, "BROTLI_DECODER_ERROR_FORMAT_BLOCK_SWITCH")) {
  throw new Error("This Node.js build is missing the CVE-2026-111497 Brotli decoder patch.");
}

console.log(
  `Verified patched Node.js ${process.versions.node} (Undici ${process.versions.undici}).`,
);
