"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { memberLogin, type MeState } from "../actions";

const field =
  "min-h-12 rounded-xl border border-[#b5aa98] bg-white p-3 font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "grid gap-1.5 text-[14px] font-bold";

export function MemberLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<MeState, FormData>(memberLogin, {});
  return (
    <form action={action} className="grid gap-3.5 rounded-[22px] border border-white/60 bg-paper/85 p-6 backdrop-blur-xl" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <h1 className="text-[30px] font-extrabold text-forest">Member sign in</h1>
      <p className="text-[15px] text-[#3c4a43]">Book courts and order from the café.</p>
      <label className={label}>
        Mobile number
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={field} />
      </label>
      <label className={label}>
        Member code
        <input name="code" autoCapitalize="characters" placeholder="CC-0001" className={`${field} uppercase`} />
      </label>
      {state.error && (
        <p role="alert" className="text-[14px] font-semibold text-clay">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-full bg-forest p-[15px] text-[17px] font-extrabold text-cream hover:bg-forest-deep disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Sign in
      </button>
      <p className="text-center text-[13.5px] text-muted">
        Lost your code? Ask at the front desk. Not a member?{" "}
        <Link href="/trial" className="font-semibold text-forest underline underline-offset-4">
          Book a free trial
        </Link>
      </p>
    </form>
  );
}
