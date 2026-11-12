"use client";

import { useActionState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { login, type LoginState } from "./actions";
import { labelClass } from "../styles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Feedback } from "@/components/ui/Feedback";

export function LoginForm({ next }: { next: string }) {
  const signIn = useServerFn(login);
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    async (previous, form) => (await signIn(previous, form)) ?? {},
    {},
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="next" value={next} />

      <label htmlFor="password" className={`${labelClass} mb-1.5`}>
        密码
      </label>
      <Input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
      />

      {state.error && (
        <Feedback tone="error" className="mt-3">
          {state.error}
        </Feedback>
      )}

      <Button type="submit" tone="primary" busy={pending} className="mt-4 w-full">
        {pending ? "正在进入…" : "进入"}
      </Button>
    </form>
  );
}
