"use client";

import { useActionState } from "react";
import { CHANGE_POLICIES } from "@/lib/membership";
import { setChangePolicy, type ActionState } from "../membershipActions";

export function PolicyForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setChangePolicy, {});
  return (
    <form action={action} className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[14px] font-semibold">Default for mid-cycle plan changes</legend>
        {CHANGE_POLICIES.map((p) => (
          <label key={p.key} className="flex items-start gap-2.5 text-[14.5px]">
            <input type="radio" name="policy" value={p.key} defaultChecked={current === p.key} className="mt-1" />
            <span>
              <strong>{p.label}</strong>
              <span className="block text-[13px] text-muted">{p.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 border-[1.5px] border-forest px-4 text-[14px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-70"
        >
          Save default
        </button>
        <p role="status" aria-live="polite" className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
          {state.error ?? state.ok}
        </p>
      </div>
    </form>
  );
}
