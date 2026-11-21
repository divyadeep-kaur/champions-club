import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { overlaps, sessionEnd } from "@/lib/bookings";
import { CLOSE_HOUR, OPEN_HOUR, inr } from "@/lib/constants";
import { addDays, hhmm, isoDate, parseIsoDate, startOfDay } from "@/lib/dates";
import { freeStarts } from "@/lib/availability";
import { SubpageHeader } from "@/components/landing/Navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Courts this week · The Champions Club", description: "Free 1-hour slots for the next 7 days, live from the booking desk." };

const pill = (on: boolean) =>
  `min-h-11 rounded-full border-[1.5px] border-forest px-[18px] py-2.5 font-bold ${on ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`;
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/ ?(am|pm)$/i, "");

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ date?: string; sport?: string }> }) {
  const sp = await searchParams;
  const today = startOfDay();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  let day = parseIsoDate(sp.date);
  if (day < today || day > days[6]) day = today;
  const date = isoDate(day);
  const sport = sp.sport === "tennis" || sp.sport === "cricket" ? sp.sport : "all";
  const now = new Date();

  const [courts, weekBookings, gold] = await Promise.all([
    db.court.findMany({ where: sport === "all" ? {} : { sport }, orderBy: [{ sport: "desc" }, { name: "asc" }] }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: today, lt: addDays(today, 7) } },
      select: { courtId: true, start: true, end: true, type: true },
    }),
    db.plan.findFirst({ where: { name: "Gold" } }),
  ]);

  const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
  const freeCount = (d: Date) => courts.reduce((n, c) => n + freeStarts(d, c.id, weekBookings, now).length, 0);
  const link = (extra: Record<string, string>) => `/courts?${new URLSearchParams({ date, ...(sport !== "all" ? { sport } : {}), ...extra })}`;

  return (
    <div className="min-h-screen">
      <SubpageHeader
        right={
          <>
            <Link href="/me/login" className="px-3 py-2.5 font-semibold text-forest">
              Member sign in
            </Link>
            <Link href="/trial" className="rounded-full bg-ball px-5 py-3 font-bold text-forest-deep hover:bg-[#b6dd45]">
              Book a free trial
            </Link>
          </>
        }
      />
      <main className="mx-auto grid max-w-[1280px] gap-7 px-4 pb-20 pt-12 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-none tracking-[-0.03em] text-forest">Courts this week</h1>
            <p className="mt-2.5 text-[18px] text-muted">Free 1-hour slots, live from the booking desk. Sessions start every 30 minutes.</p>
          </div>
          <div role="group" aria-label="Sport" className="flex gap-2">
            {[
              ["all", "All"],
              ["tennis", "Tennis"],
              ["cricket", "Cricket"],
            ].map(([k, l]) => (
              <Link
                key={k}
                href={`/courts?${new URLSearchParams({ date, ...(k !== "all" ? { sport: k } : {}) })}`}
                aria-current={sport === k ? "true" : undefined}
                className={pill(sport === k)}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>

        <nav aria-label="Choose a day" className="grid grid-cols-[repeat(7,minmax(88px,1fr))] gap-2.5 overflow-x-auto pb-1">
          {days.map((d, i) => {
            const on = isoDate(d) === date;
            return (
              <Link
                key={d.toISOString()}
                href={link({ date: isoDate(d) })}
                aria-current={on ? "date" : undefined}
                className={`min-h-16 rounded-[14px] border-[1.5px] px-2 py-3 text-center ${on ? "border-forest bg-forest text-cream" : "border-line bg-paper text-ink hover:border-forest"}`}
              >
                <span className="block font-extrabold">{i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                <span className="text-[13.5px]">
                  {d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {freeCount(d)} free
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-start gap-6">
          <div className="grid min-w-0 flex-[999_1_560px] gap-3.5">
            {courts.map((c) => {
              const slots = hours.map((h) => {
                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, 0);
                const span = { start, end: sessionEnd(start) };
                const clash = weekBookings.filter((b) => b.courtId === c.id && overlaps(b, span));
                const social = clash.some((b) => b.type === "social");
                const past = start < now;
                return { start, booked: clash.length > 0 || past, social, past };
              });
              const none = slots.every((s) => s.booked);
              return (
                <section key={c.id} className="grid gap-3 rounded-2xl border border-line bg-paper px-5 py-[18px]">
                  <div className="flex flex-wrap justify-between gap-3">
                    <h2 className="text-[18px] font-bold">{c.name}</h2>
                    <span className="text-[14px] text-muted">
                      Walk-in {inr(c.walkInRate)} · members from {gold?.courtRate === 0 ? "free on Gold" : inr(gold?.courtRate ?? 0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) =>
                      s.booked ? (
                        <span
                          key={s.start.toISOString()}
                          className="rounded-full bg-[#ece5d6] px-3 py-2 text-[14px] font-semibold tabular-nums text-[#6b6357] line-through"
                        >
                          {time(s.start)}
                          {s.social && !s.past ? " social" : ""}
                        </span>
                      ) : (
                        <Link
                          key={s.start.toISOString()}
                          href={`/trial?${new URLSearchParams({ date, time: hhmm(s.start), court: String(c.id) })}`}
                          className="rounded-full bg-[#e3efc7] px-3 py-2 text-[14px] font-semibold tabular-nums text-[#2f4a0a] hover:bg-ball"
                        >
                          {time(s.start)}
                        </Link>
                      ),
                    )}
                  </div>
                  {none && <p className="text-[14.5px] text-muted">Fully booked. Try another day or the other courts.</p>}
                </section>
              );
            })}
          </div>
          <aside className="relative flex min-h-[420px] min-w-0 flex-[1_1_320px] items-end overflow-hidden rounded-[20px] p-[18px]">
            <Image src="/images/cricket-net.jpg" alt="" aria-hidden="true" fill unoptimized sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />
            <div className="relative grid gap-3 rounded-2xl border border-white/25 bg-forest-deep/55 p-[22px] text-white backdrop-blur-[14px]">
              <strong className="text-[22px]">Already a member?</strong>
              <span className="text-[15.5px] leading-normal">Book any free hour in a few taps, up to 7 days ahead.</span>
              <Link href="/me/book" className="rounded-full bg-ball px-4 py-3 text-center font-bold text-forest-deep">
                Member sign in
              </Link>
              <Link href="/trial" className="text-center font-bold text-white underline-offset-4 hover:underline">
                New here? Book a free trial
              </Link>
            </div>
          </aside>
        </div>
        <div className="flex flex-wrap gap-[18px] text-[13.5px] text-muted">
          <span>Green = free to book (tap to request a trial)</span>
          <span>Struck through = booked or past</span>
          <span>Friday evenings: social play on a shared court</span>
        </div>
      </main>
    </div>
  );
}
