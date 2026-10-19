import { createServerFn } from "@tanstack/react-start";

const saveCopyRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./copy.server");
    return impl.saveCopy(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveCopy(
  ...args: Parameters<typeof import("./copy.server").saveCopy>
): ReturnType<typeof import("./copy.server").saveCopy> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveCopyRequest({ data: form });
}

const deleteOrphanCopyRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./copy.server");
    return impl.deleteOrphanCopy(data);
  });
export function deleteOrphanCopy(
  ...args: Parameters<typeof import("./copy.server").deleteOrphanCopy>
): ReturnType<typeof import("./copy.server").deleteOrphanCopy> {
  const form = args[0];
  return deleteOrphanCopyRequest({ data: form });
}
