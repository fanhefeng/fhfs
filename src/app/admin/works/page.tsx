import { site } from "@/config/site";

const requestTime = () => new Date();
import { AdminChrome } from "../AdminChrome";
import { WorkForm, type WorkDraft } from "./WorkForm";
import { Note } from "../ui/Note";
import { cardClass, metaClass } from "../styles";

export default function WorksPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;

  const blank: WorkDraft = {
    key: "",
    title: { zh: "", en: "" },
    description: { zh: "", en: "" },
    year: Number(
      new Intl.DateTimeFormat("en", { year: "numeric", timeZone: site.timeZone }).format(
        requestTime(),
      ),
    ),
    cover: null,
    url: null,
    tags: [],
    accent: null,
    sort: 0,
  };
  return (
    <AdminChrome title="作品集" section="/admin/works">
      <Note>
        /portfolio 已经 308 到
        /software，前台没有页面读这张表——这里存的东西目前不会出现在站上。这一页也不在侧栏里了，只有这个地址进得来。
      </Note>

      <div className="space-y-12">
        {rows.map((work) => (
          <section key={work.key} className={`${cardClass} p-5 sm:p-6`}>
            <h2 className={metaClass}>{work.key}</h2>
            <div className="mt-4">
              <WorkForm isNew={false} work={work} />
            </div>
          </section>
        ))}

        <section className={`${cardClass} p-5 sm:p-6`}>
          <h2 className={metaClass}>新作品</h2>
          <div className="mt-4">
            <WorkForm isNew work={blank} />
          </div>
        </section>
      </div>
    </AdminChrome>
  );
}
