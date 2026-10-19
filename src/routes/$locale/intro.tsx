import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import Page from "@/app/[locale]/intro/page";
import { routeHead } from "@/lib/metadata";
const loadPage = createServerFn({ method: "GET" })
  .validator(
    (input: Parameters<typeof import("@/app/[locale]/intro/page.server").loadPageData>[0]) => input,
  )
  .handler(async ({ data }) => {
    const page = await import("@/app/[locale]/intro/page.server");
    const payload = await page.loadPageData(data);
    const metadata = await page.generateMetadata(data);
    return { payload, metadata };
  });
export const Route = createFileRoute("/$locale/intro")({
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
  loaderDeps: ({ search }) => ({ search }),
  loader: ({ params, deps }) => loadPage({ data: { params, searchParams: deps.search } }),
  head: ({ loaderData }) => routeHead(loaderData?.metadata, false),
  component: RoutePage,
});
function RoutePage() {
  return <Page data={Route.useLoaderData().payload} />;
}
