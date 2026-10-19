import { createServerFn } from "@tanstack/react-start";

const saveAboutRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./about.server");
    return impl.saveAbout(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveAbout(
  ...args: Parameters<typeof import("./about.server").saveAbout>
): ReturnType<typeof import("./about.server").saveAbout> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveAboutRequest({ data: form });
}
