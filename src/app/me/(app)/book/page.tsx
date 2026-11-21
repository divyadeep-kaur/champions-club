import Link from "next/link";
import { db } from "@/lib/db";
import { inr, MAX_BOOKINGS_PER_DAY } from "@/lib/constants";
import { addDays, fmtTime, hhmm, isoDate, parseIsoDate, startOfDay } from "@/lib/dates";
import { overlaps, sessionEnd, slotStarts } from "@/lib/bookings";
import { memberDayCount } from "@/lib/bookingService";
import { benefitPlan } from "@/lib/membership";
import { requireMember } from "@/lib/memberSession";
import { courtPrice } from "@/lib/pricing";
import { ConfirmBooking } from "./ConfirmBooking";
import { SocialCard } from "./SocialCard";
import { socialShare } from "@/lib/socialService";

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

  const [socials, courts, bookings, usedToday] = await Promise.all([
    db.booking.findMany({
      where: { type: "social", status: "booked", start: { gte: day, lt: addDays(day, 1) }, end: { gt: now } },
      include: { court: true, players: true },
      orderBy: { start: "asc" },
    }),
    db.court.findMany({ where: { sport }, orderBy: { name: "asc" } }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: day, lt: addDays(day, 1) } },
      select: { courtId: true, start: true, end: true, memberId: true },
    }),
    memberDayCount(db, member.id, day),
  ]);

  const mine = bookings.filter((b) => b.memberId === member.id);
  const expired = !benefitPlan(member);
  const limitHit = usedToday >= MAX_BOOKINGS_PER_DAY;
  const slots = slotStarts(day).filter((s) => s > now);
  const selectedCourt = courts.find((c) => c.id === Number(sp.court));
  const q = (extra: Record<string, string>) => `/me/book?${new URLSearchParams({ date, sport, ...extra })}`;

  return (
    <main className={`grid content-start gap-4 p-5 ${selectedCourt ? "pb-48" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-extrabold text-forest">Book a court</h1>
        <div role="group" aria-label="Sport" className="flex gap-1.5">
          {(["tennis", "cricket"] as const).map((s) => (
            <Link
              key={s}
              href={`/me/book?${new URLSearchParams({ date, sport: s })}`}
              aria-current={sport === s ? "true" : undefined}
              className={`rounded-full border-[1.5px] border-forest px-3 py-1.5 text-[13.5px] font-bold ${sport === s ? "bg-forest text-cream" : "text-forest"}`}
            >
              {s === "tennis" ? "Tennis" : "Cricket"}
            </Link>
          ))}
        </div>
      </div>

      <nav aria-label="Choose a day" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.map((d, i) => {
          const on = isoDate(d) === date;
          return (
            <Link
              key={d.toISOString()}
              href={`/me/book?${new URLSearchParams({ date: isoDate(d), sport })}`}
              aria-current={on ? "date" : undefined}
              className={`min-h-[60px] flex-[0_0_64px] rounded-[14px] border-[1.5px] px-1 py-2.5 text-center ${on ? "border-forest bg-forest text-cream" : "border-line bg-paper text-ink"}`}
            >
              <span className="block font-extrabold">{i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
              <span className="text-[13px]">{d.getDate()}</span>
            </Link>
          );
        })}
      </nav>

      {socials.map((sb) => {
        const mine = sb.players.find((pl) => pl.memberId === member.id);
        return (
          <SocialCard
            key={sb.id}
            bookingId={sb.id}
            court={sb.court.name}
            when={fmtTime(sb.start)}
            playing={sb.players.filter((pl) => pl.status === "confirmed").length}
            capacity={sb.capacity}
            waiting={sb.players.filter((pl) => pl.status === "waitlist").length}
            price={socialShare(member.plan, sb.court.walkInRate)}
            me={mine ? { id: mine.id, status: mine.status } : null}
            closed={expired}
          />
        );
      })}

      {expired ? (
        <p className="rounded-xl bg-clay-soft p-3 text-[14px] text-[#7a2f14]">Your membership has expired. Renew at the front desk to book courts.</p>
      ) : limitHit ? (
        <p className="rounded-xl border border-line bg-paper p-3 text-[14px] text-muted">
          You already have {MAX_BOOKINGS_PER_DAY} bookings on this day, the most a member can play. Pick another day.
        </p>
      ) : (
        <p className="text-[13.5px] text-muted">
          1-hour sessions · pay at the desk · {usedToday} of {MAX_BOOKINGS_PER_DAY} used this day
        </p>
      )}

      {courts.map((c) => {
        const free = slots.filter((s) => {
          const span = { start: s, end: sessionEnd(s) };
          return !bookings.some((b) => b.courtId === c.id && overlaps(b, span)) && !mine.some((b) => overlaps(b, span));
        });
        const price = courtPrice(member.plan, c.walkInRate);
        return (
          <section key={c.id} className="grid gap-2.5 rounded-2xl border border-line bg-paper p-3.5">
            <div className="flex justify-between gap-2">
              <h2 className="text-[16px] font-bold">{c.name}</h2>
              <span className="text-[13.5px] text-muted">{price === 0 ? "Included" : `${member.plan.name} ${inr(price)}`}</span>
            </div>
            {free.length === 0 ? (
              <p className="text-[14px] text-muted">Fully booked.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {free.map((s) => {
                  const on = selectedCourt?.id === c.id && sp.time === hhmm(s);
                  if (expired || limitHit)
                    return (
                      <span
                        key={s.toISOString()}
                        className="min-h-11 rounded-full border-[1.5px] border-line px-3 py-2 text-[14px] font-bold tabular-nums text-muted/60"
                      >
                        {fmtTime(s)}
                      </span>
                    );
                  return (
                    <Link
                      key={s.toISOString()}
                      href={q({ court: String(c.id), time: hhmm(s) })}
                      scroll={false}
                      className={`min-h-11 rounded-full border-[1.5px] px-3 py-2 text-[14px] font-bold tabular-nums ${on ? "border-forest bg-forest text-cream" : "border-line text-ink hover:border-forest"}`}
                    >
                      {fmtTime(s)}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {selectedCourt && sp.time && !expired && !limitHit && (
        <ConfirmBooking
          key={`${selectedCourt.id}-${sp.time}-${date}`}
          courtId={selectedCourt.id}
          courtName={selectedCourt.name}
          date={date}
          time={sp.time}
          label={`${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(new Date(`${date}T${sp.time}:00`))}`}
          plan={member.plan.name}
          price={courtPrice(member.plan, selectedCourt.walkInRate)}
          walkIn={selectedCourt.walkInRate}
          closeHref={q({})}
        />
      )}
    </main>
  );
}
