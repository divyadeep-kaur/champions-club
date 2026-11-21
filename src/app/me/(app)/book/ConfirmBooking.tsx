"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, X } from "lucide-react";
import { inr } from "@/lib/constants";
import { memberBook, type MeState } from "../../actions";

export function ConfirmBooking(props: { courtId: number; courtName: string; date: string; time: string; label: string; price: number; walkIn: number; closeHref: string }) {
  const [state, action, pending] = useActionState<MeState, FormData>(memberBook, {});
  return (
    <div className="fixed inset-x-0 bottom-[64px] z-20 mx-auto max-w-[560px] px-3">
      <form action={action} className="border border-forest bg-paper p-4 shadow-[0_-12px_40px_-12px_rgba(11,42,29,0.4)]">
        <input type="hidden" name="courtId" value={props.courtId} />
        <input type="hidden" name="date" value={props.date} />
        <input type="hidden" name="time" value={props.time} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{props.courtName}</p>
            <p className="text-[14px] text-muted">{props.label} · 1 hour</p>
          </div>
          <Link href={props.closeHref} scroll={false} aria-label="Close" className="grid size-8 place-items-center text-muted">
            <X className="size-4" />
          </Link>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-serif text-[24px] font-semibold leading-none text-forest">{props.price === 0 ? "Included" : inr(props.price)}</p>
            {props.price < props.walkIn && <p className="mt-1 text-[12.5px] text-[#4d7a12]">you save {inr(props.walkIn - props.price)}</p>}
          </div>
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 bg-forest px-5 py-3 text-[15.5px] font-semibold text-cream disabled:opacity-70">
            {pending && <Loader2 className="size-4 animate-spin" />}
            Confirm
          </button>
        </div>
        {state.error && (
          <p role="alert" className="mt-2 text-[14px] font-medium text-clay">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
