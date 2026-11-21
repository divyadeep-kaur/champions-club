"use client";

import { useActionState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { approveTrial, declineTrial, type LeadState } from "../actions";

export function TrialDecisionCard({ leadId, canApprove }: { leadId: number; canApprove: boolean }) {
  const [approveState, approve, approving] = useActionState<LeadState, FormData>(approveTrial, {});
  const [declineState, decline, declining] = useActionState<LeadState, FormData>(declineTrial, {});
  const state = declineState.error || declineState.ok ? declineState : approveState;

  return (
    <section className="border border-[#e8c98f] bg-[#fbf1df] p-4">
      <h2 className="text-[17px] font-semibold text-[#7a4b0c]">Free trial request waiting for approval</h2>
      <p className="mt-1 text-[14.5px] text-[#5c4a2c]">
        {canApprove ? "A court is held for them. Approve it, or decline and the court is freed." : "No court is held yet. Book a slot on the right and that approves it, or decline it here."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {canApprove && (
          <form action={approve}>
            <input type="hidden" name="leadId" value={leadId} />
            <button type="submit" disabled={approving} className="inline-flex min-h-11 items-center gap-2 bg-forest px-4 py-2.5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-70">
              {approving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve trial
            </button>
          </form>
        )}
        <form action={decline} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <input name="reason" placeholder="Reason (optional)" aria-label="Reason for declining" className="min-h-11 border border-[#b5aa98] bg-white px-3 text-[15px] outline-none focus:border-forest" />
          <button type="submit" disabled={declining} className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-clay/60 bg-white px-4 py-2.5 font-semibold text-clay hover:bg-clay-soft disabled:opacity-70">
            {declining ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Decline
          </button>
        </form>
      </div>
      <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-[13.5px] font-medium ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
        {state.error ?? state.ok}
      </p>
    </section>
  );
}
