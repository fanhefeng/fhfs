import { vi } from "vite-plus/test";
vi.mock("@/lib/server/env", () => ({ env: process.env }));
