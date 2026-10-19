import { site } from "@/config/site";

const requestTime = () => new Date();
import { AdminChrome } from "../../AdminChrome";
import { PostForm } from "../PostForm";

export default function NewPost({
  data: _data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  return (
    <AdminChrome
      title="新文章"
      section="/admin/posts"
      sub
      view={null}
      blurb="slug 和语言存下之后就不能改了——它们是这篇文章的地址。"
    >
      <PostForm
        isNew
        post={{
          slug: "",
          locale: "zh",
          title: "",
          // Today, as a starting point rather than a claim — it is editable.
          // sv-SE formats as YYYY-MM-DD, in the site's zone: the server's own is
          // UTC on Vercel, which before 08:00 in Shanghai is still yesterday.
          date: new Intl.DateTimeFormat("sv-SE", { timeZone: site.timeZone }).format(requestTime()),
          summary: "",
          tags: [],
          draft: false,
          bodyMd: "",
        }}
      />
    </AdminChrome>
  );
}
