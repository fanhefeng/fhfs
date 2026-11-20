import qrcode from "qrcode-generator";
import { site } from "@/config/site";

export type ShareTarget = {
  path: `/${string}`;
  category: string;
  title: string;
  summary?: string;
};

const PAPER = "#faf9f6";
const INK = "#292823";
const MUTED = "#6c685f";
const ACCENT = "#aa5b1d";
const WIDTH = 800;
const MARGIN = 48;
const TEXT_WIDTH = WIDTH - MARGIN * 2;
const QR_SPACE = 336;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, limit: number) {
  const words = new Intl.Segmenter(undefined, { granularity: "word" });
  const graphemes = new Intl.Segmenter();
  const lines: string[] = [];
  let line = "";
  for (const { segment } of words.segment(text.trim().replace(/\s+/g, " "))) {
    const parts =
      ctx.measureText(segment).width > width
        ? Array.from(graphemes.segment(segment), ({ segment }) => segment)
        : [segment];
    for (const part of parts) {
      const next = line + part;
      if (ctx.measureText(next).width <= width) {
        line = line ? next : part.trimStart();
        continue;
      }
      if (lines.length === limit - 1) {
        const tail = Array.from(graphemes.segment(line.trimEnd()), ({ segment }) => segment);
        while (tail.length && ctx.measureText(tail.join("") + "…").width > width) tail.pop();
        return [...lines, tail.join("") + "…"];
      }
      lines.push(line.trimEnd());
      line = part.trimStart();
    }
  }
  if (line) lines.push(line.trimEnd());
  return lines;
}

/** Work in whole pixels and reserve a four-module quiet zone on each side. */
function drawQr(ctx: CanvasRenderingContext2D, qr: ReturnType<typeof qrcode>, top: number) {
  const count = qr.getModuleCount();
  const cell = Math.floor(QR_SPACE / (count + 8));
  const size = (count + 8) * cell;
  const left = WIDTH - MARGIN - size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(left, top, size, size);
  ctx.fillStyle = "#111111";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col))
        ctx.fillRect(left + (col + 4) * cell, top + (row + 4) * cell, cell, cell);
    }
  }
}

export async function renderShareCard(target: ShareTarget, url: string, scanLabel: string) {
  const fonts = getComputedStyle(document.documentElement);
  const sans = fonts.getPropertyValue("--font-stack-sans");
  const titleFont = `700 50px ${sans}`;
  const bodyFont = `400 30px ${sans}`;
  const labelFont = `600 24px ${sans}`;
  const summary = target.summary ?? "";
  await Promise.allSettled([
    document.fonts.load(titleFont, target.title.slice(0, 150)),
    document.fonts.load(bodyFont, summary.slice(0, 240)),
    document.fonts.load(labelFont, target.category + scanLabel + site.signName),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.font = titleFont;
  const titleLines = wrap(ctx, target.title, TEXT_WIDTH, 3);
  ctx.font = bodyFont;
  const summaryLines = wrap(ctx, summary, TEXT_WIDTH, 3);
  const titleTop = 118;
  const summaryTop = titleTop + titleLines.length * 62 + 16;
  const rule = summaryLines.length ? summaryTop + summaryLines.length * 42 + 23 : summaryTop + 16;
  const qrTop = rule + 28;
  canvas.width = WIDTH;
  canvas.height = qrTop + QR_SPACE + 30;
  ctx.textBaseline = "top";
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, canvas.width, 6);
  ctx.font = labelFont;
  ctx.fillText(wrap(ctx, target.category, 470, 1)[0] ?? "", MARGIN, 44);
  ctx.textAlign = "right";
  ctx.fillText(site.signName, WIDTH - MARGIN, 44);
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = titleFont;
  titleLines.forEach((line, i) => ctx.fillText(line, MARGIN, titleTop + i * 62));
  ctx.fillStyle = MUTED;
  ctx.font = bodyFont;
  summaryLines.forEach((line, i) => ctx.fillText(line, MARGIN, summaryTop + i * 42));
  ctx.fillStyle = "#d6cdbd";
  ctx.fillRect(MARGIN, rule, TEXT_WIDTH, 2);
  ctx.fillStyle = INK;
  ctx.font = labelFont;
  const scanWidth = TEXT_WIDTH - QR_SPACE - 32;
  wrap(ctx, scanLabel, scanWidth, 2).forEach((line, i) =>
    ctx.fillText(line, MARGIN, qrTop + 130 + i * 32),
  );
  ctx.fillStyle = MUTED;
  ctx.font = `400 21px ${sans}`;
  ctx.fillText(new URL(url).host, MARGIN, qrTop + 196, scanWidth);
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  drawQr(ctx, qr, qrTop);

  const png = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG generation failed"));
    }, "image/png");
  });
  return { png, qrSrc: qr.createDataURL(8) };
}
