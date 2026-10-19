import { createServerFn } from "@tanstack/react-start";

const saveTimelineEntryRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./timeline.server");
    return impl.saveTimelineEntry(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveTimelineEntry(
  ...args: Parameters<typeof import("./timeline.server").saveTimelineEntry>
): ReturnType<typeof import("./timeline.server").saveTimelineEntry> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveTimelineEntryRequest({ data: form });
}

const deleteTimelineEntryRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./timeline.server");
    return impl.deleteTimelineEntry(data);
  });
export function deleteTimelineEntry(
  ...args: Parameters<typeof import("./timeline.server").deleteTimelineEntry>
): ReturnType<typeof import("./timeline.server").deleteTimelineEntry> {
  const form = args[0];
  return deleteTimelineEntryRequest({ data: form });
}
