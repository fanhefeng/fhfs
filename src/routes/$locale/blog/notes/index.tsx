import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
const loadPage = createServerFn({ method: "GET" })
  .validator(
    (input: Parameters<typeof import("@/app/[locale]/blog/notes/page.server").loadPageData>[0]) =>
      input,
  )
  .handler(async ({ data }) => {
    const page = await import("@/app/[locale]/blog/notes/page.server");
    return page.loadPageData(data);
  });
export const Route = createFileRoute("/$locale/blog/notes/")({
  validateSearch: (search: Record<string, unknown>) => search as Record<string, string>,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps }) => {
    const { href } = await loadPage({ data: { params, searchParams: deps.search } });
    throw redirect({ href, statusCode: 301 });
  },
});
