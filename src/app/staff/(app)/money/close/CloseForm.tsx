"use client";

import { useActionState, useState } from "react";
import { inr } from "@/lib/constants";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { closeDay, type CloseState } from "./actions";

export function CloseForm({ day, expected }: { day: string; expected: number }) {
  const [state, action, pending] = useActionState<CloseState, FormData>(closeDay, {});
  const [counted, setCounted] = useState("");
  const diff = counted === "" ? null : Math.round(Number(counted) || 0) - expected;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="day" value={day} />
      <label className={labelCls}>
        Cash counted in the drawer (₹)
        <input name="counted" type="number" min={0} inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value)} className={fieldCls} />
      </label>
      {diff !== null && (
        <p className={`text-[14px] font-semibold ${diff === 0 ? "text-[#4d7a12]" : "text-clay"}`}>
          {diff === 0 ? "Matches the expected cash." : `${diff > 0 ? "Surplus" : "Short"} by ${inr(Math.abs(diff))}. Add a note below.`}
        </p>
      )}
      <label className={labelCls}>
        Note {diff ? "(required)" : "(optional)"}
        <input name="note" maxLength={300} placeholder="e.g. ₹50 float left for tomorrow" className={fieldCls} />
      </label>
      <button type="submit" disabled={pending || counted === ""} className={`${btnPrimary} w-fit disabled:opacity-50`}>
        Close the day
      </button>
      {(state.error || state.ok) && (
        <p role="status" className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}
