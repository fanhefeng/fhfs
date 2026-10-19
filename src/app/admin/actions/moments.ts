import { createServerFn } from "@tanstack/react-start";

const saveMomentRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./moments.server");
    return impl.saveMoment(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveMoment(
  ...args: Parameters<typeof import("./moments.server").saveMoment>
): ReturnType<typeof import("./moments.server").saveMoment> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveMomentRequest({ data: form });
}

const postMomentRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./moments.server");
    return impl.postMoment(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function postMoment(
  ...args: Parameters<typeof import("./moments.server").postMoment>
): ReturnType<typeof import("./moments.server").postMoment> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return postMomentRequest({ data: form });
}

const deleteMomentRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./moments.server");
    return impl.deleteMoment(data);
  });
export function deleteMoment(
  ...args: Parameters<typeof import("./moments.server").deleteMoment>
): ReturnType<typeof import("./moments.server").deleteMoment> {
  const form = args[0];
  return deleteMomentRequest({ data: form });
}
