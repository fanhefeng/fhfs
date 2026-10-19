import "@tanstack/react-start/server-only";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "./env";
/**
 * Open Graph image toolkit — the paper palette.
 *
 * Satori only implements flexbox, so every
 * container in an OG route must set `display: "flex"` explicitly. It also
 * cannot read our CSS variables, hence the frozen colour copies below: they
 * mirror the light-theme tokens in globals.css and must be updated together.
 */

/** Palette — the light ("open gallery") theme, hard-copied for satori.
 *  Only the tokens the OG routes actually paint with; add more from
 *  globals.css as they become needed. */
export const OG = {
  paper: "#FAF9F6",
  ink: "#1A1A1A",
  inkSecondary: "rgba(26,26,26,0.72)",
  inkTertiary: "rgba(26,26,26,0.60)",
  /** The single accent: amber. */
  accent: "#B45309",
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Canvas: warm paper with one soft amber glow bleeding in from the top-left
 * — the same "lamp" the site's AuroraLayer casts, flattened to a gradient.
 * Kept to a single gradient layer because that is the shape satori is known
 * to handle here.
 */
export const OG_BG =
  "radial-gradient(ellipse 110% 85% at 6% -12%, rgba(180,83,9,0.16), transparent 62%)";

/**
 * Font stack for every text node in an OG image: Latin from Nunito, CJK from
 * Resource Han Rounded, matching the site's Chinese. Satori resolves per glyph and falls back family by family,
 * then picks the nearest registered weight inside a family.
 */
export const OG_FONT_FAMILY = "Nunito, RoundedSC";

type OgWeight = 400 | 500 | 600 | 700;

export type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: OgWeight;
  style: "normal";
};

/** prepare-assets copies these licensed fonts outside the Worker script. */
const files = {
  latinBody: "/og-fonts/Nunito-400.woff",
  latinDisplay: "/og-fonts/Nunito-700.woff",
  cjkBody: "/og-fonts/RoundedSC-400.woff",
  cjkDisplay: "/og-fonts/RoundedSC-600.woff",
} as const;

const loaded = new Map<keyof typeof files, ArrayBuffer>();

async function load(key: keyof typeof files): Promise<ArrayBuffer> {
  const existing = loaded.get(key);
  if (existing) return existing;
  const request = new Request(new URL(files[key], getRequest().url));
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) throw new Error(`Bundled OG font could not be loaded: ${key}`);
  const data = await response.arrayBuffer();
  loaded.set(key, data);
  return data;
}

/** Latin-extended is in Nunito; CJK and fullwidth punctuation need RoundedSC. */
const CJK_RE = /\p{Script=Han}|[⺀-⿿　-〿︰-﹏＀-￯]/u;

export async function loadOgFonts(displayText: string, bodyText: string): Promise<OgFont[]> {
  const jobs: Promise<OgFont>[] = [];
  const push = (key: keyof typeof files, name: string, weight: OgWeight) => {
    jobs.push(load(key).then((data) => ({ name, data, weight, style: "normal" as const })));
  };
  push("latinDisplay", "Nunito", 700);
  push("latinBody", "Nunito", 400);
  if (CJK_RE.test(displayText)) push("cjkDisplay", "RoundedSC", 600);
  if (CJK_RE.test(bodyText)) push("cjkBody", "RoundedSC", 400);
  return Promise.all(jobs);
}
