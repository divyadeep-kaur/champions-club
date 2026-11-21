"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { login, type LoginState } from "./actions";

const input =
  "mt-1.5 w-full border border-line bg-paper px-4 py-3 text-[16px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15";

export function LoginForm({ next, admin }: { next?: string; admin?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-9 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="as" value={admin ? "admin" : "staff"} />
      <label className="block">
        <span className="text-[14px] font-semibold text-ink">Email</span>
        <input name="email" type="email" autoComplete="username" defaultValue={state.email} required className={input} />
      </label>
      <label className="block">
        <span className="text-[14px] font-semibold text-ink">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>

      <p role="alert" aria-live="polite" className="min-h-5 text-[14px] font-medium text-clay">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 bg-forest px-6 py-3.5 text-[16px] font-semibold text-cream transition-colors hover:bg-forest-deep disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Signing in" : "Sign in"}
        {!pending && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
