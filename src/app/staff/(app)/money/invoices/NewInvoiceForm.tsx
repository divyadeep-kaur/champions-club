"use client";

import { useActionState, useState } from "react";
import { inr } from "@/lib/constants";
import { invoiceTotals } from "@/lib/money";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { createInvoice, type MoneyState } from "../actions";

type Line = { d: string; q: string; p: string; g: string };
const blank: Line = { d: "", q: "1", p: "", g: "18" };

export function NewInvoiceForm() {
  const [state, action, pending] = useActionState<MoneyState, FormData>(createInvoice, {});
  const [lines, setLines] = useState<Line[]>([{ d: "Corporate membership, 30 days", q: "20", p: "2000", g: "18" }, { ...blank }, { ...blank }]);
  const set = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const t = invoiceTotals(lines.filter((l) => l.d.trim()).map((l) => ({ qty: Number(l.q) || 0, unitPrice: Number(l.p) || 0, gstRate: Number(l.g) || 0 })));

  return (
    <form action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">New invoice</h2>
      <label className={labelCls}>
        Bill to
        <input name="customerName" placeholder="e.g. Tech Park Pvt Ltd" className={fieldCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          GSTIN (optional)
          <input name="customerGstin" placeholder="03ABCDE1234F1Z5" className={`${fieldCls} uppercase`} />
        </label>
        <label className={labelCls}>
          Due in (days)
          <input name="dueDays" type="number" min={0} max={90} defaultValue={15} className={fieldCls} />
        </label>
      </div>
      <label className={labelCls}>
        Address (optional)
        <input name="customerAddress" className={fieldCls} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[14px] font-semibold">Lines (prices before GST)</legend>
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_60px_90px_70px] gap-2">
            <input
              name={`d${i}`}
              value={l.d}
              onChange={(e) => set(i, "d", e.target.value)}
              placeholder="Description"
              aria-label={`Line ${i + 1} description`}
              className={fieldCls}
            />
            <input
              name={`q${i}`}
              value={l.q}
              onChange={(e) => set(i, "q", e.target.value)}
              type="number"
              min={1}
              aria-label={`Line ${i + 1} quantity`}
              className={fieldCls}
            />
            <input
              name={`p${i}`}
              value={l.p}
              onChange={(e) => set(i, "p", e.target.value)}
              type="number"
              min={0}
              placeholder="₹"
              aria-label={`Line ${i + 1} unit price`}
              className={fieldCls}
            />
            <select name={`g${i}`} value={l.g} onChange={(e) => set(i, "g", e.target.value)} aria-label={`Line ${i + 1} GST rate`} className={fieldCls}>
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
        ))}
      </fieldset>
      <label className={labelCls}>
        Note (optional)
        <input name="notes" placeholder="e.g. Payment by bank transfer within 15 days" className={fieldCls} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[14.5px]">
          {inr(t.subtotal)} + GST {inr(t.gst)} = <strong className="text-[17px]">{inr(t.total)}</strong>
        </span>
        <button type="submit" disabled={pending} className={btnPrimary}>
          Create invoice
        </button>
      </div>
      {state.error && <p className="text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}
