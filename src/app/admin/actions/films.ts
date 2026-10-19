import { createServerFn } from "@tanstack/react-start";

const saveFilmRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./films.server");
    return impl.saveFilm(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveFilm(
  ...args: Parameters<typeof import("./films.server").saveFilm>
): ReturnType<typeof import("./films.server").saveFilm> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveFilmRequest({ data: form });
}

const deleteFilmRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./films.server");
    return impl.deleteFilm(data);
  });
export function deleteFilm(
  ...args: Parameters<typeof import("./films.server").deleteFilm>
): ReturnType<typeof import("./films.server").deleteFilm> {
  const form = args[0];
  return deleteFilmRequest({ data: form });
}
