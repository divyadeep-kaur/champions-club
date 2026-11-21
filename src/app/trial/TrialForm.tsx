"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { submitTrial, type TrialState } from "./actions";

const input =
  "mt-1.5 w-full border border-line bg-paper px-3.5 py-3 text-[16px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "text-[14px] font-semibold text-ink";

const interests = [
  { value: "trial", label: "A trial session", hint: "Play an hour free with a coach" },
  { value: "membership", label: "Membership", hint: "Gold, Silver or Junior plans" },
  { value: "other", label: "Something else", hint: "Events, corporate, coaching" },
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

  if (state.done) {
    return (
      <div className="border border-[#c9dfa0] bg-[#eef6dc] p-6">
        <CheckCircle2 className="size-8 text-[#4d7a12]" />
        <h2 className="mt-3 font-serif text-[30px] font-semibold leading-tight text-forest">Thanks, {state.done.name}.</h2>
        <p className="mt-2 text-[16px] text-ink">
          The front desk has your request{state.done.when ? ` for ${state.done.when}` : ""} and will call you shortly to confirm.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[15px] font-semibold">
          <Link href="/" className="text-forest underline underline-offset-4">
            Back to the club
          </Link>
          <Link href="/courts" className="text-forest underline underline-offset-4">
            See this week’s courts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="courtId" value={defaults.courtId ?? ""} />
      <input type="hidden" name="plan" value={defaults.plan ?? ""} />
      <input type="hidden" name="interest" value={interest} />
      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset>
        <legend className={label}>I’m interested in</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {interests.map((i) => (
            <label
              key={i.value}
              className={`cursor-pointer border p-3 transition-colors ${interest === i.value ? "border-forest bg-paper ring-2 ring-forest/15" : "border-line bg-paper/60 hover:border-forest/50"}`}
            >
              <input type="radio" checked={interest === i.value} onChange={() => setInterest(i.value)} className="sr-only" />
              <span className="block text-[15px] font-semibold text-ink">{i.label}</span>
              <span className="block text-[13px] text-muted">{i.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={label}>Your name</span>
          <input name="name" defaultValue={f.name} autoComplete="name" className={input} />
        </label>
        <label className="block">
          <span className={label}>Mobile number</span>
          <input name="phone" defaultValue={f.phone} inputMode="tel" autoComplete="tel" placeholder="98765 43210" className={input} />
        </label>
        <label className="block">
          <span className={label}>
            Email <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="email" type="email" defaultValue={f.email} autoComplete="email" className={input} />
        </label>

        {interest === "trial" && (
          <>
            <label className="block">
              <span className={label}>Preferred day</span>
              <input name="date" type="date" min={minDate} defaultValue={f.date ?? defaults.date} className={input} />
            </label>
            <label className="block">
              <span className={label}>Preferred time</span>
              <input name="time" type="time" min="06:00" max="22:00" step={1800} defaultValue={f.time ?? defaults.time} className={input} />
            </label>
            {courtName && <p className="text-[14px] text-muted sm:col-span-2">You picked {courtName}. We’ll hold it while we call you.</p>}
          </>
        )}

        <label className="block sm:col-span-2">
          <span className={label}>
            Anything we should know? <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea name="message" defaultValue={f.message} rows={3} placeholder={interest === "membership" ? "e.g. family of three, mostly weekends" : "e.g. first time playing, need a racket"} className={input} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center gap-2.5 bg-forest px-7 py-4 text-[17px] font-semibold text-cream transition-colors hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {interest === "trial" ? "Request my trial" : "Send enquiry"}
          {!pending && <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-0.5" />}
        </button>
        <p role="alert" aria-live="polite" className="text-[14.5px] font-medium text-clay">
          {state.error}
        </p>
      </div>
    </form>
  );
}
