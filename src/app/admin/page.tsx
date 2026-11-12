import Link from "@/components/ui/Link";
import { Icon } from "@/components/icons/Icon";

import { AdminChrome } from "./AdminChrome";

import { SECTION_GROUPS } from "./sections";
import { buttonClass, ghostButtonClass, sectionHeadingClass } from "./styles";
import { QuickMoment } from "./moments/QuickMoment";

export default function AdminHome({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { counts } = data;

  return (
    <AdminChrome title="内容" blurb="写点新的，或找到要修改的页面。">
      <div className="space-y-6 sm:space-y-8">
        <nav aria-label="开始写作" className="flex flex-wrap gap-2">
          <Link href="/admin/posts/new" className={buttonClass}>
            <Icon name="edit" className="size-4" />
            写文章
          </Link>
          <Link href="/admin/secrets/new" className={ghostButtonClass}>
            <Icon name="notebook" className="size-4" />
            写随笔
          </Link>
          <a href="#quick-moment-title" className={ghostButtonClass}>
            <Icon name="moments" className="size-4" />
            发说说
          </a>
        </nav>
        <div className="grid gap-x-8 gap-y-7 xl:grid-cols-2">
          {SECTION_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`overview-${group.id}`}>
              <div className="border-b border-line pb-3">
                <h2 id={`overview-${group.id}`} className={sectionHeadingClass}>
                  {group.label}
                </h2>
              </div>

              <ul className="divide-y divide-line">
                {group.sections.map((section) => (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      className="group -mx-2 flex min-h-18 items-center gap-3 rounded-chip px-2 py-3 transition-colors hover:bg-surface focus-visible:bg-surface"
                    >
                      <Icon
                        name={section.icon}
                        className="size-5 text-fg-secondary transition-colors group-hover:text-accent group-focus-visible:text-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body font-semibold transition-colors group-hover:text-accent group-focus-visible:text-accent">
                          {section.label}
                        </span>
                        <span className="mt-0.5 block text-caption text-fg-secondary">
                          {section.summary}
                        </span>
                      </span>
                      {counts[section.href] !== undefined && (
                        <span className="shrink-0 font-mono text-meta text-fg-tertiary tabular-nums">
                          {counts[section.href]} {section.unit}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <section id="quick-moment" aria-labelledby="quick-moment-title" className="scroll-mt-24">
          <h2
            id="quick-moment-title"
            tabIndex={-1}
            className={`${sectionHeadingClass} scroll-mt-24`}
          >
            发一条说说
          </h2>
          <div className="mt-3">
            <QuickMoment />
          </div>
        </section>
      </div>
    </AdminChrome>
  );
}
