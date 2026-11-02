import { SoftwareGallery } from "@/components/software/SoftwareGallery";
import { toSoftwareApp } from "@/components/software/appMeta";
import { appGithubRepo } from "@/lib/githubData";
import { useTranslations } from "use-intl";

export default function SoftwarePage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { locale, rows, github } = data;
  const t = useTranslations("software");
  const apps = rows.map((app, i) =>
    toSoftwareApp(app, i, locale, github.get(appGithubRepo(app) ?? "")),
  );
  return (
    <main id="main" className="mx-auto w-full max-w-[1040px] flex-1 px-6 pb-24 pt-16 sm:pt-20">
      <header className="mb-12 max-w-[42rem]">
        <p className="font-mono text-meta uppercase tracking-meta text-fg-tertiary">
          {t("kicker")}
        </p>
        <h1 className="mt-3 text-display-sm text-fg">{t("title")}</h1>
        <p className="mt-4 text-body text-fg-secondary">{t("subtitle")}</p>
      </header>

      <SoftwareGallery apps={apps} />
    </main>
  );
}
