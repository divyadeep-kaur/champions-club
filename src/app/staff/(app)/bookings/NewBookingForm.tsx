"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2, X } from "lucide-react";
import { inr } from "@/lib/constants";
import { courtPrice } from "@/lib/pricing";
import { createBooking, type BookingState } from "./actions";

export type MemberOption = { code: string; name: string; plan: string; courtRate: number; shopDiscount: number; barDiscount: number; expired: boolean; today: number };

const input = "mt-1 w-full border border-line bg-cream/40 px-3 py-2.5 text-[15px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "text-[13px] font-semibold text-muted";

export function NewBookingForm({
  court,
  date,
  time,
  timeLabel,
  members,
  defaultMember,
  socialAllowed,
  closeHref,
}: {
  court: { id: number; name: string; walkInRate: number };
  date: string;
  time: string;
  timeLabel: string;
  members: MemberOption[];
  defaultMember?: string;
  socialAllowed: boolean;
  closeHref: string;
}) {
  const [state, action, pending] = useActionState<BookingState, FormData>(createBooking, {});
  const [who, setWho] = useState<"member" | "walkin">(defaultMember ? "member" : "member");
  const [type, setType] = useState<"regular" | "trial" | "social">("regular");
  const [memberRef, setMemberRef] = useState(defaultMember ?? "");

  const code = memberRef.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  const member = members.find((m) => m.code === code);
  const price = type !== "regular" ? 0 : who === "member" ? (member ? courtPrice(member, court.walkInRate) : null) : court.walkInRate;

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">New booking</p>
          <h2 className="mt-1 font-serif text-[24px] font-medium leading-tight text-forest">{court.name}</h2>
          <p className="text-[15px] text-ink">{timeLabel}</p>
        </div>
        <Link href={closeHref} scroll={false} aria-label="Close" className="grid size-8 place-items-center text-muted hover:bg-cream">
          <X className="size-4" />
        </Link>
      </div>

      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <input type="hidden" name="courtId" value={court.id} />
      <input type="hidden" name="who" value={who} />
      <input type="hidden" name="type" value={type} />

      <div role="radiogroup" aria-label="Booking type" className="grid grid-cols-3 border border-line text-[14px] font-semibold">
        {(["regular", "trial", ...(socialAllowed ? (["social"] as const) : [])] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`px-2 py-2 capitalize ${type === t ? "bg-forest text-cream" : "text-ink hover:bg-cream"}`}
          >
            {t === "regular" ? "Court" : t === "social" ? "Social" : "Trial"}
          </button>
        ))}
      </div>

      {type === "social" ? (
        <label className="block">
          <span className={lbl}>Places on the court</span>
          <input name="capacity" type="number" min={2} max={16} defaultValue={8} className={input} />
          <span className="mt-1 block text-[13px] text-muted">Players join one by one. Extra people go on a waitlist.</span>
        </label>
      ) : (
        <>
          <div role="radiogroup" aria-label="Who is playing" className="flex gap-5 text-[15px]">
            {(["member", "walkin"] as const).map((w) => (
              <label key={w} className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={who === w} onChange={() => setWho(w)} className="accent-[#123828]" />
                {w === "member" ? "Member" : "Walk-in"}
              </label>
            ))}
          </div>

          {who === "member" ? (
            <label className="block">
              <span className={lbl}>Member</span>
              <input
                name="member"
                list="member-options"
                value={memberRef}
                onChange={(e) => setMemberRef(e.target.value)}
                placeholder="Type a name or CC- code"
                autoComplete="off"
                className={input}
              />
              <datalist id="member-options">
                {members.map((m) => (
                  <option key={m.code} value={`${m.code} · ${m.name}`}>
                    {m.plan}
                    {m.expired ? " · expired" : ""}
                  </option>
                ))}
              </datalist>
              {member && (
                <span className={`mt-1.5 block text-[13.5px] ${member.expired || member.today >= 2 ? "font-semibold text-clay" : "text-muted"}`}>
                  {member.plan} plan
                  {member.expired ? " · membership expired" : ` · ${member.today} of 2 bookings today`}
                </span>
              )}
            </label>
          ) : (
            <div className="grid gap-3">
              <label className="block">
                <span className={lbl}>Name</span>
                <input name="guestName" autoComplete="off" className={input} />
              </label>
              <label className="block">
                <span className={lbl}>Mobile (optional)</span>
                <input name="guestPhone" inputMode="tel" className={input} />
              </label>
            </div>
          )}
        </>
      )}

      {type === "regular" && (
        <label className="block">
          <span className={lbl}>Payment</span>
          <select name="method" defaultValue="upi" className={input}>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="later">Pay later</option>
          </select>
        </label>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <div>
          <p className="text-[13px] text-muted">Price</p>
          <p className="font-serif text-[26px] font-semibold leading-none text-forest">
            {price === null ? "—" : price === 0 ? "Free" : inr(price)}
          </p>
          {type === "regular" && who === "member" && member && member.courtRate < court.walkInRate && (
            <p className="mt-1 text-[12.5px] text-[#4d7a12]">saves {inr(court.walkInRate - member.courtRate)} on walk-in</p>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-forest px-5 py-3 text-[15px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {type === "social" ? "Open social play" : "Confirm booking"}
        </button>
      </div>

      <p role="alert" aria-live="polite" className="min-h-5 text-[14px] font-medium text-clay">
        {state.error}
      </p>
    </form>
  );
}
