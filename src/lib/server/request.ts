import {
  getRequest,
  getCookie,
  setCookie,
  deleteCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

export async function headers() {
  return getRequest().headers;
}
export async function cookies() {
  return {
    get: (name: string) => {
      const value = getCookie(name);
      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string, options: Parameters<typeof setCookie>[2]) =>
      setCookie(name, value, options),
    delete: (name: string) => deleteCookie(name, { path: "/" }),
  };
}
export async function draftMode() {
  return {
    isEnabled: getCookie("fhfs-preview") === "1",
    enable: () => {
      setResponseHeader("Cache-Control", "private, no-store");
      setCookie("fhfs-preview", "1", {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: "lax",
        path: "/",
      });
    },
    disable: () => deleteCookie("fhfs-preview", { path: "/" }),
  };
}
