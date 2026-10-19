import { notFound } from "@/lib/navigation";

import { AdminChrome } from "../../../AdminChrome";
import { SecretForm } from "../../SecretForm";

export default function EditSecret({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { slug, locale, secret } = data;

  if (!secret) notFound();
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
      <SecretForm
        isNew={false}
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
