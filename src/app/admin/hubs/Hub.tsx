import Link from "@/components/ui/Link";
import { AdminChrome } from "../AdminChrome";
import { sectionByHref } from "../sections";
import { listRowClass, sectionHeadingClass } from "../styles";
import type { HubData } from "./page.server";

export type Hub = "home" | "lab" | "life";

type EditorLink = { href: string; label: string; description?: string };

const home: EditorLink[] = [
  { href: "/admin/copy?ns=splash", label: "霓虹开场", description: "开场招牌和进入按钮" },
  { href: "/admin/copy?ns=grove", label: "首页开场", description: "第一屏的大字、自我介绍和按钮" },
  { href: "/admin/copy?ns=home", label: "首页文案", description: "各节标题和联系入口" },
];

const life: EditorLink[] = [
  { href: "/admin/copy?ns=life", label: "生活目录文案", description: "标题、导语和各栏目的介绍" },
  { href: "/admin/nav", label: "栏目顺序与显示", description: "生活目录取自导航中的生活栏目" },
  { href: "/admin/copy?ns=tracks", label: "背景音乐名称" },
];

function contentLinks(hrefs: string[]): EditorLink[] {
  return hrefs.map((href) => {
    const section = sectionByHref(href)!;
    return { href, label: section.label, description: section.blurb };
  });
}

function Editors({ heading, links }: { heading: string; links: EditorLink[] }) {
  return (
    <section>
      <h2 className={sectionHeadingClass}>{heading}</h2>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {links.map(({ href, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className={`${listRowClass} flex flex-col justify-center gap-x-4 gap-y-1 sm:flex-row sm:items-baseline sm:justify-between`}
            >
              <span className="text-body text-fg group-hover:text-accent group-focus-visible:text-accent">
                {label}
              </span>
              {description && <span className="text-caption text-fg-secondary">{description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SectionHub({ hub, data }: { hub: Hub; data: HubData }) {
  const href = `/admin/${hub}`;
  return (
    <AdminChrome title={sectionByHref(href)!.label} section={href}>
      <div className="space-y-6 sm:space-y-8">
        {hub === "home" && (
          <>
            <Editors heading="页面文案" links={home} />
            <Editors
              heading="首页显示的内容"
              links={contentLinks(["/admin/posts", "/admin/apps", "/admin/moments", "/admin/lab"])}
            />
          </>
        )}
        {hub === "life" && (
          <>
            <Editors heading="页面设置" links={life} />
            <Editors
              heading="生活栏目"
              links={contentLinks([
                "/admin/moments",
                "/admin/secrets",
                "/admin/idols",
                "/admin/films",
              ])}
            />
          </>
        )}
        {hub === "lab" && (
          <>
            <Editors
              heading="实验室目录"
              links={[
                { href: "/admin/copy?ns=lab&scope=index", label: "目录与通用文案" },
                ...contentLinks(["/admin/timeline"]),
              ]}
            />
            {data.studies.map(({ id, label, entries }) => (
              <Editors
                key={id}
                heading={label}
                links={entries.map(({ slug, title }) => ({
                  href: `/admin/copy?ns=lab&study=${slug}`,
                  label: title,
                }))}
              />
            ))}
          </>
        )}
      </div>
    </AdminChrome>
  );
}
