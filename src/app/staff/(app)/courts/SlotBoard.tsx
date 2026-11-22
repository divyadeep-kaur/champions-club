"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Ban, Check, Lock, Unlock } from "lucide-react";
import { ConfirmSubmit } from "@/components/staff/ConfirmSubmit";
import { blockSlots, cancelSlotBooking, unblockDay, unblockSlot, type CourtState } from "./actions";

export type BoardSlot = {
  time: string; // "HH:MM", the form value
  label: string; // "6:30 am"
  kind: "free" | "past" | "booked" | "blocked";
  bookingId?: number;
  who?: string;
  sub?: string;
  first?: boolean; // first half hour of this booking or block
  upcoming?: boolean;
  href?: string;
};

export function SlotBoard({ courtId, courtName, date, slots }: { courtId: number; courtName: string; date: string; slots: BoardSlot[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState<CourtState, FormData>(blockSlots, {});
  const free = slots.filter((s) => s.kind === "free").map((s) => s.time);
  const blockedCount = slots.filter((s) => s.kind === "blocked").length;

  useEffect(() => {
    if (state.ok) setSelected(new Set());
  }, [state.at, state.ok]);

  const toggle = (t: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const tile = "relative flex min-h-[86px] flex-col justify-between gap-1 border p-2.5 text-left text-[13px] leading-snug";

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3 border border-line bg-paper p-4">
        <input type="hidden" name="courtId" value={courtId} />
        <input type="hidden" name="date" value={date} />
        {[...selected].map((t) => (
          <input key={t} type="hidden" name="slot" value={t} />
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[14px] font-semibold">
            {selected.size} slot{selected.size === 1 ? "" : "s"} selected
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set(free))}
            disabled={free.length === 0}
            className="min-h-9 border border-forest/40 px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-50"
          >
            Select all free ({free.length})
          </button>
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="min-h-9 px-3 text-[13.5px] font-semibold text-muted hover:text-ink">
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[220px] flex-1 gap-1 text-[12.5px] font-semibold text-muted">
            Reason (shown on the bookings grid)
            <input
              name="reason"
              maxLength={60}
              placeholder="Maintenance, coaching, tournament…"
              className="min-h-10 w-full border border-[#b5aa98] bg-white px-2.5 text-[14.5px] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            />
          </label>
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="inline-flex min-h-10 items-center gap-2 bg-forest px-4 text-[14px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60"
          >
            <Lock className="size-4" /> Block selected
          </button>
        </div>
        {(state.error || state.ok) && (
          <p role="status" aria-live="polite" className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
            {state.error ?? state.ok}
          </p>
        )}
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map((s) => {
          if (s.kind === "free") {
            const on = selected.has(s.time);
            return (
              <button
                key={s.time}
                type="button"
                onClick={() => toggle(s.time)}
                aria-pressed={on}
                aria-label={`${s.label} free${on ? ", selected" : ""}`}
                className={`${tile} ${on ? "border-forest bg-ball/45" : "border-line bg-paper hover:border-forest/50 hover:bg-ball/15"}`}
              >
                <span className="flex items-center justify-between font-semibold text-ink">
                  {s.label}
                  <span className={`grid size-5 place-items-center border ${on ? "border-forest bg-forest text-cream" : "border-[#b5aa98] bg-white"}`}>
                    {on && <Check className="size-3.5" />}
                  </span>
                </span>
                <span className="font-semibold text-[#4d7a12]">Free</span>
              </button>
            );
          }
          if (s.kind === "past") {
            return (
              <div key={s.time} className={`${tile} border-line bg-[#f1ece2] text-muted`}>
                <span className="font-semibold">{s.label}</span>
                <span>Past</span>
              </div>
            );
          }
          if (s.kind === "blocked") {
            return (
              <div
                key={s.time}
                className={`${tile} border-[#b5aa98] text-ink`}
                style={{ backgroundImage: "repeating-linear-gradient(135deg, #ebe5d8 0 8px, #f4efe5 8px 16px)" }}
              >
                <span className="flex items-center justify-between font-semibold">
                  {s.label} <Ban className="size-4 text-muted" />
                </span>
                <span className="truncate text-muted" title={s.who}>
                  {s.who}
                </span>
                <form action={unblockSlot}>
                  <input type="hidden" name="bookingId" value={s.bookingId} />
                  <button type="submit" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-forest underline underline-offset-2">
                    <Unlock className="size-3.5" /> Unblock
                  </button>
                </form>
              </div>
            );
          }
          return (
            <div key={s.time} className={`${tile} border-forest bg-forest text-cream`}>
              <span className="font-semibold">{s.label}</span>
              <Link href={s.href ?? "#"} className="truncate font-semibold hover:underline" title={s.who}>
                {s.first ? s.who : `↳ ${s.who}`}
              </Link>
              <span className="truncate text-[12px] opacity-80">{s.sub}</span>
              {s.first && s.upcoming && (
                <form action={cancelSlotBooking}>
                  <input type="hidden" name="bookingId" value={s.bookingId} />
                  <ConfirmSubmit confirmLabel="Click again: cancel & refund" className="text-[12.5px] font-semibold text-ball underline underline-offset-2">
                    Cancel booking
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {blockedCount > 0 && (
        <form action={unblockDay} className="flex flex-wrap items-center gap-3 text-[13.5px] text-muted">
          <input type="hidden" name="courtId" value={courtId} />
          <input type="hidden" name="date" value={date} />
          <ConfirmSubmit
            confirmLabel="Click again to unblock all"
            className="inline-flex min-h-9 items-center gap-1.5 border border-forest/40 px-3 font-semibold text-forest hover:bg-forest/5"
          >
            <Unlock className="size-4" /> Unblock all {blockedCount} on {courtName}
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
