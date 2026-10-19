import { createServerFn } from "@tanstack/react-start";

const saveWorkRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./works.server");
    return impl.saveWork(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveWork(
  ...args: Parameters<typeof import("./works.server").saveWork>
): ReturnType<typeof import("./works.server").saveWork> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveWorkRequest({ data: form });
}

const deleteWorkRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./works.server");
    return impl.deleteWork(data);
  });
export function deleteWork(
  ...args: Parameters<typeof import("./works.server").deleteWork>
): ReturnType<typeof import("./works.server").deleteWork> {
  const form = args[0];
  return deleteWorkRequest({ data: form });
}
