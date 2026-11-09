import { createServerFn } from "@tanstack/react-start";
import type { Hub } from "./Hub";

export const loadAdminHub = createServerFn({ method: "GET" })
  .validator((hub: Hub) => {
    if (hub !== "home" && hub !== "life" && hub !== "lab") throw new Error("Unknown admin hub");
    return hub;
  })
  .handler(async ({ data }) => (await import("./page.server")).loadHub(data));
