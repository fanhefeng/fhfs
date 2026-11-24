import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminCounts } from "@/app/admin/context";
import { createServerFn } from "@tanstack/react-start";

import styles from "@/app/admin/admin.module.css";

const loadCounts = createServerFn({ method: "GET" }).handler(async () => {
  const { adminSession } = await import("@/lib/server/auth/session");
  if (!(await adminSession())) return {};
  return (await import("@/app/admin/counts")).sectionCounts();
});
export const Route = createFileRoute("/admin")({
  loader: () => loadCounts(),
  head: () => ({
    meta: [
      { title: "Admin | fhf" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "apple-mobile-web-app-title", content: "fhf 后台" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "manifest", href: "/admin/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/admin/apple-icon" },
    ],
  }),
  component: AdminLayout,
});
function AdminLayout() {
  return (
    <AdminCounts value={Route.useLoaderData()}>
      <div className={`${styles.root} min-h-dvh w-full bg-bg text-fg`}>
        <Outlet />
      </div>
    </AdminCounts>
  );
}
