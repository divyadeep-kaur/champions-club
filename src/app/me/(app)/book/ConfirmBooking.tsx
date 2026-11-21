"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, X } from "lucide-react";
import { inr } from "@/lib/constants";
import { memberBook, type MeState } from "../../actions";

export function ConfirmBooking(props: {
  courtId: number;
  courtName: string;
  date: string;
  time: string;
  label: string;
  plan: string;
  price: number;
  walkIn: number;
  closeHref: string;
}) {
  const [state, action, pending] = useActionState<MeState, FormData>(memberBook, {});
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-20 mx-auto max-w-[560px] px-3 lg:bottom-6 lg:max-w-[680px]">
      <form action={action} className="grid gap-2.5 rounded-[20px] bg-forest-deep/[0.88] p-4 text-white backdrop-blur-xl">
        <input type="hidden" name="courtId" value={props.courtId} />
        <input type="hidden" name="date" value={props.date} />
        <input type="hidden" name="time" value={props.time} />
        <div className="flex items-start justify-between gap-2">
          <strong>{props.courtName}</strong>
          <span className="flex items-center gap-2">
            {props.label}
            <Link href={props.closeHref} scroll={false} aria-label="Close" className="grid size-7 place-items-center rounded-full bg-white/15">
              <X className="size-3.5" />
            </Link>
          </span>
        </div>
        <div className="text-[14px] opacity-90">
          1 hour · {props.price === 0 ? `included in ${props.plan}` : `${props.plan} rate ${inr(props.price)}`} (walk-in {inr(props.walkIn)}) · pay at the desk
        </div>
        {state.error && (
          <p role="alert" className="rounded-[10px] bg-clay-soft p-2.5 text-[14px] text-[#7a2f14]">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-ball p-[13px] font-extrabold text-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Confirm booking
        </button>
      </form>
    </div>
  );
}
