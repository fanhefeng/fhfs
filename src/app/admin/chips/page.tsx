import { AdminChrome } from "../AdminChrome";
import { ChipsForm } from "./ChipsForm";
import { Note } from "../ui/Note";

export default function ChipsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { rows } = data;

  return (
    <AdminChrome title="贴纸墙" section="/admin/chips">
      <Note>
        顺序就是显示顺序；两种语言都清空的行会被删掉。 专有名词（TypeScript、GSAP
        之类）只填一边就行，另一边会跟着一样。
      </Note>
      <ChipsForm chips={rows} />
    </AdminChrome>
  );
}
