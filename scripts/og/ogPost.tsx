import React from "react";
import { renderOgImage } from "./ogResponse";
import { site } from "@/config/site";
import type { SharePost } from "../../src/lib/shareImage";
import { loadOgFonts, OG, OG_BG, OG_FONT_FAMILY, OG_SIZE } from "./og";
import { OgSignMark } from "./ogMark";

export const size = OG_SIZE;
export const contentType = "image/png";

/** CJK glyphs occupy roughly a full em — count them double when fitting. */
function visualLength(text: string) {
  let n = 0;
  for (const ch of text) n += /[　-鿿＀-￯]/.test(ch) ? 2 : 1;
  return n;
}

/** One headline, four steps — keeps long titles inside three lines. */
function titleSize(text: string) {
  const n = visualLength(text);
  if (n <= 20) return 78;
  if (n <= 36) return 64;
  if (n <= 56) return 52;
  return 44;
}

export default async function PostOgImage({
  post,
  counterpart,
}: {
  post: SharePost;
  counterpart?: SharePost;
}) {
  const title = post.title;
  const subtitle = counterpart && counterpart.title !== title ? counterpart.title : null;

  const date = post ? post.date.replaceAll("-", ".") : "";
  const meta = [date, ...(post?.tags ?? []).slice(0, 3)].filter(Boolean).join("  ·  ");
  const host = new URL(site.url).host;

  const fonts = await loadOgFonts(`${title}${site.signName}`, `${subtitle ?? ""}${meta}${host}`);

  return renderOgImage(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "68px 84px",
        backgroundColor: OG.paper,
        backgroundImage: OG_BG,
        color: OG.ink,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      {/* Meta line: date · tags, led by the site's mark. */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <OgSignMark size={44} />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: 2,
            color: OG.inkTertiary,
          }}
        >
          {meta}
        </div>
      </div>

      {/* Headline block. */}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
        <div
          style={{
            display: "flex",
            fontSize: titleSize(title),
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.18,
            color: OG.ink,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.4,
              color: OG.inkSecondary,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {/* Footer: wordmark, amber rule, host. */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: -1.5,
            color: OG.ink,
          }}
        >
          {site.signName}
        </div>
        <div
          style={{
            display: "flex",
            width: 44,
            height: 4,
            borderRadius: 2,
            background: OG.accent,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: 3,
            color: OG.inkTertiary,
          }}
        >
          {host}
        </div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
