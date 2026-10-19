import { createServerFn } from "@tanstack/react-start";
export type { LoginState } from "./actions.server";

const loginRequest = createServerFn({ method: "POST" })
  .validator((form: FormData) => {
    if (!(form instanceof FormData)) throw new Error("Expected form data");
    return form;
  })
  .handler(async ({ data }) => {
    const impl = await import("./actions.server");
    return impl.login(JSON.parse(String(data.get("__previous") ?? "{}")), data);
  });
export function login(
  ...args: Parameters<typeof import("./actions.server").login>
): ReturnType<typeof import("./actions.server").login> {
  const form = args[1];
  form.set("__previous", JSON.stringify(args[0]));
  return loginRequest({ data: form });
}

const logoutRequest = createServerFn({ method: "POST" }).handler(async () => {
  const impl = await import("./actions.server");
  return impl.logout();
});
export function logout(): Promise<void> {
  return logoutRequest();
}
