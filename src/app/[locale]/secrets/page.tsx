import { Reveal } from "@/components/fx/Reveal";
import { RoomMusic } from "@/components/fx/RoomMusic";
import { SecretIndex } from "@/components/secrets/SecretIndex";
import { useTranslations } from "use-intl";

export default function SecretsPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { items } = data;
  const t = useTranslations("secrets");
  const tt = useTranslations("tracks.secret");
  const tc = useTranslations("common");
  return (
    <main id="main" className="mx-auto w-full max-w-[720px] flex-1 px-6 pb-28 pt-32 md:pt-40">
      <Reveal as="section" className="mb-12">
        <p className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {t("kicker")}
        </p>
        <h1 className="mt-3 text-display-sm">{t("title")}</h1>
        <p className="mt-4 max-w-[46ch] text-body text-fg-secondary">{t("subtitle")}</p>
        {items.length > 0 && (
          <p className="mt-5 font-mono text-meta uppercase tracking-meta text-fg-tertiary">
            {t("count", { count: items.length })}
          </p>
        )}
        <RoomMusic
          track="secret"
          tonight={tc("tonight")}
          title={tt("title")}
          artist={tt("artist")}
          className="mt-6"
        />
      </Reveal>

      {items.length === 0 ? (
        <p className="text-body text-fg-secondary">{t("empty")}</p>
      ) : (
        <SecretIndex items={items} yearAria={(year) => t("yearAria", { year })} />
      )}
    </main>
  );
}
