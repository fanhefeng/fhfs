/** Regenerate the downloadable set from the exact geometry React renders. */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { iconAccents, iconPaths } from "../src/components/icons/paths.ts";

const directory = new URL("../public/icons/", import.meta.url);
await mkdir(directory, { recursive: true });
const labels = {
  brand: "断环印记",
  print: "打印",
  share: "分享",
  top: "回到顶部",
  home: "首页",
  overview: "内容总览",
  writing: "文章",
  notebook: "笔记",
  software: "软件",
  lab: "实验室",
  history: "版本履历",
  life: "生活",
  moments: "说说",
  secrets: "随笔",
  film: "电影",
  idol: "偶像",
  about: "关于",
  intro: "三维介绍",
  resume: "简历",
  sticker: "贴纸",
  copy: "文案",
  navigation: "导航设置",
  search: "搜索",
  close: "关闭",
  add: "添加",
  check: "完成",
  edit: "编辑",
  trash: "删除",
  preview: "预览",
  image: "图片",
  record: "唱片",
  music: "音乐",
  play: "播放",
  pause: "暂停",
  sound: "声音",
  muted: "静音",
  mail: "邮件",
  rss: "订阅",
  link: "链接",
  calendar: "日期",
  clock: "时间",
  globe: "语言",
  sun: "开灯",
  moon: "关灯",
  lock: "权限",
  upload: "上传",
  folder: "文件夹",
  tag: "标签",
  save: "保存",
  info: "提示",
  warning: "警告",
  menu: "菜单",
};
const attributes =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"';
const entries = Object.entries(iconPaths);
const geometry = (paths, name) =>
  paths.map((d) => `<path d="${d}"/>`).join("") +
  (iconAccents[name] ?? [])
    .map((d) => `<path stroke="var(--icon-accent, #aa5b1d)" d="${d}"/>`)
    .join("");
const svg = (paths, name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ${attributes}><title>${labels[name]}</title>${geometry(paths, name)}</svg>`;
for (const [name, paths] of entries)
  await writeFile(new URL(`${name}.svg`, directory), `${svg(paths, name)}\n`);
await writeFile(
  new URL("sprite.svg", directory),
  `<svg xmlns="http://www.w3.org/2000/svg">${entries.map(([name, paths]) => `<symbol id="${name}" ${attributes}>${geometry(paths, name)}</symbol>`).join("")}</svg>\n`,
);

const tiles = entries
  .map(
    ([name, paths]) =>
      `<li data-name="${name} ${labels[name]}"><a href="./${name}.svg" download="fhf-${name}.svg" aria-label="下载${labels[name]}图标">${svg(paths, name)}<span>${labels[name]}</span><small>${name}</small></a></li>`,
  )
  .join("\n");
await writeFile(
  new URL("index.html", directory),
  `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>fhf's · 配套图标</title><link rel="stylesheet" href="./catalogue.css"><script src="./catalogue.js" defer></script></head>
<body><main><header><div><h1>fhf's · 断环印记</h1><p>${entries.length} 枚图标，把站标的缺口、头像眼镜、纸页卷角和唱片封套收进同一套轮廓。栏目有自己的特征，操作保持好辨认。</p></div><button id="theme" type="button" aria-pressed="false">深色预览</button></header>
<div class="tools"><label>查找图标<input id="query" type="search" placeholder="名称或英文标识" autocomplete="off"></label><label>显示尺寸<select id="size"><option value="16">16 px</option><option value="20">20 px</option><option value="24" selected>24 px</option><option value="32">32 px</option></select></label><p id="count" role="status">${entries.length} 枚</p></div>
<button id="ink" type="button" aria-pressed="true">琥珀点缀：开</button>
<ul>${tiles}</ul><p id="empty" hidden>没有匹配的图标，试试其他名称。</p>
<footer><p>24 × 24 网格 · 1.65 px 线宽 · 圆端点 · 断环与琥珀收笔</p><p>点击图标下载 SVG。功能图标配合明确文字使用；霓虹音符、主题拨杆与动画菜单保留网站原有设计。默认不用装饰性箭头。</p><a href="./sprite.svg" download>下载 SVG Sprite</a> <a href="./specimen.svg" download>下载整套预览</a></footer></main></body></html>\n`,
);

// Keep the catalogue on the same self-hosted faces as the application.
await copyFile(
  new URL("../src/app/font-files/Nunito.woff2", import.meta.url),
  new URL("Nunito.woff2", directory),
);
await copyFile(
  new URL("../src/app/font-files/nunito-OFL.txt", import.meta.url),
  new URL("Nunito-OFL.txt", directory),
);
await copyFile(
  new URL("../public/fonts/rounded/v1/LICENSE.txt", import.meta.url),
  new URL("Rounded-OFL.txt", directory),
);
await writeFile(
  new URL("rounded.css", directory),
  await readFile(new URL("../src/app/rounded.css", import.meta.url), "utf8"),
);

const width = 1120;
const rowCount = Math.ceil(entries.length / 8);
await writeFile(
  new URL("specimen.svg", directory),
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${180 + rowCount * 125}" viewBox="0 0 ${width} ${180 + rowCount * 125}"><rect width="100%" height="100%" fill="#faf9f6"/><g fill="#1a1a1a" font-family="Arial, sans-serif"><text x="48" y="65" font-size="32" font-weight="600">fhf's · split-ring icons</text><text x="48" y="100" font-size="15" fill="#655e56">${entries.length} icons / 24 px grid / 1.65 px stroke / split-ring signature</text></g>${entries.map(([name, paths], i) => `<g transform="translate(${48 + (i % 8) * 130},${150 + Math.floor(i / 8) * 125})"><svg x="35" width="32" height="32" ${attributes} color="#292823">${geometry(paths, name)}</svg><text x="51" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#655e56">${name}</text></g>`).join("")}</svg>\n`,
);
console.log(`Exported ${entries.length} icons, sprite and specimen to public/icons.`);
