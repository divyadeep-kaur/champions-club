"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { inr } from "@/lib/constants";
import { bookTrial, logContact, markLost, sendQuote, type LeadState } from "./actions";

const input = "mt-1 w-full border border-[#b5aa98] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "text-[13px] font-semibold text-muted";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-paper p-4">
      <h3 className="font-serif text-[19px] font-medium text-forest">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Submit({ pending, children, tone = "forest" }: { pending: boolean; children: React.ReactNode; tone?: "forest" | "clay" }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-[14.5px] font-semibold disabled:opacity-70 ${tone === "forest" ? "bg-forest text-cream hover:bg-forest-deep" : "border border-clay/50 text-clay hover:bg-clay-soft"}`}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

function Feedback({ state }: { state: LeadState }) {
  return (
    <p role="status" aria-live="polite" className={`min-h-5 text-[13.5px] font-medium ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function LeadActions({
  lead,
  courts,
  plans,
  slots,
}: {
  lead: { id: number; status: string; defaultDate: string; defaultTime: string; defaultCourtId?: number; plan?: string | null };
  courts: { id: number; name: string }[];
  plans: { name: string; monthlyFee: number }[];
  slots: string[];
}) {
  const [noteState, noteAction, notePending] = useActionState<LeadState, FormData>(logContact, {});
  const [trialState, trialAction, trialPending] = useActionState<LeadState, FormData>(bookTrial, {});
  const [quoteState, quoteAction, quotePending] = useActionState<LeadState, FormData>(sendQuote, {});
  const [lostState, lostAction, lostPending] = useActionState<LeadState, FormData>(markLost, {});
  const [plan, setPlan] = useState(lead.plan ?? plans.find((p) => p.name === "Silver")?.name ?? plans[0]?.name);
  const fee = plans.find((p) => p.name === plan)?.monthlyFee ?? 0;
  const closed = lead.status === "won";
  const lost = lead.status === "lost";

  if (closed) return null;

  return (
    <div className="space-y-4">
      <Link
        href={`/staff/members/new?lead=${lead.id}`}
        className="flex items-center justify-center gap-2 bg-forest px-4 py-3.5 text-[15.5px] font-semibold text-cream hover:bg-forest-deep"
      >
        <UserPlus className="size-[18px]" /> Convert to member
      </Link>

      <Card title={lost ? "Reopen with a note" : "Log a call or note"}>
        <form action={noteAction} className="space-y-2">
          <input type="hidden" name="leadId" value={lead.id} />
          <textarea name="text" rows={2} placeholder="e.g. Called, wants a Saturday morning slot" className={input} />
          <div className="flex items-center justify-between gap-3">
            <Feedback state={noteState} />
            <Submit pending={notePending}>Save note</Submit>
          </div>
        </form>
      </Card>

      {!lost && (
        <>
          <Card title="Book a trial session">
            <form action={trialAction} className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={lbl}>Day</span>
                  <input name="date" type="date" defaultValue={lead.defaultDate} className={input} />
                </label>
                <label className="block">
                  <span className={lbl}>Time</span>
                  <select name="time" defaultValue={lead.defaultTime} className={input}>
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={lbl}>Court</span>
                <select name="courtId" defaultValue={lead.defaultCourtId} className={input}>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-between gap-3">
                <Feedback state={trialState} />
                <Submit pending={trialPending}>Book free trial</Submit>
              </div>
            </form>
          </Card>

          <Card title="Send a membership quote">
            <form action={quoteAction} className="space-y-3">
              <input type="hidden" name="leadId" value={lead.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={lbl}>Plan</span>
                  <select name="plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={input}>
                    {plans.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={lbl}>Amount (₹)</span>
                  <input key={plan} name="amount" type="number" min={0} defaultValue={fee} className={input} />
                </label>
              </div>
              <p className="text-[12.5px] text-muted">List price {inr(fee)} for 30 days. Change it for a family or corporate deal.</p>
              <div className="flex items-center justify-between gap-3">
                <Feedback state={quoteState} />
                <Submit pending={quotePending}>Record quote</Submit>
              </div>
            </form>
          </Card>

          <Card title="Not interested?">
            <form action={lostAction} className="space-y-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <input name="reason" placeholder="e.g. Too far from home" className={input} />
              <div className="flex items-center justify-between gap-3">
                <Feedback state={lostState} />
                <Submit pending={lostPending} tone="clay">
                  Mark lost
                </Submit>
              </div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
