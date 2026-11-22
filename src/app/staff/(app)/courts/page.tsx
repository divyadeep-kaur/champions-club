import Link from "next/link";
import { db } from "@/lib/db";
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES, inr } from "@/lib/constants";
import { requireStaff } from "@/lib/session";
import { btnOutline } from "@/components/staff/ui";
import { AddCourtForm, BlockForm, EditCourtForm } from "./CourtForms";
import { unblockSlot } from "./actions";

export const dynamic = "force-dynamic";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ court?: string; date?: string }> }) {
  await requireStaff(["owner"]);
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : ymd(new Date());
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const now = new Date();

  const courts = await db.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }], include: { _count: { select: { bookings: true } } } });
  const court = courts.find((c) => c.id === Number(sp.court)) ?? courts[0];
  const dayBookings = await db.booking.findMany({
    where: { status: "booked", start: { gte: dayStart, lt: dayEnd } },
    include: { member: { select: { name: true } } },
    orderBy: { start: "asc" },
  });
  const perCourt = new Map<number, number>();
  for (const b of dayBookings) perCourt.set(b.courtId, (perCourt.get(b.courtId) ?? 0) + 1);

  const mine = court ? dayBookings.filter((b) => b.courtId === court.id) : [];
  const slots: { at: Date; booking?: (typeof mine)[number]; past: boolean }[] = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MINUTES) {
    const at = new Date(dayStart.getTime() + m * 60_000);
    const end = new Date(at.getTime() + SLOT_MINUTES * 60_000);
    slots.push({ at, booking: mine.find((b) => b.start < end && b.end > at), past: end <= now });
  }
  const free = slots.filter((s) => !s.booking && !s.past);
  const booked = slots.filter((s) => s.booking).length;
  const prev = ymd(new Date(dayStart.getTime() - 86_400_000));
  const next = ymd(new Date(dayStart.getTime() + 86_400_000));
  const q = (c: number, d: string) => `/staff/courts?court=${c}&date=${d}`;

  return (
    <div className="grid content-start gap-5">
      <div>
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Courts</h1>
        <p className="mt-1.5 text-muted">Add or edit courts, see which slots are free or booked, and block time for repairs or events.</p>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
        {courts.map((c) => (
          <Link
            key={c.id}
            href={q(c.id, date)}
            className={`grid gap-1 border p-4 transition-colors ${c.id === court?.id ? "border-forest bg-forest text-cream" : "border-line bg-paper hover:border-forest/50"}`}
          >
            <span className="font-semibold">{c.name}</span>
            <span className={`text-[13px] ${c.id === court?.id ? "text-cream/75" : "text-muted"}`}>
              {c.sport === "cricket" ? "Cricket" : "Tennis"} · {inr(c.walkInRate)}/hr walk-in
            </span>
            <span className={`text-[13px] ${c.id === court?.id ? "text-ball" : "text-forest"}`}>
              {perCourt.get(c.id) ?? 0} booking{(perCourt.get(c.id) ?? 0) === 1 ? "" : "s"} this day
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid content-start gap-3 border border-line bg-paper p-4">
          {court ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[18px] font-bold text-forest">
                  {court.name} · {dayStart.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </h2>
                <div className="flex gap-2">
                  <Link href={q(court.id, prev)} className={btnOutline}>
                    ‹ Prev
                  </Link>
                  <Link href={q(court.id, ymd(new Date()))} className={btnOutline}>
                    Today
                  </Link>
                  <Link href={q(court.id, next)} className={btnOutline}>
                    Next ›
                  </Link>
                </div>
              </div>
              <p className="text-[14px] text-muted">
                <span className="font-semibold text-[#4d7a12]">{free.length} free</span> · <span className="font-semibold text-forest">{booked} booked</span> half-hour slots
              </p>
              <div className="flex flex-wrap gap-3 text-[12.5px] text-muted">
                <span className="flex items-center gap-1.5"><span className="size-3 border border-[#9cc25a] bg-[#eef5dc]" /> Free</span>
                <span className="flex items-center gap-1.5"><span className="size-3 bg-forest" /> Booked</span>
                <span className="flex items-center gap-1.5"><span className="size-3 bg-[#8a8f8c]" /> Blocked</span>
                <span className="flex items-center gap-1.5"><span className="size-3 bg-line" /> Past</span>
              </div>
              <ul className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
                {slots.map(({ at, booking, past }) => {
                  const blocked = booking?.type === "blocked";
                  const who = booking ? (blocked ? (booking.guestName ?? "Blocked").replace(/^Blocked: /, "") : (booking.member?.name ?? booking.guestName ?? "Walk-in")) : null;
                  return (
                    <li
                      key={at.getTime()}
                      className={`grid min-h-[58px] gap-0.5 border px-2.5 py-1.5 text-[13px] ${
                        booking ? (blocked ? "border-[#8a8f8c] bg-[#8a8f8c] text-white" : "border-forest bg-forest text-cream") : past ? "border-line bg-line/60 text-muted" : "border-[#9cc25a] bg-[#eef5dc] text-[#2f4a0a]"
                      }`}
                    >
                      <span className="font-semibold">{hm(at)}</span>
                      <span className="truncate" title={who ?? undefined}>
                        {booking ? (blocked ? `Blocked · ${who}` : who) : past ? "Past" : "Free"}
                      </span>
                      {blocked && booking.start.getTime() === at.getTime() && !past && (
                        <form action={unblockSlot}>
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <button className="text-[12px] font-bold underline underline-offset-2">Unblock</button>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-[13px] text-muted">
                To book or cancel a player&apos;s session, use{" "}
                <Link href="/staff/bookings" className="font-semibold text-forest underline underline-offset-2">
                  Bookings
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="text-muted">No courts yet. Add the first one.</p>
          )}
        </section>

        <div className="grid content-start gap-4">
          {court && <BlockForm key={`b${court.id}${date}`} courtId={court.id} date={date} times={free.map((s) => ({ value: hm24(s.at), label: hm(s.at) }))} />}
          {court && <EditCourtForm key={`e${court.id}`} court={court} />}
          <AddCourtForm />
        </div>
      </div>
    </div>
  );
}

function hm24(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
