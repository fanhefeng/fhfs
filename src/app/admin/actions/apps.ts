import { createServerFn } from "@tanstack/react-start";

const saveAppRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./apps.server");
    return impl.saveApp(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveApp(
  ...args: Parameters<typeof import("./apps.server").saveApp>
): ReturnType<typeof import("./apps.server").saveApp> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveAppRequest({ data: form });
}

const deleteAppRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./apps.server");
    return impl.deleteApp(data);
  });
export function deleteApp(
  ...args: Parameters<typeof import("./apps.server").deleteApp>
): ReturnType<typeof import("./apps.server").deleteApp> {
  const form = args[0];
  return deleteAppRequest({ data: form });
}
