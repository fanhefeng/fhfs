import { createFileRoute } from "@tanstack/react-router";
import { SectionHub } from "@/app/admin/hubs/Hub";
import { loadAdminHub } from "@/app/admin/hubs/load";

export const Route = createFileRoute("/admin/home")({
  loader: () => loadAdminHub({ data: "home" }),
  component: Page,
});

function Page() {
  return <SectionHub hub="home" data={Route.useLoaderData()} />;
}
