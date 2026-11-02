import { env } from "@/lib/server/env";
import { revalidateTag } from "@/lib/server/cache";
import { appGithubRepo, githubCacheTag, githubEventRepo } from "@/lib/githubData";
import { getApps } from "@/lib/server/content";
import { readGithubBody, validGithubSignature } from "@/lib/server/githubWebhook";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });

  const body = await readGithubBody(request);
  if (!body) return Response.json({ error: "Payload too large" }, { status: 413 });
  if (!validGithubSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ ok: true });
  const repo = githubEventRepo(event, payload);
  if (!repo) return Response.json({ ignored: true });

  const apps = await getApps();
  if (!apps.some((app) => appGithubRepo(app) === repo.toLowerCase())) {
    return Response.json({ ignored: true });
  }

  // Expire this Worker's cached data; the next page request fetches fresh data.
  revalidateTag(githubCacheTag(repo), { expire: 0 });
  return Response.json({ ok: true, repo });
}
