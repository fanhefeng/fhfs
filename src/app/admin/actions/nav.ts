import { createServerFn } from "@tanstack/react-start";

const saveNavItemsRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./nav.server");
    return impl.saveNavItems(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveNavItems(
  ...args: Parameters<typeof import("./nav.server").saveNavItems>
): ReturnType<typeof import("./nav.server").saveNavItems> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveNavItemsRequest({ data: form });
}
