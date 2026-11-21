"use client";

import { useActionState } from "react";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { DEPARTMENTS } from "@/lib/payroll";
import { updateStaff, type TeamState } from "../actions";

type Props = { id: number; jobTitle: string; department: string; phone: string | null; salary: number };

export function EditStaffForm(p: Props) {
  const [state, action, pending] = useActionState<TeamState, FormData>(updateStaff, {});
  return (
    <form action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">Job and salary</h2>
      <input type="hidden" name="staffId" value={p.id} />
      <label className={labelCls}>
        Job title
        <input name="jobTitle" defaultValue={p.jobTitle} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Department
        <select name="department" defaultValue={p.department} className={fieldCls}>
          {DEPARTMENTS.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelCls}>
        Mobile
        <input name="phone" defaultValue={p.phone ?? ""} inputMode="numeric" maxLength={10} className={fieldCls} />
      </label>
      <label className={labelCls}>
        Monthly gross salary (₹)
        <input name="salary" type="number" min={0} step={500} defaultValue={p.salary} className={fieldCls} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          Save
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
