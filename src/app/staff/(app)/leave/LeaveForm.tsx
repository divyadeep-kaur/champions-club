"use client";

import { useActionState, useEffect, useRef } from "react";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { requestLeave, type LeaveState } from "./actions";

export function LeaveForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(requestLeave, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state.at]);
  return (
    <form ref={ref} action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">Ask for leave</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          From
          <input name="from" type="date" min={today} defaultValue={today} className={fieldCls} />
        </label>
        <label className={labelCls}>
          To
          <input name="to" type="date" min={today} defaultValue={today} className={fieldCls} />
        </label>
      </div>
      <label className={labelCls}>
        Reason
        <input name="reason" placeholder="e.g. Family function" className={fieldCls} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          Send request
        </button>
        {(state.error || state.ok) && <p className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>{state.error ?? state.ok}</p>}
      </div>
    </form>
  );
}
