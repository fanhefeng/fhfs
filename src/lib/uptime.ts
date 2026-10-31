import { readResponseBytes, withinDeadline } from "./deadline";

/** Public, read-only checks. No database, session or upload credentials are used. */
const SITE = "https://fhfs.fhfs.workers.dev";
const MEDIA = "https://fhfs-media.fhfs.workers.dev";
type Fetcher = typeof fetch;
type Probe = { label: string; url: string; kind: "page" | "search" | "login" | "auth" | "media" };
export type ProbeResult = {
  label: string;
  ok: boolean;
  status: number | null;
  reason?: "http" | "content" | "connection" | "body" | "timeout";
  phase?: "response" | "body" | "validation";
  elapsedMs?: number;
};
export const PUBLIC_PROBES: readonly Probe[] = [
  { label: "zh page", url: `${SITE}/zh`, kind: "page" },
  { label: "en page", url: `${SITE}/en`, kind: "page" },
  { label: "zh content", url: `${SITE}/zh/search.json`, kind: "search" },
  { label: "en content", url: `${SITE}/en/search.json`, kind: "search" },
  { label: "admin login", url: `${SITE}/admin/login`, kind: "login" },
  { label: "admin session guard", url: `${SITE}/admin`, kind: "auth" },
  {
    label: "media image",
    url: `${MEDIA}/moments/m-20260803-102101-1.jpg`,
    kind: "media",
  },
  {
    label: "media audio",
    url: `${MEDIA}/moments/m-20250918-075233-1.m4a`,
    kind: "media",
  },
];

function boundedBody(response: Response, signal?: AbortSignal): Promise<Uint8Array> {
  return readResponseBytes(response, signal, 512 * 1024);
}

export async function checkPublicSite(fetcher: Fetcher = fetch): Promise<ProbeResult[]> {
  return Promise.all(
    PUBLIC_PROBES.map(async (probe): Promise<ProbeResult> => {
      let status: number | null = null;
      const progress: { phase: "response" | "body" | "validation" } = { phase: "response" };
      const started = performance.now();
      try {
        const result = await withinDeadline(async (signal): Promise<ProbeResult> => {
          const response = await fetcher(probe.url, {
            redirect: "manual",
            signal,
            headers: {
              "User-Agent": "fhfs-uptime/1.0",
              "Cache-Control": "no-cache",
              ...(probe.kind === "media" ? { Range: "bytes=0-63" } : {}),
            },
          });
          status = response.status;
          if (probe.kind === "auth") {
            progress.phase = "validation";
            await response.body?.cancel();
            const location = response.headers.get("location");
            const login = location ? new URL(location, SITE) : null;
            const ok =
              [302, 303, 307, 308].includes(status) &&
              login?.origin === SITE &&
              login.pathname === "/admin/login";
            return { label: probe.label, status, ok, ...(!ok && { reason: "content" as const }) };
          }
          if (status !== (probe.kind === "media" ? 206 : 200)) {
            await response.body?.cancel();
            return { label: probe.label, status, ok: false, reason: "http" };
          }
          progress.phase = "body";
          const bytes = await boundedBody(response, signal);
          progress.phase = "validation";
          let ok: boolean;
          if (probe.kind === "media") {
            ok =
              bytes.length === 64 &&
              /^bytes 0-63\/[1-9]\d*$/.test(response.headers.get("content-range") ?? "") &&
              (probe.label === "media image"
                ? response.headers.get("content-type")?.startsWith("image/") === true &&
                  bytes[0] === 0xff &&
                  bytes[1] === 0xd8
                : response.headers.get("content-type")?.startsWith("audio/") === true);
          } else {
            const body = new TextDecoder().decode(bytes);
            if (probe.kind === "search") {
              ok =
                response.headers.get("content-type")?.includes("application/json") === true &&
                Array.isArray(JSON.parse(body));
            } else {
              // The complete English error catalogue is serialized on healthy pages.
              // Match rendered error headings, not phrases anywhere in that payload.
              ok =
                response.headers.get("content-type")?.includes("text/html") === true &&
                (probe.kind === "login" ? /name="password"/.test(body) : body.includes("<main")) &&
                !/s:"error"|<(?:h1|title)\b[^>]*>\s*(?:The page could not be loaded|This page failed to load|Error 1102)/.test(
                  body,
                );
            }
          }
          return { label: probe.label, status, ok, ...(!ok && { reason: "content" as const }) };
        }, started + 20_000);
        return {
          ...result,
          elapsedMs: Math.round(performance.now() - started),
          ...(!result.ok && { phase: progress.phase }),
        };
      } catch (error) {
        // Exception messages and response bodies can contain private data.
        return {
          label: probe.label,
          status,
          ok: false,
          elapsedMs: Math.round(performance.now() - started),
          phase: progress.phase,
          reason:
            error instanceof DOMException && error.name === "TimeoutError"
              ? "timeout"
              : progress.phase === "validation"
                ? "content"
                : status === null
                  ? "connection"
                  : "body",
        };
      }
    }),
  );
}

export function validUptimePing(value: string | undefined): value is string {
  return /^https:\/\/hc-ping\.com\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value ?? "");
}

export class UptimeReportError extends Error {
  constructor(
    readonly reason: "network" | "http" | "ignored",
    readonly status: number | null,
    readonly detail?: "redirect" | "quota" | "encoding" | "stream" | "transport",
  ) {
    super("Uptime watchdog did not acknowledge the report");
  }
}

export async function reportUptime(
  ping: string | undefined,
  results: ProbeResult[],
  fetcher: Fetcher = fetch,
): Promise<boolean> {
  if (!validUptimePing(ping)) throw new Error("Uptime watchdog is not configured");
  const ok = results.length === PUBLIC_PROBES.length && results.every((result) => result.ok);
  const summary = results
    .map(
      (r) => `${r.label}: ${r.ok ? "ok" : `${r.reason}${r.status === null ? "" : ` ${r.status}`}`}`,
    )
    .join("\n");
  let response: Response;
  let acknowledgement: string;
  try {
    response = await fetcher(ping + (ok ? "" : "/fail"), {
      method: "POST",
      // Workers reject redirect: "error"; inspect manual responses instead.
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "text/plain" },
      body: `fhfs public uptime: ${ok ? "success" : "failure"}\n${summary}`,
    });
    acknowledgement = new TextDecoder().decode(await boundedBody(response)).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const detail = /redirect/i.test(message)
      ? "redirect"
      : /subrequest|limit exceeded/i.test(message)
        ? "quota"
        : /decompress|encoding/i.test(message)
          ? "encoding"
          : /stream|reader/i.test(message)
            ? "stream"
            : "transport";
    throw new UptimeReportError("network", null, detail);
  }
  if (response.status !== 200) throw new UptimeReportError("http", response.status);
  if (acknowledgement !== "OK") throw new UptimeReportError("ignored", response.status);
  return ok;
}
