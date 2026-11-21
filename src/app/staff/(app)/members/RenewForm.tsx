"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { renewMember, type FormState } from "./actions";

type Plan = { id: number; name: string; monthlyFee: number; durationDays: number };

const select = "min-h-11 w-full border border-[#b5aa98] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

export function RenewForm({ memberId, currentPlanId, plans }: { memberId: number; currentPlanId: number; plans: Plan[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(renewMember, {});

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="memberId" value={memberId} />
      <div className="contents">
        <label className="block">
          <span className="text-[14px] font-semibold">Plan</span>
          <select name="planId" defaultValue={currentPlanId} className={`mt-1 ${select}`}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {inr(p.monthlyFee)} / {p.durationDays} days
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[14px] font-semibold">Paid by</span>
          <select name="method" defaultValue="upi" className={`mt-1 ${select}`}>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-[14px] font-medium text-clay">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-2 bg-forest px-[18px] py-3 font-bold text-cream hover:bg-forest-deep disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Renew for 30 days
      </button>
    </form>
  );
}
