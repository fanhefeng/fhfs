import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { IntlProvider, useTranslations } from "use-intl";
import { site } from "@/config/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { AuroraLayer } from "@/components/fx/AuroraLayer";
import { ThemeKeeper } from "@/components/fx/ThemeKeeper";
import { GrainLayer } from "@/components/fx/GrainLayer";
import { SmoothScroll } from "@/components/fx/SmoothScroll";
import { RouteTransition } from "@/components/fx/RouteTransition";
import { OvertureLight } from "@/components/fx/OvertureLight";
import { ProgressHud } from "@/components/fx/ProgressHud";
import { Jukebox } from "@/components/fx/Jukebox";
import { PreviewBanner } from "@/components/layout/PreviewBanner";
import { WebMCP } from "@/components/agent/WebMCP";
const layout = createServerFn({ method: "GET" })
  .validator((locale: string) => locale)
  .handler(async ({ data }) => (await import("@/lib/server/layout")).loadLayout(data));
export const Route = createFileRoute("/$locale")({
  loader: ({ params }) => layout({ data: params.locale }),
  component: LocaleLayout,
});
function LocaleLayout() {
  const data = Route.useLoaderData();
  const { locale } = Route.useParams();
  return (
    <IntlProvider locale={locale} messages={data.messages} timeZone={site.timeZone}>
      <PublicLayout />
    </IntlProvider>
  );
}
function PublicLayout() {
  const data = Route.useLoaderData();
  const t = useTranslations("layout");
  return (
    <>
      <ThemeKeeper />
      <SmoothScroll />
      <RouteTransition />
      <OvertureLight />
      <ProgressHud />
      <Jukebox files={data.files} />
      <AuroraLayer />
      <GrainLayer />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
      >
        {t("skipToContent")}
      </a>
      <Header links={data.headerLinks} menuLinks={data.menuLinks} allLinks={data.allLinks} />
      <Outlet />
      <Footer items={data.footerLinks} />
      {data.preview && <PreviewBanner />}
      <SearchLauncher />
      <WebMCP enabled={!data.preview} />
    </>
  );
}
