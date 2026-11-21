"use client";

import { useActionState } from "react";
import { ConfirmSubmit } from "@/components/staff/ConfirmSubmit";
import { updatePlan, type ActionState } from "../membershipActions";

type Plan = {
  id: number;
  name: string;
  monthlyFee: number;
  courtRate: number;
  shopDiscount: number;
  barDiscount: number;
  durationDays: number;
  description: string;
};

const input = "min-h-10 w-full border border-[#b5aa98] bg-white px-2.5 text-[14.5px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "grid gap-1 text-[12.5px] font-semibold text-muted";

export function PlanForm({ plan }: { plan: Plan }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updatePlan, {});
  return (
    <form key={state.at} action={action} className="grid gap-3 border-t border-line pt-4">
      <input type="hidden" name="planId" value={plan.id} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={lbl}>
          Price (₹)
          <input name="monthlyFee" type="number" min={0} defaultValue={plan.monthlyFee} className={input} />
        </label>
        <label className={lbl}>
          Duration (days)
          <input name="durationDays" type="number" min={1} max={366} defaultValue={plan.durationDays} className={input} />
        </label>
        <label className={lbl}>
          Court rate (₹/hr)
          <input name="courtRate" type="number" min={0} defaultValue={plan.courtRate} className={input} />
        </label>
        <label className={lbl}>
          Shop discount (%)
          <input name="shopDiscount" type="number" min={0} max={100} defaultValue={plan.shopDiscount} className={input} />
        </label>
        <label className={lbl}>
          Café & bar discount (%)
          <input name="barDiscount" type="number" min={0} max={100} defaultValue={plan.barDiscount} className={input} />
        </label>
      </div>
      <label className={lbl}>
        Description
        <input name="description" defaultValue={plan.description} maxLength={200} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <ConfirmSubmit
          pending={pending}
          confirmLabel={`Click again to update ${plan.name}`}
          className="inline-flex min-h-10 items-center gap-2 bg-forest px-4 text-[14px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          Save {plan.name}
        </ConfirmSubmit>
        <p role="status" aria-live="polite" className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
          {state.error ?? state.ok}
        </p>
      </div>
      <p className="text-[12.5px] text-muted">
        New prices apply to future renewals and changes. Current members keep their dates; past payments are not changed.
      </p>
    </form>
  );
}
