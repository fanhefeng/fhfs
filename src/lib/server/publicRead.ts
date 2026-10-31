import { AsyncLocalStorage } from "node:async_hooks";
import { DrizzleQueryError } from "drizzle-orm/errors";

type Diagnosis = {
  kind: "timeout" | "connection" | "database" | "aborted" | "unknown";
  errorType: string;
  causeType: string;
  sqlstate?: string;
  code?: string;
};
const networkCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);
const errorTypes = new Set([
  "Error",
  "TypeError",
  "TimeoutError",
  "AbortError",
  "NeonDbError",
  "DrizzleQueryError",
]);
const scope = new AsyncLocalStorage<boolean>();

/** Extract diagnostics only; classification never changes transport or retry behavior. */
export function diagnosePublicRead(error: unknown): Diagnosis {
  const chain: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  for (let current = error; current && typeof current === "object" && chain.length < 8;) {
    if (seen.has(current)) break;
    seen.add(current);
    const entry = current as Record<string, unknown>;
    chain.push(entry);
    current = entry.cause ?? entry.sourceError;
  }
  const type = (entry?: Record<string, unknown>) => {
    // Drizzle inherits name="Error"; instanceof survives production class-name minification.
    if (entry instanceof DrizzleQueryError) return "DrizzleQueryError";
    return typeof entry?.name === "string" && errorTypes.has(entry.name)
      ? entry.name
      : "UnknownError";
  };
  const base = { errorType: type(chain[0]), causeType: type(chain.at(-1)) };
  const sqlstate = chain
    .map((e) => e.code)
    .find(
      (code): code is string =>
        typeof code === "string" &&
        /^(?:08|0A|22|23|25|28|40|42|53|57|58|XX)[0-9A-Z]{3}$/.test(code),
    );
  if (sqlstate) return { ...base, kind: "database", sqlstate };
  if (chain.some((e) => e.name === "AbortError")) return { ...base, kind: "aborted" };
  if (chain.some((e) => e.name === "TimeoutError")) return { ...base, kind: "timeout" };
  const code = chain
    .map((e) => e.code)
    .find((value): value is string => typeof value === "string" && networkCodes.has(value));
  // Workers may omit Node's socket cause. Known messages are inspected but never logged.
  if (
    code ||
    chain.some(
      (e) =>
        (e.name === "TypeError" &&
          ["fetch failed", "Failed to fetch"].includes(String(e.message))) ||
        (e.name === "Error" && e.message === "Network connection lost."),
    )
  )
    return { ...base, kind: "connection", ...(code && { code }) };
  return { ...base, kind: "unknown" };
}

export class PublicReadError extends Error {
  constructor() {
    super("Public content temporarily unavailable");
    this.name = "PublicReadError";
  }
}

/** Observe explicit public loaders without adding deadlines, retries or cancellation claims.
 * Admin/preview bypass this wrapper. The existing database transport remains unchanged.
 */
export async function withPublicRead<T>(operation: string, read: () => Promise<T>): Promise<T> {
  if (scope.getStore()) return read();
  const started = performance.now();
  const report = (outcome: "failed" | "slow", diagnosis?: Diagnosis) => {
    const record = JSON.stringify({
      service: "fhfs public read",
      operation: /^[a-z][a-z0-9-]{0,47}$/.test(operation) ? operation : "content",
      outcome,
      durationMs: Math.round(performance.now() - started),
      ...diagnosis,
    });
    if (outcome === "failed") console.error(record);
    else console.info(record);
  };
  try {
    // Await lazy Drizzle thenables inside the scope, rather than returning them out of it.
    const value = await scope.run(true, async () => await read());
    if (performance.now() - started >= 1_000) report("slow");
    return value;
  } catch (error) {
    report("failed", diagnosePublicRead(error));
    // Framework loggers must not serialize Drizzle's SQL/parameters or Neon's credentials.
    throw new PublicReadError();
  }
}
