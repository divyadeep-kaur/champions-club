"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { memberLogin, type MeState } from "../actions";

const input =
  "mt-1.5 w-full border border-line bg-paper px-4 py-3.5 text-[17px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15";

export function MemberLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<MeState, FormData>(memberLogin, {});
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="text-[14px] font-semibold">Mobile number</span>
        <input name="phone" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={input} />
      </label>
      <label className="block">
        <span className="text-[14px] font-semibold">Member code</span>
        <input name="code" autoCapitalize="characters" placeholder="CC-0001" className={`${input} uppercase`} />
        <span className="mt-1.5 block text-[13px] text-muted">It’s on your welcome message from the front desk.</span>
      </label>
      <p role="alert" aria-live="polite" className="min-h-5 text-[14px] font-medium text-clay">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 bg-forest px-6 py-4 text-[17px] font-semibold text-cream transition-colors hover:bg-forest-deep disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Signing in" : "Sign in"}
        {!pending && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
