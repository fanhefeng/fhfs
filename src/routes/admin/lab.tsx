import { createFileRoute } from "@tanstack/react-router";
import { SectionHub } from "@/app/admin/hubs/Hub";
import { loadAdminHub } from "@/app/admin/hubs/load";

export const Route = createFileRoute("/admin/lab")({
  loader: () => loadAdminHub({ data: "lab" }),
  component: Page,
});

function Page() {
  return <SectionHub hub="lab" data={Route.useLoaderData()} />;
}
