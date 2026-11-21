"use client";

import { useActionState, useState } from "react";
import { inr } from "@/lib/constants";
import { settlePayment, type ActionState } from "../membershipActions";

// Collects a membership payment that was left pending.
export function SettlePayment({ changeId, amount }: { changeId: number; amount: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(settlePayment, {});
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 border-[1.5px] border-clay px-3 text-[13.5px] font-semibold text-clay hover:bg-clay-soft"
      >
        Record payment of {inr(amount)}
      </button>
    );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="changeId" value={changeId} />
      <label className="sr-only" htmlFor={`m${changeId}`}>
        Paid by
      </label>
      <select id={`m${changeId}`} name="method" defaultValue="" required className="min-h-9 border border-[#b5aa98] bg-white px-2 text-[14px]">
        <option value="" disabled>
          Paid by…
        </option>
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="cash">Cash</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 bg-forest px-3 text-[13.5px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60"
      >
        Confirm {inr(amount)} received
      </button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-9 px-2 text-[13.5px] text-muted">
        Cancel
      </button>
      {state.error && <span className="text-[13px] font-semibold text-clay">{state.error}</span>}
    </form>
  );
}
