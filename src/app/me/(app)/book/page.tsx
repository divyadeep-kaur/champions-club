import Link from "next/link";
import { db } from "@/lib/db";
import { inr, MAX_BOOKINGS_PER_DAY } from "@/lib/constants";
import { addDays, fmtTime, hhmm, isoDate, parseIsoDate, startOfDay } from "@/lib/dates";
import { asDuration, DURATIONS, durationLabel, overlaps, sessionEnd, slotStarts } from "@/lib/bookings";
import { memberDayCount } from "@/lib/bookingService";
import { benefitPlan } from "@/lib/membership";
import { requireMember } from "@/lib/memberSession";
import { courtPrice, courtPriceFor } from "@/lib/pricing";
import { socialShare } from "@/lib/socialService";
import { ConfirmBooking } from "./ConfirmBooking";
import { SocialCard } from "./SocialCard";

export const dynamic = "force-dynamic";

const SPORTS = [
  { key: "tennis", label: "Tennis", unit: "court" },
  { key: "cricket", label: "Cricket", unit: "net" },
] as const;

const PARTS = [
  { label: "Morning", from: 0, to: 12 },
  { label: "Afternoon", from: 12, to: 17 },
  { label: "Evening", from: 17, to: 24 },
];

function Step({ n, title, done, change, children }: { n: number; title: string; done?: string; change?: string; children?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className={`grid size-6 place-items-center rounded-full text-[12.5px] ${done ? "bg-forest text-cream" : "border border-forest text-forest"}`}>
            {n}
          </span>
          {title}
          {done && <span className="font-normal text-muted">· {done}</span>}
        </h2>
        {done && change && (
          <Link href={change} scroll={false} className="text-[13.5px] font-semibold text-forest underline-offset-4 hover:underline">
            Change
          </Link>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

export default async function MemberBook({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; court?: string; time?: string; sport?: string; len?: string }>;
}) {
  const member = await requireMember();
  const sp = await searchParams;
  const today = startOfDay();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const sport = SPORTS.find((s) => s.key === sp.sport);
  const len = asDuration(sp.len);
  const now = new Date();

  const [allCourts, week] = await Promise.all([
    db.court.findMany({ orderBy: { name: "asc" } }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: today, lt: addDays(today, 7) } },
      select: { courtId: true, start: true, end: true, memberId: true },
    }),
  ]);
  const freeOn = (courtId: number, d: Date) => {
    const dayBookings = week.filter((b) => b.start >= d && b.start < addDays(d, 1));
    return slotStarts(d, len)
      .filter((s) => s > now)
      .filter((s) => {
        const span = { start: s, end: sessionEnd(s, len) };
        return !dayBookings.some((b) => (b.courtId === courtId || b.memberId === member.id) && overlaps(b, span));
      });
  };
  const nextFree = (courtId: number) => {
    for (const d of days) {
      const f = freeOn(courtId, d);
      if (f.length) return f[0];
    }
    return null;
  };
  const chosenCourt = sport ? allCourts.find((c) => c.sport === sport.key && c.id === Number(sp.court)) : undefined;
  let day = parseIsoDate(sp.date);
  if (day < today || day > days[6]) day = today;
  if (!sp.date && chosenCourt && !freeOn(chosenCourt.id, day).length) {
    const first = days.find((d) => freeOn(chosenCourt.id, d).length);
    if (first) day = first;
  }
  const date = isoDate(day);

  const [socials, usedToday] = await Promise.all([
    db.booking.findMany({
      where: { type: "social", status: "booked", start: { gte: day, lt: addDays(day, 1) }, end: { gt: now } },
      include: { court: true, players: true },
      orderBy: { start: "asc" },
    }),
    memberDayCount(db, member.id, day),
  ]);

  const plan = benefitPlan(member);
  const blocked = !plan || usedToday >= MAX_BOOKINGS_PER_DAY;
  const courts = sport ? allCourts.filter((c) => c.sport === sport.key) : [];
  const court = chosenCourt;
  const free = court ? freeOn(court.id, day) : [];
  const whenLabel = (s: Date) => {
    const i = days.findIndex((d) => isoDate(d) === isoDate(s));
    return `${i === 0 ? "Today" : i === 1 ? "Tomorrow" : s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(s)}`;
  };
  const picked = court && sp.time && free.some((s) => hhmm(s) === sp.time) ? sp.time : undefined;
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ date, len: len !== 60 ? String(len) : undefined, ...p })) if (v) u.set(k, v);
    return `/me/book?${u}`;
  };
  const priceText = (walkIn: number) => {
    const p = courtPrice(plan, walkIn);
    return plan ? (p === 0 ? "Included" : `${inr(p)}/hr`) : `${inr(walkIn)}/hr`;
  };
  const dayLabel = (d: Date, i: number) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short" }));

  return (
    <main className={`grid content-start gap-5 p-5 lg:max-w-[860px] lg:px-0 lg:py-8 ${picked ? "pb-48 lg:pb-40" : ""}`}>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold text-forest">Book a court</h1>
          <p className="text-[13.5px] text-muted">
            30 min to 2 hour sessions, up to 7 days ahead · pay at the desk · {usedToday} of {MAX_BOOKINGS_PER_DAY} used on{" "}
            {dayLabel(
              day,
              days.findIndex((d) => isoDate(d) === date),
            ).toLowerCase()}
          </p>
        </div>
      </header>

      {!plan && (
        <p className="rounded-lg bg-clay-soft px-3 py-2.5 text-[14px] text-[#7a2f14]">
          {member.suspendedAt ? "Your membership is on hold." : "Your membership has expired."} Renew at the front desk to book courts.
        </p>
      )}
      {plan && usedToday >= MAX_BOOKINGS_PER_DAY && (
        <p className="rounded-lg border border-line bg-paper px-3 py-2.5 text-[14px] text-muted">
          You already have {MAX_BOOKINGS_PER_DAY} bookings on this day. Pick another day.
        </p>
      )}

      <div className="grid gap-4 rounded-xl border border-line bg-paper p-4 sm:p-5">
        <Step n={1} title="Sport" done={sport?.label} change={link({})}>
          {!sport && (
            <div className="grid grid-cols-2 gap-2.5">
              {SPORTS.map((s) => {
                const list = allCourts.filter((c) => c.sport === s.key);
                const soonest = list
                  .map((c) => nextFree(c.id))
                  .filter((x): x is Date => !!x)
                  .sort((a, b) => a.getTime() - b.getTime())[0];
                return (
                  <Link
                    key={s.key}
                    href={link({ sport: s.key })}
                    scroll={false}
                    className="rounded-lg border border-line bg-cream px-3.5 py-3 hover:border-forest"
                  >
                    <span className="block text-[15px] font-semibold">{s.label}</span>
                    <span className="text-[13px] text-muted">
                      {list.length} {s.unit}
                      {list.length === 1 ? "" : "s"} · {soonest ? `next free ${whenLabel(soonest)}` : "fully booked this week"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Step>

        {sport && (
          <Step n={2} title={sport.key === "cricket" ? "Net" : "Court"} done={court?.name} change={link({ sport: sport.key })}>
            {!court && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {courts.map((c) => {
                  const next = nextFree(c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/me/book?${new URLSearchParams({ sport: sport.key, court: String(c.id) })}`}
                        scroll={false}
                        className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 ${next ? "border-line bg-cream hover:border-forest" : "border-line bg-cream/50 text-muted"}`}
                      >
                        <span>
                          <span className="block text-[15px] font-semibold">{c.name}</span>
                          <span className="text-[13px] text-muted">{next ? `Next free: ${whenLabel(next)}` : "Fully booked this week"}</span>
                        </span>
                        <span className="text-right text-[13px]">
                          <span className="block font-semibold text-ink">{priceText(c.walkInRate)}</span>
                          {plan && courtPrice(plan, c.walkInRate) < c.walkInRate && <s className="text-muted">{inr(c.walkInRate)}</s>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Step>
        )}

        {sport && court && (
          <Step n={3} title="Length, day and time">
            <div role="radiogroup" aria-label="Session length" className="mb-3 grid grid-cols-4 overflow-hidden rounded-lg border border-line">
              {DURATIONS.map((m) => {
                const on = m === len;
                return (
                  <Link
                    key={m}
                    href={link({ sport: sport.key, court: String(court.id), len: String(m) })}
                    scroll={false}
                    role="radio"
                    aria-checked={on}
                    className={`border-l border-line px-1 py-2 text-center text-[13px] first:border-l-0 ${on ? "bg-forest text-cream" : "bg-cream hover:bg-forest/5"}`}
                  >
                    <span className="block font-semibold">{durationLabel(m)}</span>
                    <span className={on ? "text-cream/80" : "text-muted"}>
                      {plan
                        ? courtPriceFor(plan, court.walkInRate, m) === 0
                          ? "Included"
                          : inr(courtPriceFor(plan, court.walkInRate, m))
                        : inr(courtPriceFor(null, court.walkInRate, m))}
                    </span>
                  </Link>
                );
              })}
            </div>
            <nav aria-label="Choose a day" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {days.map((d, i) => {
                const on = isoDate(d) === date;
                return (
                  <Link
                    key={d.toISOString()}
                    href={link({ date: isoDate(d), sport: sport.key, court: String(court.id) })}
                    scroll={false}
                    aria-current={on ? "date" : undefined}
                    className={`flex-[0_0_auto] rounded-lg border px-3 py-1.5 text-center text-[13px] ${on ? "border-forest bg-forest text-cream" : "border-line bg-cream hover:border-forest"}`}
                  >
                    <span className="block font-semibold">{dayLabel(d, i)}</span>
                    <span className={on ? "text-cream/80" : "text-muted"}>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </Link>
                );
              })}
            </nav>

            {free.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">No free times on this day. Try another day or court.</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {PARTS.map((part) => {
                  const list = free.filter((s) => s.getHours() >= part.from && s.getHours() < part.to);
                  if (!list.length) return null;
                  return (
                    <div key={part.label}>
                      <p className="mb-1.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">{part.label}</p>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                        {list.map((s) => {
                          const t = hhmm(s);
                          const on = picked === t;
                          return blocked ? (
                            <span key={t} className="rounded-md border border-line px-2 py-1.5 text-center text-[13.5px] tabular-nums text-muted/60">
                              {fmtTime(s)}
                            </span>
                          ) : (
                            <Link
                              key={t}
                              href={link({ sport: sport.key, court: String(court.id), time: t })}
                              scroll={false}
                              aria-current={on ? "true" : undefined}
                              className={`rounded-md border px-2 py-1.5 text-center text-[13.5px] font-medium tabular-nums ${on ? "border-forest bg-forest text-cream" : "border-line bg-cream hover:border-forest"}`}
                            >
                              {fmtTime(s)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Step>
        )}
      </div>

      {socials.length > 0 && (
        <div className="grid gap-3">
          {socials.map((sb) => {
            const me = sb.players.find((pl) => pl.memberId === member.id);
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
                me={me ? { id: me.id, status: me.status } : null}
                closed={!plan}
              />
            );
          })}
        </div>
      )}

      {court && picked && !blocked && (
        <ConfirmBooking
          key={`${court.id}-${picked}-${date}`}
          courtId={court.id}
          courtName={court.name}
          date={date}
          time={picked}
          label={`${day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(new Date(`${date}T${picked}:00`))}`}
          plan={member.plan.name}
          price={courtPriceFor(member.plan, court.walkInRate, len)}
          walkIn={courtPriceFor(null, court.walkInRate, len)}
          minutes={len}
          closeHref={link({ sport: sport?.key, court: String(court.id) })}
        />
      )}
    </main>
  );
}
