"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { submitTrial, trialStatus, type TrialState, type TrialStatus } from "./actions";

const field =
  "min-h-11 rounded-[10px] border border-[#b5aa98] bg-white p-3 font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "grid gap-1.5 text-[14px] font-bold";

const interests = [
  { value: "trial", label: "Free trial" },
  { value: "membership", label: "Membership" },
] as const;

type PlanOption = { name: string; monthlyFee: number; durationDays: number; description: string };

export function TrialForm({
  defaults,
  courtName,
  minDate,
  plans,
}: {
  defaults: { interest: string; date?: string; time?: string; courtId?: string; plan?: string; sport?: string };
  courtName?: string;
  minDate: string;
  plans: PlanOption[];
}) {
  const [state, action, pending] = useActionState<TrialState, FormData>(submitTrial, {});
  const f = state.fields ?? {};
  const [interest, setInterest] = useState(f.interest ?? defaults.interest);
  const [sport, setSport] = useState(f.sport || defaults.sport || "tennis");
  const [plan, setPlan] = useState(f.plan ?? (plans.some((p) => p.name === defaults.plan) ? defaults.plan! : ""));
  const [again, setAgain] = useState(0);

  if (state.done && again === 0) {
    return (
      <div role="status" className="grid gap-3.5">
        <h2 className="text-[32px] font-extrabold text-forest">Thanks, {state.done.name}!</h2>
        <p className="text-[17px] leading-relaxed">
          We’ve got your request
          {state.done.when ? (
            <>
              {" "}
              for <strong>{state.done.when}</strong>
            </>
          ) : null}
          . The desk will call you on your mobile within a day to confirm.
        </p>
        {state.done.trial && state.done.id && state.done.phone ? (
          <LiveStatus id={state.done.id} phone={state.done.phone} held={state.done.court} />
        ) : (
          <p className="bg-[#e3efc7] px-3.5 py-3 text-[15px] text-[#2f4a0a]">Your request is with the front desk.</p>
        )}
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
      <input type="hidden" name="plan" value={interest === "membership" ? plan : ""} />
      <input type="hidden" name="interest" value={interest} />
      <input type="hidden" name="sport" value={interest === "trial" ? sport : ""} />
      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[14px] font-bold">I’m interested in</legend>
        <div className="grid grid-cols-2 gap-2">
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
      <label className={label}>
        Email (optional)
        <input name="email" type="email" defaultValue={f.email} autoComplete="email" placeholder="you@example.com" className={field} />
      </label>
      {interest === "membership" && plans.length > 0 && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[14px] font-bold">Which plan?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {plans.map((p) => (
              <button
                key={p.name}
                type="button"
                aria-pressed={plan === p.name}
                onClick={() => setPlan(p.name)}
                className={`grid content-start gap-1 rounded-xl border-[1.5px] border-forest px-3 py-3 text-left ${plan === p.name ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-[15px] font-semibold tabular-nums">
                  ₹{p.monthlyFee.toLocaleString("en-IN")}
                  <span className={`text-[12.5px] font-normal ${plan === p.name ? "text-cream/80" : "text-muted"}`}>
                    {" "}
                    / {p.durationDays === 30 ? "month" : `${p.durationDays} days`}
                  </span>
                </span>
                <span className={`text-[12.5px] leading-snug ${plan === p.name ? "text-cream/80" : "text-muted"}`}>{p.description}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={plan === ""}
            onClick={() => setPlan("")}
            className={`min-h-11 rounded-xl border-[1.5px] px-3 text-[14.5px] font-semibold ${plan === "" ? "border-forest bg-forest/10 text-forest" : "border-line text-muted hover:border-forest hover:text-forest"}`}
          >
            Not sure yet, help me choose
          </button>
        </fieldset>
      )}
      {interest === "trial" && !defaults.courtId && (
        <fieldset>
          <legend className="mb-2 text-[14px] font-bold">Which sport?</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["tennis", "Tennis", "Clay and hard courts"],
                ["cricket", "Cricket", "Practice nets"],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                aria-pressed={sport === value}
                onClick={() => setSport(value)}
                className={`grid min-h-14 rounded-xl border-[1.5px] border-forest px-3 py-2.5 text-left ${sport === value ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
              >
                <span className="font-bold">{label}</span>
                <span className={`text-[12.5px] ${sport === value ? "text-cream/80" : "text-muted"}`}>{hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
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
        <textarea
          name="message"
          defaultValue={f.message}
          rows={3}
          placeholder={interest === "membership" ? "e.g. family of three, mostly weekends" : "e.g. haven’t played in a few years"}
          className={field}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-forest p-4 text-[17px] font-extrabold text-cream hover:bg-forest-deep disabled:opacity-70"
      >
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

// Shows the club's answer as soon as the desk approves or declines,
// by asking the server every few seconds while this screen is open.
function LiveStatus({ id, phone, held }: { id: number; phone: string; held?: string }) {
  const [status, setStatus] = useState<TrialStatus>({ decision: "pending", court: held });

  useEffect(() => {
    if (status.decision !== "pending") return;
    let alive = true;
    const check = () =>
      trialStatus(id, phone)
        .then((s) => alive && s.decision && setStatus(s))
        .catch(() => {});
    const timer = setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id, phone, status.decision]);

  if (status.decision === "approved") {
    return (
      <p role="status" className="flex items-start gap-2.5 bg-[#e3efc7] px-3.5 py-3 text-[15px] text-[#2f4a0a]">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          <strong>Approved!</strong> Your free trial is confirmed
          {status.court ? (
            <>
              {" "}
              on <strong>{status.court}</strong>
            </>
          ) : null}
          {status.when ? <>, {status.when}</> : null}. See you at the club.
        </span>
      </p>
    );
  }
  if (status.decision === "declined") {
    return (
      <p role="status" className="flex items-start gap-2.5 bg-clay-soft px-3.5 py-3 text-[15px] text-clay">
        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>The club couldn’t take this trial slot. The desk will call you to find another time.</span>
      </p>
    );
  }
  return (
    <p role="status" className="flex items-start gap-2.5 bg-[#fbf1df] px-3.5 py-3 text-[15px] text-[#7a4b0c]">
      <Clock3 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <span>
        <strong>Waiting for approval.</strong>{" "}
        {held ? (
          <>
            We’re holding <strong>{held}</strong> for you while the desk checks it.
          </>
        ) : (
          "The desk will pick a court for you."
        )}{" "}
        This updates by itself.
      </span>
    </p>
  );
}
