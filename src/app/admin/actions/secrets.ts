import { createServerFn } from "@tanstack/react-start";

const saveSecretRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./secrets.server");
    return impl.saveSecret(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveSecret(
  ...args: Parameters<typeof import("./secrets.server").saveSecret>
): ReturnType<typeof import("./secrets.server").saveSecret> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveSecretRequest({ data: form });
}

const deleteSecretRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./secrets.server");
    return impl.deleteSecret(data);
  });
export function deleteSecret(
  ...args: Parameters<typeof import("./secrets.server").deleteSecret>
): ReturnType<typeof import("./secrets.server").deleteSecret> {
  const form = args[0];
  return deleteSecretRequest({ data: form });
}
