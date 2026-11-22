"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { memberSignup, type SignupState } from "../actions";

const field =
  "min-h-12 rounded-xl border border-[#b5aa98] bg-white p-3 font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "grid gap-1.5 text-[14px] font-bold";

export function MemberSignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(memberSignup, {});
  const f = state.fields ?? {};

  if (state.code)
    return (
      <div className="cc-pop-in grid gap-4 rounded-[22px] border border-white/60 bg-paper/90 p-6 backdrop-blur-xl" role="status">
        <p className="flex items-center gap-2 text-[24px] font-extrabold text-forest">
          <CheckCircle2 className="size-6 text-ball" /> {state.claimed ? "Password set" : "Account created"}
        </p>
        <p className="text-[15px] text-[#3c4a43]">
          {state.claimed
            ? `Thanks ${state.name}. You can now sign in with your phone, password and member code.`
            : `Welcome ${state.name}! Your account will be ready once the front desk approves it. Your sign-up includes a free trial week.`}
        </p>
        <div className="grid gap-1 rounded-2xl border-2 border-dashed border-forest/40 bg-white p-4 text-center">
          <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-muted">Your member code</span>
          <span className="font-serif text-[40px] leading-tight text-forest">{state.code}</span>
        </div>
        <p className="rounded-xl bg-[#fbeee0] p-3 text-[14px] font-semibold text-[#7a3a1d]">
          Save this code and your password. You need your phone number, password and this code every time you sign in.
        </p>
        <Link
          href="/me/login"
          className="flex items-center justify-center rounded-full bg-forest p-[15px] text-[17px] font-extrabold text-cream hover:bg-forest-deep"
        >
          Go to sign in
        </Link>
      </div>
    );

  return (
    <form action={action} className="grid gap-3.5 rounded-[22px] border border-white/60 bg-paper/85 p-6 backdrop-blur-xl" noValidate>
      <h1 className="text-[30px] font-extrabold text-forest">Create account</h1>
      <p className="text-[15px] text-[#3c4a43]">Sign up with your phone number and a password. You get your member code straight away.</p>
      <label className={label}>
        Full name
        <input name="name" autoComplete="name" defaultValue={f.name} className={field} />
      </label>
      <label className={label}>
        Mobile number
        <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" defaultValue={f.phone} className={field} />
      </label>
      <label className={label}>
        <span>
          Email <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="email" type="email" autoComplete="email" defaultValue={f.email} className={field} />
      </label>
      <label className={label}>
        Password
        <input name="password" type="password" autoComplete="new-password" placeholder="At least 6 characters" className={field} />
      </label>
      <label className={label}>
        Confirm password
        <input name="confirm" type="password" autoComplete="new-password" className={field} />
      </label>
      <label className={label}>
        <span>
          Member code <span className="font-normal text-muted">(only if the desk already gave you one)</span>
        </span>
        <input name="code" autoCapitalize="characters" placeholder="CC-0001" defaultValue={f.code} className={`${field} uppercase`} />
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
        Create account
      </button>
      <p className="text-center text-[13.5px] text-muted">
        Already have an account?{" "}
        <Link href="/me/login" className="font-semibold text-forest underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
