import { AdminChrome } from "../../../AdminChrome";
import { Note } from "../../../ui/Note";
import { SecretForm } from "../../SecretForm";

export default function EditSecret({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { secret, imported } = data;
  const { slug, locale } = secret;

  return (
    <AdminChrome
      title={secret.title}
      section="/admin/secrets"
      blurb={`${slug} · ${locale} · ${secret.kind === "podcast" ? "播客" : "随笔"}`}
      sub
      view={secret.draft ? null : `/${locale}/secrets/${slug}`}
      action={
        secret.draft ? (
          <span className="font-mono text-meta uppercase tracking-meta text-accent">
            草稿，未发布
          </span>
        ) : null
      }
    >
      {imported && (
        <Note>
          首次保存后，这篇会改由后台维护，网址沿用原地址。
          {!secret.date && " 原稿未记日期，请填写这次编辑版的发布日期。"}
        </Note>
      )}
      <SecretForm
        isNew={false}
        imported={imported}
        secret={{
          slug: secret.slug,
          locale: secret.locale,
          kind: secret.kind,
          title: secret.title,
          date: secret.date,
          summary: secret.summary,
          audio: secret.audio ?? "",
          duration: secret.duration == null ? "" : String(secret.duration),
          draft: secret.draft,
          bodyMd: secret.bodyMd,
        }}
      />
    </AdminChrome>
  );
}
