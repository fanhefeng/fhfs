import { createServerFn } from "@tanstack/react-start";

const saveResumeProfileRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./resume.server");
    return impl.saveResumeProfile(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveResumeProfile(
  ...args: Parameters<typeof import("./resume.server").saveResumeProfile>
): ReturnType<typeof import("./resume.server").saveResumeProfile> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveResumeProfileRequest({ data: form });
}

const saveResumeExperienceRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./resume.server");
    return impl.saveResumeExperience(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function saveResumeExperience(
  ...args: Parameters<typeof import("./resume.server").saveResumeExperience>
): ReturnType<typeof import("./resume.server").saveResumeExperience> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return saveResumeExperienceRequest({ data: form });
}

const deleteResumeExperienceRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./resume.server");
    return impl.deleteResumeExperience(data);
  });
export function deleteResumeExperience(
  ...args: Parameters<typeof import("./resume.server").deleteResumeExperience>
): ReturnType<typeof import("./resume.server").deleteResumeExperience> {
  const form = args[0];
  return deleteResumeExperienceRequest({ data: form });
}
