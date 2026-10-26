import {
  checkPublicSite,
  reportUptime,
  validUptimePing,
  UptimeReportError,
} from "../../src/lib/uptime";

export default {
  async scheduled(_event: unknown, env: { HEALTHCHECKS_PING_URL?: string }) {
    if (!validUptimePing(env.HEALTHCHECKS_PING_URL))
      throw new Error("Uptime watchdog is not configured");
    const results = await checkPublicSite();
    console.info(JSON.stringify({ service: "fhfs uptime", phase: "probes", results }));
    let ok: boolean;
    try {
      ok = await reportUptime(env.HEALTHCHECKS_PING_URL, results);
    } catch (error) {
      if (error instanceof UptimeReportError)
        console.error(
          JSON.stringify({
            service: "fhfs uptime",
            phase: "watchdog",
            reason: error.reason,
            status: error.status,
          }),
        );
      throw error;
    }
    console.info(JSON.stringify({ service: "fhfs uptime", phase: "reported", ok }));
    if (!ok) throw new Error("Public uptime checks failed; watchdog notified");
  },
};
