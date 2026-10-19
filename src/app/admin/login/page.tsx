import { LoginForm } from "./LoginForm";
import { cardClass, metaClass } from "../styles";

export default function LoginPage({
  data,
}: {
  data: Awaited<ReturnType<typeof import("./page.server").loadPageData>>;
}) {
  const { next } = data;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <div className={`${cardClass} p-6 shadow-card sm:p-8`}>
        <h1 className={metaClass}>fhf · admin</h1>
        <p className="mt-2 text-caption text-fg-tertiary">输入密码后可以修改站点内容。</p>
        {/* Carried through the sign-in so a bookmarked edit page comes back.
          `next` can arrive as an array (?next=a&next=b) — treat that as unset. */}
        <LoginForm next={typeof next === "string" && next.startsWith("/admin") ? next : ""} />
      </div>
    </main>
  );
}
