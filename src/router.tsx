import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultStaleTime: 0,
    defaultNotFoundComponent: () => (
      <main className="mx-auto max-w-xl px-6 py-32">
        <h1>404</h1>
        <p>没有找到这一页。 / Page not found.</p>
        <a href="/zh">返回首页 / Home</a>
      </main>
    ),
  });
}
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
