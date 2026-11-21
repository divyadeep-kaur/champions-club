"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { submitTrial, type TrialState } from "./actions";

const field = "min-h-11 rounded-[10px] border border-[#b5aa98] bg-white p-3 font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "grid gap-1.5 text-[14px] font-bold";

const interests = [
  { value: "trial", label: "Free trial" },
  { value: "membership", label: "Membership" },
  { value: "other", label: "Other" },
] as const;

export function TrialForm({
  defaults,
  courtName,
  minDate,
}: {
  defaults: { interest: string; date?: string; time?: string; courtId?: string; plan?: string };
  courtName?: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState<TrialState, FormData>(submitTrial, {});
  const f = state.fields ?? {};
  const [interest, setInterest] = useState(f.interest ?? defaults.interest);
  const [again, setAgain] = useState(0);

  if (state.done && again === 0) {
    return (
      <div role="status" className="grid gap-3.5">
        <h2 className="text-[32px] font-extrabold text-forest">Thanks, {state.done.name}!</h2>
        <p className="text-[17px] leading-relaxed">
          We’ve got your request{state.done.when ? (
            <>
              {" "}
              for <strong>{state.done.when}</strong>
            </>
          ) : null}
          . The desk will call you on your mobile within a day to confirm.
        </p>
        <p className="bg-[#e3efc7] px-3.5 py-3 text-[15px] text-[#2f4a0a]">Your request is with the front desk.</p>
        <Link href="/courts" className="font-bold text-forest">
          See this week’s courts →
        </Link>
        <button type="button" onClick={() => setAgain(1)} className="min-h-11 rounded-full border-[1.5px] border-forest p-3 font-bold text-forest">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={() => setAgain(0)} className="grid gap-[18px]" noValidate>
      <h2 className="text-[30px] font-extrabold text-forest">{interest === "membership" ? "Ask about membership" : "Book a free trial"}</h2>
      <input type="hidden" name="courtId" value={defaults.courtId ?? ""} />
      <input type="hidden" name="plan" value={defaults.plan ?? ""} />
      <input type="hidden" name="interest" value={interest} />
      <input type="hidden" name="email" value="" />
      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[14px] font-bold">I’m interested in</legend>
        <div className="grid grid-cols-3 gap-2">
          {interests.map((i) => (
            <button
              key={i.value}
              type="button"
              aria-pressed={interest === i.value}
              onClick={() => setInterest(i.value)}
              className={`min-h-12 rounded-xl border-[1.5px] border-forest px-2 py-3 font-bold ${interest === i.value ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        Your name
        <input name="name" defaultValue={f.name} autoComplete="name" className={field} />
      </label>
      <label className={label}>
        Mobile number
        <input name="phone" defaultValue={f.phone} inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={field} />
      </label>
      {interest === "trial" && (
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Preferred day
            <input name="date" type="date" min={minDate} defaultValue={f.date ?? defaults.date} className={field} />
          </label>
          <label className={label}>
            Preferred time
            <input name="time" type="time" min="06:00" max="22:00" step={1800} defaultValue={f.time ?? defaults.time} className={field} />
          </label>
        </div>
      )}
      {courtName && interest === "trial" && <p className="-mt-2 text-[14px] text-muted">You picked {courtName}. We’ll hold it while we call you.</p>}
      <label className={label}>
        Anything we should know? (optional)
        <textarea name="message" defaultValue={f.message} rows={3} placeholder={interest === "membership" ? "e.g. family of three, mostly weekends" : "e.g. haven’t played in a few years"} className={field} />
      </label>
      <button type="submit" disabled={pending} className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-forest p-4 text-[17px] font-extrabold text-cream hover:bg-forest-deep disabled:opacity-70">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {interest === "trial" ? "Request my free trial" : "Send my enquiry"}
      </button>
      <p role="alert" aria-live="polite" className="-mt-2 min-h-5 text-[14px] font-semibold text-clay">
        {state.error}
      </p>
      <p className="-mt-3 text-[13.5px] text-muted">We only use your number to call you about this request.</p>
    </form>
  );
}
