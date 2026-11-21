"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { MONEY_TOPICS, QUERY_TOPICS } from "@/lib/payroll";
import { askQuery, type QueryState } from "./actions";

export function QueryForm({ maxAdvance }: { maxAdvance: number }) {
  const [state, action, pending] = useActionState<QueryState, FormData>(askQuery, {});
  const [topic, setTopic] = useState("pay");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setTopic("pay");
    }
  }, [state.ok, state.at]);
  const money = MONEY_TOPICS.includes(topic);

  return (
    <form ref={ref} action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">Ask the owner</h2>
      <label className={labelCls}>
        About
        <select name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={fieldCls}>
          {QUERY_TOPICS.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        Subject
        <input name="subject" maxLength={80} placeholder="e.g. Overtime missing on payslip" className={fieldCls} />
      </label>
      {money && (
        <label className={labelCls}>
          Amount (₹)
          <input name="amount" type="number" min={1} inputMode="numeric" className={fieldCls} />
          {topic === "advance" && <span className="text-[13px] font-normal text-muted">Up to ₹{maxAdvance.toLocaleString("en-IN")}. It comes off your next salary.</span>}
          {topic === "claim" && <span className="text-[13px] font-normal text-muted">Hand the bill to the front desk. Approved claims are paid with the bills.</span>}
        </label>
      )}
      <label className={labelCls}>
        Message
        <textarea name="message" rows={4} maxLength={600} className={fieldCls} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          Send query
        </button>
        {(state.error || state.ok) && (
          <p role="status" className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
            {state.error ?? state.ok}
          </p>
        )}
      </div>
    </form>
  );
}
