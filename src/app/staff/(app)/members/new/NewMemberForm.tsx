"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { inr } from "@/lib/constants";
import { createMember, type FormState } from "../actions";
import { VisitPreview, type Visit } from "./VisitPreview";

type Plan = { id: number; name: string; monthlyFee: number; courtRate: number; shopDiscount: number; barDiscount: number; durationDays: number; description: string };

const input =
  "mt-1.5 w-full border border-[#b5aa98] bg-white px-3.5 py-2.5 text-[15.5px] text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15";
const label = "text-[14px] font-semibold text-ink";

export function NewMemberForm({ plans, visit, defaults }: { plans: Plan[]; visit: Visit; defaults?: Record<string, string> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createMember, {});
  const f = state.fields ?? defaults ?? {};
  const [planId, setPlanId] = useState<number>(Number(f.planId) || plans.find((p) => p.name === "Silver")?.id || plans[0]?.id);
  const selected = plans.find((p) => p.id === planId);

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="leadId" value={f.leadId ?? ""} />
      <fieldset>
        <legend className="font-serif text-[22px] font-medium text-forest">Plan</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {plans.map((p) => {
            const active = p.id === planId;
            return (
              <label
                key={p.id}
                className={`relative cursor-pointer border p-4 transition-colors ${active ? "border-forest bg-paper ring-2 ring-forest/15" : "border-line bg-paper/60 hover:border-forest/50"}`}
              >
                <input type="radio" name="planId" value={p.id} checked={active} onChange={() => setPlanId(p.id)} className="sr-only" />
                {active && (
                  <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-forest text-cream">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
                <p className="font-serif text-[22px] font-semibold text-forest">{p.name}</p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                  {inr(p.monthlyFee)} <span className="font-normal text-muted">/ {p.durationDays} days</span>
                </p>
                <ul className="mt-3 space-y-1 text-[13.5px] text-muted">
                  <li>Courts: {p.courtRate === 0 ? "included" : `${inr(p.courtRate)}/hr`}</li>
                  <li>Shop: {p.shopDiscount}% off</li>
                  <li>Café & bar: {p.barDiscount ? `${p.barDiscount}% off` : "no discount"}</li>
                </ul>
              </label>
            );
          })}
        </div>
        <div className="mt-4">
          <VisitPreview plans={plans} visit={visit} selectedId={planId} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-1 font-serif text-[22px] font-medium text-forest">Details</legend>
        <label className="block sm:col-span-2">
          <span className={label}>Full name</span>
          <input name="name" defaultValue={f.name} autoComplete="off" required className={input} />
        </label>
        <label className="block">
          <span className={label}>Mobile number</span>
          <input name="phone" defaultValue={f.phone} inputMode="tel" placeholder="98765 43210" required className={input} />
        </label>
        <label className="block">
          <span className={label}>
            Email <span className="font-normal text-muted">(optional)</span>
          </span>
          <input name="email" type="email" defaultValue={f.email} className={input} />
        </label>
        <label className="block">
          <span className={label}>
            Date of birth {selected?.name === "Junior" ? <span className="font-normal text-clay">(needed for Junior)</span> : <span className="font-normal text-muted">(optional)</span>}
          </span>
          <input name="birthDate" type="date" defaultValue={f.birthDate} max={new Date().toISOString().slice(0, 10)} className={input} />
        </label>
        <label className="block">
          <span className={label}>Paid by</span>
          <select name="method" defaultValue={f.method ?? "upi"} className={input}>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>
            Notes <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea name="notes" defaultValue={f.notes} rows={2} className={input} />
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-forest px-6 py-3 text-[16px] font-semibold text-cream transition-colors hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign up{selected ? ` · collect ${inr(selected.monthlyFee)}` : ""}
        </button>
        <p role="alert" aria-live="polite" className="text-[14.5px] font-medium text-clay">
          {state.error}
        </p>
      </div>
    </form>
  );
}
