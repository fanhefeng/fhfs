import { checkPublicSite, reportUptime } from "../src/lib/uptime";

const results = await checkPublicSite();
console.log(JSON.stringify(results, null, 2));
if (process.argv.includes("--report")) {
  await reportUptime(process.env.HEALTHCHECKS_PING_URL, results);
}
if (results.some((r) => !r.ok)) process.exitCode = 1;
