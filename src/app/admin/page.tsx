import Link from "@/components/ui/Link";

import { AdminChrome } from "./AdminChrome";

import { SECTION_GROUPS } from "./sections";
import { cardClass, sectionHeadingClass } from "./styles";
import { QuickMoment } from "./moments/QuickMoment";

export default function AdminHome({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { counts } = data;

  return (
    <AdminChrome title="内容">
      <div className="space-y-10">
        {SECTION_GROUPS.map((group) => (
          <section key={group.id}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className={sectionHeadingClass}>{group.label}</h2>
              <p className="text-caption text-fg-tertiary">{group.caption}</p>
            </div>

            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.sections.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    className={`${cardClass} group flex h-full flex-col gap-3 p-5 transition-[border-color,box-shadow] hover:border-fg-tertiary/30 hover:shadow-card`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-heading transition-colors group-hover:text-accent">
                        {section.label}
                      </span>
                      {counts[section.href] !== undefined && (
                        <span className="font-mono text-meta text-fg-tertiary tabular-nums">
                          {counts[section.href]} {section.unit}
                        </span>
                      )}
                    </span>
                    <span className="text-caption text-fg-tertiary">{section.blurb}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className={sectionHeadingClass}>发一条说说</h2>
          <div className="mt-3">
            <QuickMoment />
          </div>
        </section>
      </div>
    </AdminChrome>
  );
}
