import { checkPublicSite, reportUptime, validUptimePing } from "../../src/lib/uptime";

export default {
  async scheduled(_event: unknown, env: { HEALTHCHECKS_PING_URL?: string }) {
    if (!validUptimePing(env.HEALTHCHECKS_PING_URL))
      throw new Error("Uptime watchdog is not configured");
    const results = await checkPublicSite();
    const ok = await reportUptime(env.HEALTHCHECKS_PING_URL, results);
    console.info(JSON.stringify({ service: "fhfs uptime", ok, results }));
    if (!ok) throw new Error("Public uptime checks failed; watchdog notified");
  },
};
