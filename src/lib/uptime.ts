/** Public, read-only checks. No database, session or upload credentials are used. */
const SITE = "https://fhfs.fhfs.workers.dev";
const MEDIA = "https://fhfs-media.fhfs.workers.dev";
type Fetcher = typeof fetch;
type Probe = { label: string; url: string; kind: "page" | "search" | "login" | "auth" | "media" };
export type ProbeResult = {
  label: string;
  ok: boolean;
  status: number | null;
  reason?: "http" | "content" | "network";
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

async function boundedBody(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512 * 1024) throw new Error("Response too large");
      parts.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export async function checkPublicSite(fetcher: Fetcher = fetch): Promise<ProbeResult[]> {
  return Promise.all(
    PUBLIC_PROBES.map(async (probe): Promise<ProbeResult> => {
      let status: number | null = null;
      try {
        const response = await fetcher(probe.url, {
          redirect: "manual",
          signal: AbortSignal.timeout(20_000),
          headers: {
            "User-Agent": "fhfs-uptime/1.0",
            "Cache-Control": "no-cache",
            ...(probe.kind === "media" ? { Range: "bytes=0-63" } : {}),
          },
        });
        status = response.status;
        if (probe.kind === "auth") {
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
        const bytes = await boundedBody(response);
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
            ok =
              response.headers.get("content-type")?.includes("text/html") === true &&
              (probe.kind === "login" ? /name="password"/.test(body) : body.includes("<main")) &&
              !/s:"error"|The page could not be loaded|This page failed to load|Error 1102/.test(
                body,
              );
          }
        }
        return { label: probe.label, status, ok, ...(!ok && { reason: "content" as const }) };
      } catch {
        // Exception messages and response bodies can contain private data.
        return {
          label: probe.label,
          status,
          ok: false,
          reason: status === null ? "network" : "content",
        };
      }
    }),
  );
}

export function validUptimePing(value: string | undefined): value is string {
  return /^https:\/\/hc-ping\.com\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value ?? "");
}

export async function reportUptime(
  ping: string | undefined,
  results: ProbeResult[],
  fetcher: Fetcher = fetch,
): Promise<boolean> {
  if (!validUptimePing(ping)) throw new Error("Uptime watchdog is not configured");
  const ok = results.length === PUBLIC_PROBES.length && results.every((result) => result.ok);
  const summary = results
    .map((r) => `${r.label}: ${r.ok ? "ok" : `${r.reason} ${r.status ?? "timeout"}`}`)
    .join("\n");
  try {
    const response = await fetcher(ping + (ok ? "" : "/fail"), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "text/plain" },
      body: `fhfs public uptime: ${ok ? "success" : "failure"}\n${summary}`,
    });
    if (response.status !== 200 || (await response.text()).trim() !== "OK") throw new Error();
  } catch {
    throw new Error("Uptime watchdog did not acknowledge the report");
  }
  return ok;
}
