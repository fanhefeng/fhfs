import { createServerFn } from "@tanstack/react-start";

const saveChipsRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./chips.server");
    return impl.saveChips(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveChips(
  ...args: Parameters<typeof import("./chips.server").saveChips>
): ReturnType<typeof import("./chips.server").saveChips> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveChipsRequest({ data: form });
}
