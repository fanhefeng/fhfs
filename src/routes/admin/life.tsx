import { createFileRoute } from "@tanstack/react-router";
import { SectionHub } from "@/app/admin/hubs/Hub";
import { loadAdminHub } from "@/app/admin/hubs/load";

export const Route = createFileRoute("/admin/life")({
  loader: () => loadAdminHub({ data: "life" }),
  component: Page,
});

function Page() {
  return <SectionHub hub="life" data={Route.useLoaderData()} />;
}
