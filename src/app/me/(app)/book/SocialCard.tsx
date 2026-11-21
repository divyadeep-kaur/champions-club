"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { memberAnswerOffer, memberJoinSocial, memberLeaveSocial, type MeState } from "../../actions";

type Props = {
  bookingId: number;
  court: string;
  when: string;
  playing: number;
  capacity: number;
  waiting: number;
  price: number;
  me: { id: number; status: string } | null;
  closed: boolean;
};

export function SocialCard(p: Props) {
  const [state, join, pending] = useActionState<MeState, FormData>(memberJoinSocial, {});
  const full = p.playing >= p.capacity;
  const pct = Math.min(100, (p.playing / p.capacity) * 100);

  return (
    <section className="grid gap-2.5 rounded-2xl border border-clay/40 bg-paper p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-bold uppercase tracking-[0.1em] text-clay">Friday social play</p>
          <h2 className="text-[16px] font-bold">
            {p.court} · {p.when}
          </h2>
        </div>
        <span className="text-right text-[13.5px] text-muted">
          <strong className="block text-[16px] text-ink tabular-nums">
            {p.playing} of {p.capacity}
          </strong>
          {p.waiting ? `${p.waiting} waiting` : "players"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-[#ece5d6]"
        role="progressbar"
        aria-valuenow={p.playing}
        aria-valuemin={0}
        aria-valuemax={p.capacity}
        aria-label="Places filled"
      >
        <div className="h-full rounded-full bg-clay" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[13.5px] text-muted">
        Come alone, get matched on a shared court. {p.price ? `Your share is ₹${p.price}, paid at the desk.` : "Free on your plan."}
      </p>

      {p.me?.status === "offered" ? (
        <div className="grid gap-2">
          <p className="rounded-xl bg-[#e3efc7] p-2.5 text-[14px] text-[#2f4a0a]">A place opened up for you.</p>
          <div className="grid grid-cols-2 gap-2">
            {(["accept", "decline"] as const).map((a) => (
              <form key={a} action={memberAnswerOffer}>
                <input type="hidden" name="playerId" value={p.me!.id} />
                <input type="hidden" name="answer" value={a} />
                <button
                  type="submit"
                  className={`min-h-11 w-full rounded-full font-bold ${a === "accept" ? "bg-forest text-cream" : "border-[1.5px] border-line text-muted"}`}
                >
                  {a === "accept" ? "Take the place" : "No thanks"}
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : p.me ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14.5px] font-semibold text-[#4d7a12]">{p.me.status === "waitlist" ? "You’re on the waitlist" : "You’re playing"}</span>
          <form action={memberLeaveSocial}>
            <input type="hidden" name="playerId" value={p.me.id} />
            <button type="submit" className="min-h-10 rounded-full border-[1.5px] border-[#a8411f] px-3.5 text-[14px] font-bold text-[#a8411f]">
              {p.me.status === "waitlist" ? "Leave waitlist" : "Drop out"}
            </button>
          </form>
        </div>
      ) : !p.closed ? (
        <form action={join}>
          <input type="hidden" name="bookingId" value={p.bookingId} />
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-clay font-bold text-white disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {full ? "Join the waitlist" : "Join social play"}
          </button>
        </form>
      ) : null}
      {(state.ok || state.error) && (
        <p className={`rounded-xl p-2.5 text-[14px] ${state.error ? "bg-clay-soft text-[#7a2f14]" : "bg-[#e3efc7] text-[#2f4a0a]"}`}>
          {state.error ?? state.ok}
        </p>
      )}
    </section>
  );
}
