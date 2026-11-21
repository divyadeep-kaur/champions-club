"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { MemberOption } from "./NewBookingForm";
import { joinSocial, type RosterState } from "./social";

export function JoinSocialForm({ bookingId, members, full }: { bookingId: number; members: MemberOption[]; full: boolean }) {
  const [state, action, pending] = useActionState<RosterState, FormData>(joinSocial, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="block">
        <span className="text-[13px] font-semibold text-muted">{full ? "Add to waitlist" : "Add a player"}</span>
        <div className="mt-1 flex gap-2">
          <input
            name="player"
            list="social-members"
            placeholder="Member code or guest name"
            autoComplete="off"
            className="min-w-0 flex-1 border border-line bg-cream/40 px-3 py-2 text-[14.5px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
          <select name="method" defaultValue="upi" aria-label="Payment" className="border border-line bg-cream/40 px-2 text-[14px]">
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 bg-forest px-3 text-[14px] font-semibold text-cream disabled:opacity-70">
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {full ? "Wait" : "Join"}
          </button>
        </div>
      </label>
      <datalist id="social-members">
        {members
          .filter((m) => !m.expired)
          .map((m) => (
            <option key={m.code} value={`${m.code} · ${m.name}`}>
              {m.plan}
            </option>
          ))}
      </datalist>
      <p role="status" aria-live="polite" className={`min-h-5 text-[13.5px] font-medium ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
        {state.error ?? state.ok}
      </p>
    </form>
  );
}
