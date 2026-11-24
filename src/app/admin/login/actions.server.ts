import { env } from "@/lib/server/env";

import { draftMode, headers } from "@/lib/server/request";
import { redirect } from "@/lib/navigation";
import { verifyPassword } from "@/lib/server/auth/password";
import { clearAttempts, recordAttempt } from "@/lib/server/auth/throttle";
import { clearSessionCookie, createSession, setSessionCookie } from "@/lib/server/auth/session";

export type LoginState = { error?: string };

/**
 * Sign in.
 *
 * The failure messages are deliberately uninformative — a wrong password and a
 * missing one say the same thing — and every attempt is recorded before the
 * password is even looked at, so the throttle counts guesses rather than
 * successes. The record and the verdict travel as one request (lib/server/auth/
 * throttle.ts), so a burst of concurrent guesses cannot all slip under the
 * same count.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const stored = env.ADMIN_PASSWORD_HASH;
  const secret = env.AUTH_SECRET;
  if (!stored || !secret) {
    return { error: "服务器未配置管理员密码。" };
  }

  // Only the current platform's ingress sets a trusted client IP header.
  const clientIpHeader =
    import.meta.env.FHFS_TARGET === "vercel" ? "x-real-ip" : "cf-connecting-ip";
  const ip = (await headers()).get(clientIpHeader) ?? "unknown";

  const { throttled } = await recordAttempt(ip);
  if (throttled) {
    return { error: "尝试次数过多，请等 15 分钟后再试。" };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !(await verifyPassword(password, stored))) {
    return { error: "密码不对。" };
  }

  await setSessionCookie(await createSession());
  await clearAttempts(ip);

  const next = formData.get("next");
  // The login page shares the admin layout and has already loaded its anonymous counts.
  redirect(typeof next === "string" && next.startsWith("/admin") ? next : "/admin", {
    reloadDocument: true,
  });
}

/**
 * Sign out, and out of the draft preview too: its cookie would outlive the
 * session otherwise (the pages check both, see `showDrafts`), and a preview
 * banner left behind on a shared computer invites the next person to look.
 */
export async function logout(): Promise<void> {
  await clearSessionCookie();
  (await draftMode()).disable();
  redirect("/admin/login");
}
