/**
 * The admin's own table of contents, grouped the way the front of the site is.
 *
 * Find editors by the public page they affect. Shared settings have their
 * own group, and changing a public link's visibility leaves its editor here.
 *
 * `/admin/works` is deliberately not listed. The shelf the old /portfolio read
 * is kept — the table, the editor, `saveWork` — for the day a first work is
 * hung (docs/DESIGN-LOG.md, 09-14), but it is empty and nothing out front reads
 * it, so it left the sidebar and the dashboard (2026-09-29) rather than sit
 * there as a section with nothing to do. Its editor still answers at its
 * address.
 *
 * Like `./styles`, this file has no runtime imports, for the same reason: the
 * sidebar is a client component, and reaching for `@/db/schema` to name a table
 * here would drag the whole drizzle schema into the browser. The tables live in
 * `./counts`, which is server-only.
 */

import type { IconName } from "@/components/icons/Icon";

export type AdminSection = {
  /** Where the editor for it lives. Also its identity in `counts`. */
  href: string;
  label: string;
  icon: IconName;
  /** Short task description for the overview, separate from editor guidance. */
  summary: string;
  /** What editing it actually changes, in one line — shown under the title. */
  blurb: string;
  /** The page out front, as a path under `/zh`, or null when it has none. */
  view: string | null;
  /** The unit its count is spoken in: 6 篇, 242 条, 23 张. */
  unit: string;
  /** Companion editors for a single public page. */
  tools?: readonly { href: string; label: string }[];
};

/** Row counts keyed by section href. Filled in by `./counts`, which is the
 *  server half — the type lives here so the sidebar can name it without
 *  importing a module that pulls in the database. */
export type SectionCounts = { [href: string]: number };

export type AdminGroup = {
  id: string;
  label: string;
  /** The group's own line, on the dashboard. */
  caption: string;
  sections: AdminSection[];
};

export const SECTION_GROUPS: AdminGroup[] = [
  {
    id: "issue",
    label: "首页与作品",
    caption: "首页、文章、软件和实验室。",
    sections: [
      {
        href: "/admin/home",
        label: "首页",
        icon: "home",
        summary: "开场与首页内容",
        blurb: "开场、首页文案、最新文章和软件。",
        view: "/",
        unit: "",
      },
      {
        href: "/admin/posts",
        label: "文章",
        icon: "writing",
        summary: "文章、技术笔记与双语版本",
        blurb: "管理网站文章和导入的技术笔记。中英文版本分开编辑。",
        view: "/blog",
        unit: "篇",
        tools: [{ href: "/admin/copy?ns=blog", label: "页面文案" }],
      },
      {
        href: "/admin/apps",
        label: "软件",
        icon: "software",
        summary: "应用介绍与仓库信息",
        blurb: "/software 上的每个应用。版本号不用填，填仓库地址后站点会自己读取。",
        view: "/software",
        unit: "款",
        tools: [{ href: "/admin/copy?ns=software", label: "页面文案" }],
      },
      {
        href: "/admin/lab",
        label: "实验室",
        icon: "lab",
        summary: "动效实验与页面说明",
        blurb: "编辑实验室首页和每则实验的标题、摘要与说明。",
        view: "/lab",
        unit: "",
      },
      {
        href: "/admin/timeline",
        label: "版本履历",
        icon: "history",
        summary: "年份轴上的版本记录",
        blurb: "编辑实验室「跟随滚动的年份轴」中的履历。",
        view: "/lab/changelog",
        unit: "版",
        tools: [{ href: "/admin/copy?ns=lab&study=changelog", label: "实验文案" }],
      },
    ],
  },
  {
    id: "rooms",
    label: "生活",
    caption: "说说、随笔、电影和偶像，各有自己的页面。",
    sections: [
      {
        href: "/admin/life",
        label: "生活",
        icon: "life",
        summary: "生活目录与栏目设置",
        blurb: "编辑生活目录，进入随笔、说说、偶像和电影的编辑器。",
        view: "/life",
        unit: "",
      },
      {
        href: "/admin/moments",
        label: "峰言峰语",
        icon: "moments",
        summary: "说说、文集与发布状态",
        blurb: "/moments 上的说说，一条几行字加一个时间。",
        view: "/moments",
        unit: "条",
        tools: [{ href: "/admin/copy?ns=moments", label: "页面文案" }],
      },
      {
        href: "/admin/secrets",
        label: "不能说的秘密",
        icon: "secrets",
        summary: "随笔、播客与生活笔记",
        blurb: "随笔、播客和导入的生活笔记，也会出现在生活目录。",
        view: "/secrets",
        unit: "篇",
        tools: [{ href: "/admin/copy?ns=secrets", label: "页面文案" }],
      },
      {
        href: "/admin/films",
        label: "电影",
        icon: "film",
        summary: "简介、台词与剧照",
        blurb: "/films 的每一部：简介、台词、剧照墙。一部一页。",
        view: "/films",
        unit: "部",
        tools: [{ href: "/admin/copy?ns=films", label: "页面文案" }],
      },
      {
        href: "/admin/idols",
        label: "偶像",
        icon: "idol",
        summary: "照片、出处与时间线",
        blurb: "/idols 的每一位：照片和出处、时间线。一位一页。",
        view: "/idols",
        unit: "位",
        tools: [{ href: "/admin/copy?ns=idols", label: "页面文案" }],
      },
    ],
  },
  {
    id: "me",
    label: "关于",
    caption: "关于页、3D 自我介绍和简历。",
    sections: [
      {
        href: "/admin/about",
        label: "关于",
        icon: "about",
        summary: "关于页的中英文正文",
        blurb: "/about 的正文，中英各一份。",
        view: "/about",
        unit: "份",
        tools: [
          { href: "/admin/copy?ns=about", label: "页面文案" },
          { href: "/admin/chips", label: "贴纸墙" },
          { href: "/admin/resume", label: "编辑共用履历" },
        ],
      },
      {
        href: "/admin/intro",
        label: "3D 自我介绍",
        icon: "intro",
        summary: "场景节点与个人介绍",
        blurb: "/intro 的 3D 场景里每个节点的文字。",
        view: "/intro",
        unit: "个",
        tools: [{ href: "/admin/copy?ns=intro", label: "页面文案" }],
      },
      {
        href: "/admin/resume",
        label: "简历",
        icon: "resume",
        summary: "个人信息、技术栈与履历",
        blurb: "/resume 的抬头、技术栈和履历；履历那几行 /about 也在用。公开页不写公司名。",
        view: "/resume",
        unit: "段",
        tools: [{ href: "/admin/copy?ns=resume", label: "页面文案" }],
      },
      {
        href: "/admin/chips",
        label: "贴纸墙",
        icon: "sticker",
        summary: "关于页的可拖动贴纸",
        blurb: "/about 页面上可以拖动的贴纸。",
        view: "/about",
        unit: "张",
      },
    ],
  },
  {
    id: "site",
    label: "站点",
    caption: "不属于某一页的内容：全站文案和导航。",
    sections: [
      {
        href: "/admin/copy",
        label: "站点文案",
        icon: "copy",
        summary: "按页面修改中英文文案",
        blurb:
          "全站每一行字，按页面分组。默认在 messages/*.json，这里只存改过的——清空一条就回到默认。",
        view: null,
        // The count is how many lines have been edited away from the files,
        // not the total number of lines in the catalogues.
        unit: "条改过",
      },
      {
        href: "/admin/nav",
        label: "导航",
        icon: "navigation",
        summary: "栏目顺序与显示位置",
        blurb: "顶栏、页脚、全屏菜单和站点地图上分别出现哪几条。",
        view: null,
        unit: "条",
        tools: [{ href: "/admin/copy?ns=nav", label: "导航名称" }],
      },
    ],
  },
];

/** Flat, in the same order — for lookups by href. */
export const SECTIONS: AdminSection[] = SECTION_GROUPS.flatMap((group) => group.sections);

export function sectionByHref(href: string): AdminSection | undefined {
  return SECTIONS.find((section) => section.href === href);
}

/** The group a section belongs to, for the breadcrumb. */
export function groupOf(href: string): AdminGroup | undefined {
  return SECTION_GROUPS.find((group) => group.sections.some((section) => section.href === href));
}
