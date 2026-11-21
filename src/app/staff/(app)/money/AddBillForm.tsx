"use client";

import { useActionState, useEffect, useRef } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/money";
import { fieldCls, labelCls, btnPrimary } from "@/components/staff/ui";
import { addExpense, type MoneyState } from "./actions";

export function AddBillForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<MoneyState, FormData>(addExpense, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state.at]);

  return (
    <form ref={ref} action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">Add a bill</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Type
          <select name="category" defaultValue="stock" className={fieldCls}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Amount (₹)
          <input name="amount" type="number" min={1} inputMode="numeric" className={fieldCls} />
        </label>
        <label className={`${labelCls} sm:col-span-2`}>
          What for
          <input name="description" placeholder="e.g. Tennis balls, 20 cartons" className={fieldCls} />
        </label>
        <label className={labelCls}>
          Supplier (optional)
          <input name="vendor" className={fieldCls} />
        </label>
        <label className={labelCls}>
          Due date
          <input name="dueDate" type="date" defaultValue={today} className={fieldCls} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[14.5px]">
        <input type="checkbox" name="paidNow" className="size-4 accent-[#123828]" /> Already paid
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          Add bill
        </button>
        {(state.error || state.ok) && <p className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>{state.error ?? state.ok}</p>}
      </div>
    </form>
  );
}
