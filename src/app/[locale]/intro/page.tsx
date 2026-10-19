import { site } from "@/config/site";

import { inLocale } from "@/lib/localized";
import { INTRO_STICKERS, type IntroCopy, type IntroLink } from "@/lib/intro/stickers";
import { IntroStage } from "@/components/intro/IntroStage";
import { useTranslations } from "use-intl";

export default function IntroPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, nodes } = data;
  const t = useTranslations("intro");
  const byKey = new Map(nodes.map((node) => [node.key, node]));
  const copy: IntroCopy[] = INTRO_STICKERS.flatMap((sticker) => {
    const row = byKey.get(sticker.id);
    if (!row) return [];
    const node = inLocale(row, locale);
    return [
      {
        id: sticker.id,
        kicker: node.kicker,
        title: node.title,
        period: node.period ?? undefined,
        body: node.body,
        bullets: node.bullets,
      },
    ];
  });
  const links: IntroLink[] = [
    { label: "GitHub", href: site.social.github, external: true },
    { label: t("linkAbout"), href: `/${locale}/about` },
    { label: t("linkWriting"), href: `/${locale}/blog` },
  ];
  return (
    <main id="main" className="flex-1">
      <IntroStage
        text={{
          name: site.author,
          role: t("role"),
          meta: t("meta"),
          tagline: t("tagline"),
          scrollHint: t("scrollHint"),
          outroTitle: t("outroTitle"),
          outroBody: t("outroBody"),
          resumeRegion: t("resumeRegion"),
        }}
        copy={copy}
        links={links}
        loadingLabel={t("loading")}
      />
    </main>
  );
}
