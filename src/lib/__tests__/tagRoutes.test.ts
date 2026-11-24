import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vite-plus/test";
import { generateMetadata, loadPageData } from "@/app/[locale]/blog/tags/[tag]/page.server";
import { site } from "@/config/site";
import { getPostsByTag } from "@/lib/server/content";

vi.mock("@/lib/server/content", () => ({ getPostsByTag: vi.fn(async () => []) }));
vi.mock("@/i18n/server", () => ({ getTranslations: async () => () => "" }));

describe("tag route parameters", () => {
  it.each(["手札", "front end", "a/b", "100%20", "a%2Fb"])(
    "passes the tag %s from the router to content and metadata without decoding it again",
    async (tag) => {
      vi.mocked(getPostsByTag).mockClear();
      const root = createRootRoute();
      const tagRoute = createRoute({
        getParentRoute: () => root,
        path: "$locale/blog/tags/$tag",
        loader: async ({ params }) => {
          const page = { params, searchParams: {} };
          await loadPageData(page);
          return generateMetadata(page);
        },
      });
      const encoded = encodeURIComponent(tag);
      const router = createRouter({
        routeTree: root.addChildren([tagRoute]),
        history: createMemoryHistory({ initialEntries: [`/zh/blog/tags/${encoded}`] }),
      });
      await router.load();

      expect(vi.mocked(getPostsByTag).mock.calls).toEqual([
        [tag, "zh"],
        [tag, "zh"],
      ]);
      const metadata = router.state.matches.at(-1)?.loaderData;
      expect(metadata?.alternates?.canonical).toBe(`${site.url}/zh/blog/tags/${encoded}`);
    },
  );
});
