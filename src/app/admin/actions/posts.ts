import { createServerFn } from "@tanstack/react-start";

const savePostRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./posts.server");
    return impl.savePost(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function savePost(
  ...args: Parameters<typeof import("./posts.server").savePost>
): ReturnType<typeof import("./posts.server").savePost> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return savePostRequest({ data: form });
}

const deletePostRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./posts.server");
    return impl.deletePost(data);
  });
export function deletePost(
  ...args: Parameters<typeof import("./posts.server").deletePost>
): ReturnType<typeof import("./posts.server").deletePost> {
  const form = args[0];
  return deletePostRequest({ data: form });
}
