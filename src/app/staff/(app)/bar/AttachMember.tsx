"use client";

import { useActionState } from "react";
import { attachMember, type TabState } from "./actions";

export function AttachMember({ tabId }: { tabId: number }) {
  const [state, action, pending] = useActionState<TabState, FormData>(attachMember, {});
  return (
    <form action={action} className="grid gap-1.5">
      <input type="hidden" name="tabId" value={tabId} />
      <div className="flex gap-2">
        <input
          name="member"
          list="bar-members"
          placeholder="Member code or phone"
          aria-label="Member code or phone"
          autoComplete="off"
          className="min-h-10 min-w-0 flex-1 border border-[#b5aa98] bg-white px-3 text-[14.5px] outline-none focus:border-forest"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 border-[1.5px] border-forest px-3 text-[14px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-60"
        >
          Apply
        </button>
      </div>
      {(state.error || state.ok) && <p className={`text-[13.5px] ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>{state.error ?? state.ok}</p>}
    </form>
  );
}
