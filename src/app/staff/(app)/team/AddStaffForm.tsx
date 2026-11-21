"use client";

import { useActionState, useEffect, useRef } from "react";
import { btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";
import { DEPARTMENTS } from "@/lib/payroll";
import { addStaff, type TeamState } from "./actions";

const ACCESS = [
  { key: "staff", label: "Support staff (pay, queries, leave)" },
  { key: "coach", label: "Coach (pay, queries, leave)" },
  { key: "desk", label: "Reception (views members, bookings, leads)" },
  { key: "shop", label: "Pro shop" },
  { key: "bar", label: "Café & bar" },
];

export function AddStaffForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<TeamState, FormData>(addStaff, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok, state.at]);

  return (
    <form ref={ref} action={action} className="grid gap-3 border border-line bg-paper p-5">
      <h2 className="text-[18px] font-semibold">Add a staff member</h2>
      <p className="-mt-1 text-[13.5px] text-muted">They get the next staff ID and a one-time password to sign in.</p>
      <label className={labelCls}>
        Full name
        <input name="name" required className={fieldCls} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelCls}>
          Job title
          <input name="jobTitle" required placeholder="e.g. Sweeper" className={fieldCls} />
        </label>
        <label className={labelCls}>
          Department
          <select name="department" className={fieldCls} defaultValue="housekeeping">
            {DEPARTMENTS.filter((d) => d.key !== "management").map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Mobile
          <input name="phone" inputMode="numeric" maxLength={10} required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Email (sign in)
          <input name="email" type="email" required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Monthly gross salary (₹)
          <input name="salary" type="number" min={0} step={500} required className={fieldCls} />
        </label>
        <label className={labelCls}>
          Joining date
          <input name="joinedAt" type="date" defaultValue={today} className={fieldCls} />
        </label>
      </div>
      <label className={labelCls}>
        App access
        <select name="role" className={fieldCls}>
          {ACCESS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={btnPrimary}>
        Add staff member
      </button>
      {(state.error || state.ok) && (
        <p role="status" className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}
