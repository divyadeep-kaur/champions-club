import Link from "next/link";
import { db } from "@/lib/db";
import { freeStarts } from "@/lib/availability";
import { addDays, fmtTime, hhmm, isoDate, parseIsoDate, startOfDay } from "@/lib/dates";
import { inr } from "@/lib/constants";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courts this week · The Champions Club", description: "See which tennis courts and cricket nets are free this week and book a trial." };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ date?: string; sport?: string }> }) {
  const sp = await searchParams;
  const today = startOfDay();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  let day = parseIsoDate(sp.date);
  if (day < today || day > days[6]) day = today;
  const date = isoDate(day);
  const sport = sp.sport === "cricket" ? "cricket" : "tennis";
  const now = new Date();

  const [courts, bookings, weekBookings, cheapest] = await Promise.all([
    db.court.findMany({ where: { sport }, orderBy: { name: "asc" } }),
    db.booking.findMany({ where: { status: "booked", start: { gte: day, lt: addDays(day, 1) } }, select: { courtId: true, start: true, end: true } }),
    db.booking.findMany({ where: { status: "booked", start: { gte: today, lt: addDays(today, 7) }, court: { sport } }, select: { courtId: true, start: true, end: true } }),
    db.plan.aggregate({ _min: { courtRate: true } }),
  ]);

  const freeByDay = days.map((d) => courts.reduce((n, c) => n + freeStarts(d, c.id, weekBookings, now).length, 0));
  const link = (extra: Record<string, string>) => `/courts?${new URLSearchParams({ date, sport, ...extra })}`;

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <section className="mx-auto max-w-[1320px] px-4 pb-20 pt-10 sm:px-8 lg:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-[48px] font-semibold leading-[0.95] tracking-[-0.035em] text-forest sm:text-[64px]">
              Courts <em className="font-medium">this week</em>
            </h1>
            <p className="mt-4 max-w-[520px] text-[17px] text-ink">
              Every free hour for the next 7 days. Tap a time to request a free trial. Members book instantly from their phone and pay from {inr(cheapest._min.courtRate ?? 0)} an hour.
            </p>
          </div>
          <div className="grid grid-cols-2 border border-forest text-[15px] font-semibold">
            {(["tennis", "cricket"] as const).map((s) => (
              <Link key={s} href={`/courts?${new URLSearchParams({ date, sport: s })}`} className={`px-5 py-2.5 text-center ${sport === s ? "bg-forest text-cream" : "bg-paper text-forest"}`}>
                {s === "tennis" ? "Tennis" : "Cricket nets"}
              </Link>
            ))}
          </div>
        </div>

        <nav aria-label="Choose a day" className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {days.map((d, i) => {
            const active = isoDate(d) === date;
            return (
              <Link
                key={d.toISOString()}
                href={link({ date: isoDate(d) })}
                aria-current={active ? "date" : undefined}
                className={`border px-3 py-3 transition-colors ${active ? "border-forest bg-forest text-cream" : "border-line bg-paper text-ink hover:border-forest"}`}
              >
                <span className="block text-[12px] font-semibold uppercase tracking-wide opacity-75">{i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                <span className="block font-serif text-[24px] font-semibold leading-tight">{d.getDate()}</span>
                <span className={`block text-[12.5px] ${active ? "text-cream/80" : "text-muted"}`}>{freeByDay[i]} free</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {courts.map((c) => {
            const free = freeStarts(day, c.id, bookings, now);
            return (
              <section key={c.id} className="border border-line bg-paper p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-serif text-[22px] font-medium text-forest">{c.name}</h2>
                  <span className="text-[13.5px] text-muted">
                    {free.length ? `${free.length} free` : "Fully booked"} · walk-in {inr(c.walkInRate)}/hr
                  </span>
                </div>
                {free.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {free.map((s) => (
                      <li key={s.toISOString()}>
                        <Link
                          href={`/trial?${new URLSearchParams({ date, time: hhmm(s), court: String(c.id) })}`}
                          className="inline-block border border-line px-3 py-1.5 text-[14px] font-medium tabular-nums text-ink transition-colors hover:border-forest hover:bg-ball/20"
                        >
                          {fmtTime(s)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-[14.5px] text-muted">Try another day or the other courts.</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-[16px] text-ink">Already a member? Book any free hour in a few taps.</p>
          <Link href="/me/book" className="bg-forest px-6 py-3 text-[16px] font-semibold text-cream hover:bg-forest-deep">
            Member booking
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
