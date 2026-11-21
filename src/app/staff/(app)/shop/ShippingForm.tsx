"use client";

import { useActionState } from "react";
import { setShipping, type InventoryState } from "./actions";

const input = "min-h-10 w-[110px] border border-[#b5aa98] bg-white px-2.5 text-right text-[14.5px] tabular-nums outline-none focus:border-forest";

export function ShippingForm({ fee, freeOver }: { fee: number; freeOver: number }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(setShipping, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border border-line bg-paper p-4">
      <p className="w-full text-[15px] font-semibold">Home delivery charges</p>
      <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
        Shipping (₹)
        <input name="fee" type="number" min={0} defaultValue={fee} className={input} />
      </label>
      <label className="grid gap-1 text-[12.5px] font-semibold text-muted">
        Free on orders from (₹, 0 = never)
        <input name="freeOver" type="number" min={0} defaultValue={freeOver} className={input} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 border-[1.5px] border-forest px-4 text-[14px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-60"
      >
        Save
      </button>
      <p role="status" aria-live="polite" className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
        {state.error ?? state.ok}
      </p>
      <p className="w-full text-[12.5px] text-muted">Delivery inside the club is always free. New charges apply to orders placed from now on.</p>
    </form>
  );
}
