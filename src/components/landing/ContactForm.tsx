"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { submitTrial, type TrialState } from "@/app/trial/actions";

const field =
  "min-h-11 rounded-[10px] border border-[#b5aa98] bg-white p-3 font-normal text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "grid gap-1.5 text-[14px] font-bold";

export function ContactForm() {
  const [state, action, pending] = useActionState<TrialState, FormData>(submitTrial, {});
  const [interest, setInterest] = useState("trial");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");

  if (state.done) {
    return (
      <div role="status" className="relative grid content-start gap-3 rounded-2xl border border-white/60 bg-paper/85 p-7 text-ink backdrop-blur-xl">
        <h3 className="text-[26px] font-extrabold text-forest">Thanks, {state.done.name}!</h3>
        <p className="text-[16px] leading-relaxed">The front desk has your message and will call you back within a day.</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative grid gap-3.5 rounded-2xl border border-white/60 bg-paper/80 p-7 text-ink backdrop-blur-xl">
      <input type="hidden" name="email" value="" />
      <input type="hidden" name="interest" value={interest} />
      <input type="hidden" name="message" value={[when && `Preferred: ${when}`, note].filter(Boolean).join(" · ")} />
      <label className="sr-only" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className={label}>
        Name
        <input name="name" autoComplete="name" defaultValue={state.fields?.name} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Phone
          <input name="phone" type="tel" autoComplete="tel" defaultValue={state.fields?.phone} className={field} />
        </label>
        <label className={label}>
          Interested in
          <select value={interest} onChange={(e) => setInterest(e.target.value)} className={field}>
            <option value="trial">Free trial</option>
            <option value="membership">Membership</option>
            <option value="other">Corporate plan</option>
          </select>
        </label>
      </div>
      <label className={label}>
        Preferred day and time
        <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="e.g. Saturday, 6 PM" className={field} />
      </label>
      <label className={label}>
        Message
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ball p-4 text-[17px] font-extrabold text-forest-deep hover:bg-[#b6dd45] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Send us a message
      </button>
      {state.error && (
        <p role="alert" className="text-[14px] font-semibold text-clay">
          {state.error}
        </p>
      )}
    </form>
  );
}
