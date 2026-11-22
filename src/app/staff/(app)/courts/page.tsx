import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtTime, hhmm, isoDate, parseIsoDate } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { BLOCKED, daySlots, slotSummary, type SlotBooking } from "@/lib/courtSlots";
import { Badge, PageHeader } from "@/components/staff/ui";
import { AddCourtForm, EditCourtForm } from "./CourtForms";
import { SlotBoard, type BoardSlot } from "./SlotBoard";

export const dynamic = "force-dynamic";

type Search = { date?: string; court?: string; add?: string };

export default async function CourtsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff(["owner"]);
  const sp = await searchParams;
  const day = parseIsoDate(sp.date);
  const date = isoDate(day);
  const now = new Date();

  const [courts, dayBookings, history] = await Promise.all([
    db.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }] }),
    db.booking.findMany({
      where: { status: "booked", start: { lt: addDays(day, 1) }, end: { gt: day } },
      include: { member: { include: { plan: true } } },
      orderBy: { start: "asc" },
    }),
    db.booking.groupBy({ by: ["courtId"], where: { type: { not: BLOCKED } }, _count: true }),
  ]);

  const historyOf = new Map(history.map((h) => [h.courtId, h._count]));
  const spans: SlotBooking[] = dayBookings.map((b) => ({
    id: b.id,
    courtId: b.courtId,
    start: b.start,
    end: b.end,
    type: b.type,
    label: b.type === BLOCKED ? (b.guestName ?? "Blocked") : b.type === "social" ? "Social play" : (b.member?.name ?? b.guestName ?? "Walk-in"),
  }));
  const extra = new Map(dayBookings.map((b) => [b.id, b]));

  const court = courts.find((c) => c.id === Number(sp.court)) ?? courts[0];
  const overview = courts.map((c) => ({ court: c, sum: slotSummary(daySlots(day, c.id, spans, now)) }));
  const totals = overview.reduce((t, o) => ({ free: t.free + o.sum.free, booked: t.booked + o.sum.booked, blocked: t.blocked + o.sum.blocked }), {
    free: 0,
    booked: 0,
    blocked: 0,
  });

  const board: BoardSlot[] = court
    ? daySlots(day, court.id, spans, now).map((s) => {
        const base = { time: hhmm(s.start), label: fmtTime(s.start) };
        if (s.state.kind === "free" || s.state.kind === "past") return { ...base, kind: s.state.kind };
        const b = s.state.booking;
        const full = extra.get(b.id);
        const first = b.start >= s.start;
        if (s.state.kind === "blocked") return { ...base, kind: "blocked" as const, bookingId: b.id, who: b.label, first };
        return {
          ...base,
          kind: "booked" as const,
          bookingId: b.id,
          who: b.label,
          first,
          upcoming: b.end > now,
          href: `/staff/bookings?date=${date}&booking=${b.id}`,
          sub: `${fmtTime(b.start)}–${fmtTime(b.end)} · ${
            b.type === "social" ? "Social play" : b.type === "trial" ? "Trial" : (full?.member?.plan.name ?? "Walk-in")
          }${full && full.price > 0 ? ` · ${inr(full.price)}` : ""}`,
        };
      })
    : [];

  const q = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams({ date, ...(court ? { court: String(court.id) } : {}) });
    for (const [k, v] of Object.entries(over)) if (v !== undefined) p.set(k, String(v));
    return `/staff/courts?${p.toString()}`;
  };
  const nav = "grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5";

  return (
    <div className="grid content-start gap-6">
      <PageHeader
        title="Court management"
        description="Add or edit courts, see which slots are free or booked, and block slots for maintenance, coaching or events."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={q({ date: isoDate(addDays(day, -1)) })} aria-label="Previous day" className={nav}>
              <ChevronLeft className="size-4" />
            </Link>
            <span className="px-2 font-semibold">{day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
            <Link href={q({ date: isoDate(addDays(day, 1)) })} aria-label="Next day" className={nav}>
              <ChevronRight className="size-4" />
            </Link>
            <Link href={q({ date: isoDate(now) })} className="min-h-11 border-[1.5px] border-forest px-3.5 py-2.5 text-[14px] font-semibold text-forest hover:bg-forest/5">
              Today
            </Link>
            <form className="flex">
              {court && <input type="hidden" name="court" value={court.id} />}
              <input
                type="date"
                name="date"
                defaultValue={date}
                aria-label="Go to date"
                className="min-h-11 border border-[#b5aa98] bg-white px-3 text-[14px] outline-none focus:border-forest"
              />
              <button type="submit" className="sr-only">
                Go
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
        <div className="border border-line bg-paper p-[18px]">
          <div className="text-[14px] text-muted">Courts</div>
          <div className="font-serif text-[28px] text-forest">{courts.length}</div>
        </div>
        <div className="border border-line bg-paper p-[18px]">
          <div className="text-[14px] text-muted">Free half-hours</div>
          <div className="font-serif text-[28px] text-[#4d7a12]">{totals.free}</div>
        </div>
        <div className="border border-line bg-paper p-[18px]">
          <div className="text-[14px] text-muted">Booked half-hours</div>
          <div className="font-serif text-[28px] text-forest">{totals.booked}</div>
        </div>
        <div className="border border-line bg-paper p-[18px]">
          <div className="text-[14px] text-muted">Blocked half-hours</div>
          <div className={`font-serif text-[28px] ${totals.blocked ? "text-clay" : "text-forest"}`}>{totals.blocked}</div>
        </div>
      </div>

      <section className="grid gap-3">
        <h2 className="font-serif text-[22px] font-medium text-forest">All courts on this day</h2>
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[640px] text-left text-[14.5px]">
            <thead className="text-muted">
              <tr>
                {["Court", "Sport", "Walk-in rate", "Free", "Booked", "Blocked", "Use"].map((h) => (
                  <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&>tr]:border-t [&>tr]:border-line">
              {overview.map(({ court: c, sum }) => (
                <tr key={c.id} className={c.id === court?.id ? "bg-ball/15" : "hover:bg-cream"}>
                  <td className="px-3.5 py-3">
                    <Link href={q({ court: c.id })} className="font-semibold text-forest underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 capitalize">{c.sport}</td>
                  <td className="px-3.5 py-3 tabular-nums">{inr(c.walkInRate)}/hr</td>
                  <td className="px-3.5 py-3 tabular-nums text-[#4d7a12]">{sum.free}</td>
                  <td className="px-3.5 py-3 tabular-nums">{sum.booked}</td>
                  <td className="px-3.5 py-3 tabular-nums">{sum.blocked ? <Badge tone="clay">{sum.blocked}</Badge> : "0"}</td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-[#ece5d6]" aria-hidden>
                        <div className="h-2 bg-forest" style={{ width: `${sum.usedPct}%` }} />
                      </div>
                      <span className="tabular-nums text-muted">{sum.usedPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courts.length === 0 && <p className="px-4 py-10 text-center text-muted">No courts yet. Add the first one below.</p>}
        </div>
      </section>

      {court && (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Slots · {day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
              <h2 className="font-serif text-[26px] font-medium text-forest">{court.name}</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-[13px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 border border-line bg-paper" /> Free (tap to select)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 bg-forest" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3.5 border border-[#b5aa98] bg-[#ebe5d8]" /> Blocked
              </span>
              <Link href={`/staff/bookings?date=${date}`} className="font-semibold text-forest underline underline-offset-4">
                New booking on the Bookings page
              </Link>
            </div>
          </div>
          <SlotBoard key={`${court.id}-${date}`} courtId={court.id} courtName={court.name} date={date} slots={board} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {court && (
          <section className="grid content-start gap-3 border border-line bg-paper p-5">
            <h2 className="font-serif text-[22px] font-medium text-forest">Edit {court.name}</h2>
            <EditCourtForm key={court.id} court={court} bookingCount={historyOf.get(court.id) ?? 0} />
          </section>
        )}
        <section className="grid content-start gap-3 border border-line bg-paper p-5">
          <h2 className="font-serif text-[22px] font-medium text-forest">Add a new court</h2>
          <p className="text-[14px] text-muted">It shows up straight away on the Bookings grid, the member app and the public courts page. Open 6 am to 11 pm like every court.</p>
          <AddCourtForm />
        </section>
      </div>
    </div>
  );
}
