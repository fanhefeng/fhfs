import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import { ARC_L, ARC_R_BAR, NOTE_D, NOTE_T, GLYPH, WORD } from "../src/lib/neon/geometry.ts";
const dir = new URL("./assets/", import.meta.url);
// Adapted from the site's SVG geometry; source attribution in CREDITS.md.
const shapes =
  `<path d="${ARC_L}" fill="none" stroke="white" stroke-width="14" stroke-linecap="round"/><path d="${ARC_R_BAR}" fill="none" stroke="white" stroke-width="14" stroke-linecap="round"/><path d="${NOTE_D}" transform="${NOTE_T}" fill="none" stroke="white" stroke-width="9"/>` +
  WORD.map(
    ({ g, x, y }) =>
      `<path d="${GLYPH[g]}" transform="translate(${x} ${y})" fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>`,
  ).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="-49 100 900 900"><defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="13"/></filter><filter id="near" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter></defs><g style="color:#4a6cff"><g opacity=".65" filter="url(#glow)" stroke="#3969ff">${shapes.replaceAll("white", "#4269ff")}</g><g filter="url(#near)">${shapes.replaceAll("white", "#71a1ff")}</g><g>${shapes.replaceAll("white", "#b9d2ff")}</g><g opacity=".9">${shapes.replaceAll('stroke-width="14"', 'stroke-width="5"').replaceAll('stroke-width="9"', 'stroke-width="3"').replaceAll('stroke-width="8"', 'stroke-width="3"')}</g></g></svg>`;
await writeFile(new URL("neon.svg", dir), svg);
await writeFile(new URL("neon.png", dir), new Resvg(svg).render().asPng());
const avatar = await readFile(new URL("avatar.svg", dir), "utf8");
await writeFile(
  new URL("avatar.png", dir),
  new Resvg(avatar, { fitTo: { mode: "width", value: 850 } }).render().asPng(),
);
// Use the captured wall as a subdued plate, retaining its existing design.
await sharp(new URL("splash-source.png", dir).pathname)
  .extract({ left: 0, top: 0, width: 360, height: 1000 })
  .resize(1080, 3000)
  .png()
  .toFile(new URL("wall.png", dir).pathname);
console.log("Prepared site neon, avatar and wall assets.");
