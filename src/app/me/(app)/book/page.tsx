import Link from "next/link";
import { db } from "@/lib/db";
import { inr, MAX_BOOKINGS_PER_DAY } from "@/lib/constants";
import { addDays, fmtTime, hhmm, isoDate, parseIsoDate, startOfDay } from "@/lib/dates";
import { overlaps, sessionEnd, slotStarts } from "@/lib/bookings";
import { memberDayCount } from "@/lib/bookingService";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { courtPrice } from "@/lib/pricing";
import { ConfirmBooking } from "./ConfirmBooking";

export const dynamic = "force-dynamic";

export default async function MemberBook({ searchParams }: { searchParams: Promise<{ date?: string; court?: string; time?: string; sport?: string }> }) {
  const member = await requireMember();
  const sp = await searchParams;
  const today = startOfDay();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  let day = parseIsoDate(sp.date);
  if (day < today || day > days[6]) day = today;
  const date = isoDate(day);
  const sport = sp.sport === "cricket" ? "cricket" : "tennis";
  const now = new Date();

  const [courts, bookings, usedToday] = await Promise.all([
    db.court.findMany({ where: { sport }, orderBy: { name: "asc" } }),
    db.booking.findMany({ where: { status: "booked", start: { gte: day, lt: addDays(day, 1) } }, select: { courtId: true, start: true, end: true, memberId: true } }),
    memberDayCount(db, member.id, day),
  ]);

  const mine = bookings.filter((b) => b.memberId === member.id);
  const expired = membershipStatus(member.endDate).status === "expired";
  const limitHit = usedToday >= MAX_BOOKINGS_PER_DAY;
  const slots = slotStarts(day).filter((s) => sessionEnd(s) > now && s > now);
  const selectedCourt = courts.find((c) => c.id === Number(sp.court));
  const q = (extra: Record<string, string>) => `/me/book?${new URLSearchParams({ date, sport, ...extra })}`;

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] text-forest">Book a court</h1>

      <div className="grid grid-cols-2 border border-line text-[15px] font-semibold">
        {(["tennis", "cricket"] as const).map((s) => (
          <Link key={s} href={`/me/book?${new URLSearchParams({ date, sport: s })}`} className={`py-2.5 text-center capitalize ${sport === s ? "bg-forest text-cream" : "bg-paper text-ink"}`}>
            {s === "tennis" ? "Tennis" : "Cricket nets"}
          </Link>
        ))}
      </div>

      <nav aria-label="Choose a day" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d) => {
          const active = isoDate(d) === date;
          return (
            <Link
              key={d.toISOString()}
              href={`/me/book?${new URLSearchParams({ date: isoDate(d), sport })}`}
              aria-current={active ? "date" : undefined}
              className={`flex min-w-[58px] flex-col items-center border px-2 py-2 ${active ? "border-forest bg-forest text-cream" : "border-line bg-paper text-ink"}`}
            >
              <span className="text-[11.5px] font-semibold uppercase tracking-wide opacity-80">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className="font-serif text-[20px] font-semibold leading-tight">{d.getDate()}</span>
            </Link>
          );
        })}
      </nav>

      {expired ? (
        <p className="border border-clay/40 bg-clay-soft px-4 py-3 text-[14.5px] text-[#7c2f12]">Your membership has expired. Renew at the front desk to book courts.</p>
      ) : limitHit ? (
        <p className="border border-line bg-paper px-4 py-3 text-[14.5px] text-muted">You already have {MAX_BOOKINGS_PER_DAY} bookings on this day, the most a member can play. Pick another day.</p>
      ) : (
        <p className="text-[14px] text-muted">
          1-hour sessions · {member.plan.courtRate === 0 ? "included in your plan" : `${inr(member.plan.courtRate)} with your ${member.plan.name} plan`} · pay at the desk · {usedToday} of {MAX_BOOKINGS_PER_DAY} used this day
        </p>
      )}

      <div className="space-y-4">
        {courts.map((c) => {
          const free = slots.filter((s) => {
            const span = { start: s, end: sessionEnd(s) };
            return !bookings.some((b) => b.courtId === c.id && overlaps(b, span)) && !mine.some((b) => overlaps(b, span));
          });
          return (
            <section key={c.id} className="border border-line bg-paper p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{c.name}</h2>
                <span className="text-[13px] text-muted">{free.length ? `${free.length} times free` : "Fully booked"}</span>
              </div>
              {free.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {free.map((s) => {
                    const active = selectedCourt?.id === c.id && sp.time === hhmm(s);
                    const disabled = expired || limitHit;
                    return (
                      <li key={s.toISOString()}>
                        {disabled ? (
                          <span className="inline-block border border-line px-2.5 py-1.5 text-[14px] tabular-nums text-muted/60">{fmtTime(s)}</span>
                        ) : (
                          <Link
                            href={q({ court: String(c.id), time: hhmm(s) })}
                            scroll={false}
                            className={`inline-block border px-2.5 py-1.5 text-[14px] font-medium tabular-nums ${active ? "border-forest bg-forest text-cream" : "border-line text-ink hover:border-forest"}`}
                          >
                            {fmtTime(s)}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {selectedCourt && sp.time && !expired && !limitHit && (
        <ConfirmBooking
          key={`${selectedCourt.id}-${sp.time}-${date}`}
          courtId={selectedCourt.id}
          courtName={selectedCourt.name}
          date={date}
          time={sp.time}
          label={`${day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} · ${fmtTime(new Date(`${date}T${sp.time}:00`))}`}
          price={courtPrice(member.plan, selectedCourt.walkInRate)}
          walkIn={selectedCourt.walkInRate}
          closeHref={q({})}
        />
      )}
    </div>
  );
}
