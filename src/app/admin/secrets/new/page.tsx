import { site } from "@/config/site";

const requestTime = () => new Date();
import { AdminChrome } from "../../AdminChrome";
import { SecretForm } from "../SecretForm";

export default function NewSecret({
  data: _data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  return (
    <AdminChrome
      title="新的秘密"
      section="/admin/secrets"
      sub
      view={null}
      blurb="slug 和语言存下之后就不能改了——它们是这条的地址。"
    >
      <SecretForm
        isNew
        secret={{
          slug: "",
          locale: "zh",
          kind: "essay",
          title: "",
          // Today in the site's zone (the server's is UTC) — a starting point, editable.
          date: new Intl.DateTimeFormat("sv-SE", { timeZone: site.timeZone }).format(requestTime()),
          summary: "",
          audio: "",
          duration: "",
          draft: false,
          bodyMd: "",
        }}
      />
    </AdminChrome>
  );
}
