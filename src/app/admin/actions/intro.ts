import { createServerFn } from "@tanstack/react-start";

const saveIntroNodeRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./intro.server");
    return impl.saveIntroNode(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveIntroNode(
  ...args: Parameters<typeof import("./intro.server").saveIntroNode>
): ReturnType<typeof import("./intro.server").saveIntroNode> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveIntroNodeRequest({ data: form });
}

const deleteIntroNodeRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./intro.server");
    return impl.deleteIntroNode(data);
  });
export function deleteIntroNode(
  ...args: Parameters<typeof import("./intro.server").deleteIntroNode>
): ReturnType<typeof import("./intro.server").deleteIntroNode> {
  const form = args[0];
  return deleteIntroNodeRequest({ data: form });
}
