import { createServerFn } from "@tanstack/react-start";

const saveIdolRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./idols.server");
    return impl.saveIdol(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveIdol(
  ...args: Parameters<typeof import("./idols.server").saveIdol>
): ReturnType<typeof import("./idols.server").saveIdol> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveIdolRequest({ data: form });
}

const deleteIdolRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./idols.server");
    return impl.deleteIdol(data);
  });
export function deleteIdol(
  ...args: Parameters<typeof import("./idols.server").deleteIdol>
): ReturnType<typeof import("./idols.server").deleteIdol> {
  const form = args[0];
  return deleteIdolRequest({ data: form });
}
