import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtDate, fmtTime, isoDate, parseIsoDate } from "@/lib/dates";
import { sessionEnd } from "@/lib/bookings";
import { requireStaff } from "@/lib/session";
import { Badge } from "@/components/staff/ui";
import { BookingGrid, defaultWindow, WINDOWS, type GridWindow } from "./BookingGrid";
import { NewBookingForm, type MemberOption } from "./NewBookingForm";
import { SocialRoster } from "./SocialRoster";
import { cancelBooking } from "./actions";
import { CollectForm } from "./CollectForm";
import { courtDues, paidSoFar } from "@/lib/ledger";
import { balanceDue } from "@/lib/money";

export const dynamic = "force-dynamic";

type Search = { date?: string; court?: string; time?: string; booking?: string; member?: string; w?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff(["owner", "desk"]);
  const sp = await searchParams;
  const day = parseIsoDate(sp.date);
  const date = isoDate(day);
  const now = new Date();
  const dayEnd = addDays(day, 1);

  const [courts, bookings, members, selectedBooking, preMember] = await Promise.all([
    db.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }] }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: day, lt: dayEnd } },
      include: { member: { include: { plan: true } }, players: { where: { status: { in: ["confirmed", "offered"] } } } },
      orderBy: { start: "asc" },
    }),
    db.member.findMany({ include: { plan: true }, orderBy: { name: "asc" } }),
    sp.booking
      ? db.booking.findUnique({
          where: { id: Number(sp.booking) || 0 },
          include: { court: true, member: { include: { plan: true } }, players: { include: { member: true }, orderBy: { createdAt: "asc" } } },
        })
      : null,
    sp.member ? db.member.findUnique({ where: { id: Number(sp.member) || 0 } }) : null,
  ]);

  const counts = new Map<number, number>();
  for (const b of bookings) {
    if (b.memberId) counts.set(b.memberId, (counts.get(b.memberId) ?? 0) + 1);
    for (const p of b.players) if (p.memberId) counts.set(p.memberId, (counts.get(p.memberId) ?? 0) + 1);
  }
  const memberOptions: MemberOption[] = members.map((m) => ({
    code: m.code,
    name: m.name,
    plan: m.plan.name,
    courtRate: m.plan.courtRate,
    shopDiscount: m.plan.shopDiscount,
    barDiscount: m.plan.barDiscount,
    expired: m.endDate < day,
    today: counts.get(m.id) ?? 0,
  }));

  const [selectedPaid, dues] = await Promise.all([selectedBooking ? paidSoFar(db, "court", selectedBooking.id) : 0, courtDues(db, dayEnd)]);
  const selectedDue = selectedBooking && selectedBooking.type === "regular" && selectedBooking.status === "booked" && !selectedBooking.paidAt ? balanceDue(selectedBooking.price, selectedPaid) : 0;
  const court = sp.court ? courts.find((c) => c.id === Number(sp.court)) : undefined;
  const slotStart = court && sp.time?.match(/^\d{2}:\d{2}$/) ? new Date(`${date}T${sp.time}:00`) : null;
  const win: GridWindow =
    sp.w && sp.w in WINDOWS
      ? (sp.w as GridWindow)
      : slotStart
        ? slotStart.getHours() < 12
          ? "morning"
          : slotStart.getHours() < 17
            ? "afternoon"
            : "evening"
        : defaultWindow(now, day);
  const closeHref = `/staff/bookings?date=${date}&w=${win}`;
  const revenue = bookings.reduce((s, b) => s + b.price, 0);
  const social = bookings.find((b) => b.type === "social");
  const nav = "grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5";

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Court bookings</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/staff/bookings?date=${isoDate(addDays(day, -1))}&w=${win}`} aria-label="Previous day" className={nav}>
            <ChevronLeft className="size-4" />
          </Link>
          <span className="px-2 font-semibold">{day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
          <Link href={`/staff/bookings?date=${isoDate(addDays(day, 1))}&w=${win}`} aria-label="Next day" className={nav}>
            <ChevronRight className="size-4" />
          </Link>
          <Link href="/staff/bookings" className="min-h-11 border-[1.5px] border-forest px-3.5 py-2.5 text-[14px] font-semibold text-forest hover:bg-forest/5">
            Today
          </Link>
          <form className="flex">
            <input type="hidden" name="w" value={win} />
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
      </div>

      {dues.total > 0 && (
        <details className="group border-[1.5px] border-clay/60 bg-paper">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14.5px]">
            <span>
              <strong className="text-clay">{inr(dues.total)} to collect</strong> from {dues.courts.length + dues.players.length} court booking
              {dues.courts.length + dues.players.length === 1 ? "" : "s"} up to {fmtDate(day)} (booked in the app or as pay later)
            </span>
            <span className="text-[13.5px] font-semibold text-forest group-open:hidden">Show</span>
            <span className="hidden text-[13.5px] font-semibold text-forest group-open:inline">Hide</span>
          </summary>
          <ul className="border-t border-line">
            {dues.courts.map((b) => (
              <li key={`b${b.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[14px] first:border-t-0">
                <Link href={`/staff/bookings?date=${isoDate(b.start)}&booking=${b.id}`} className="min-w-0 hover:text-forest">
                  <strong>{b.member?.name ?? b.guestName ?? "Walk-in"}</strong> · {b.court.name} · {fmtDate(b.start)} {fmtTime(b.start)}
                  {b.start < now && <span className="ml-1.5 text-[12.5px] font-semibold text-clay">played</span>}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{inr(b.due)}</span>
                  <CollectForm bookingId={b.id} amount={b.due} compact />
                </span>
              </li>
            ))}
            {dues.players.map((p) => (
              <li key={`p${p.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[14px]">
                <Link href={`/staff/bookings?date=${isoDate(p.booking.start)}&booking=${p.bookingId}`} className="min-w-0 hover:text-forest">
                  <strong>{p.name}</strong> · social play · {fmtDate(p.booking.start)} {fmtTime(p.booking.start)}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{inr(p.price)}</span>
                  <CollectForm playerId={p.id} amount={p.price} compact />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-[13.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 bg-forest" /> Member
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 bg-[#8a6d3b]" /> Walk-in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 bg-[#4d7a12]" /> Trial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 bg-clay" /> Friday social play
          </span>
          <span>Sessions are 1 hour and start every 30 minutes. Click a free slot to book.</span>
        </div>
        <div role="group" aria-label="Part of day" className="flex border-[1.5px] border-forest">
          {(Object.keys(WINDOWS) as GridWindow[]).map((k) => (
            <Link
              key={k}
              href={`/staff/bookings?date=${date}&w=${k}${preMember ? `&member=${preMember.id}` : ""}`}
              aria-current={win === k ? "true" : undefined}
              className={`px-3.5 py-2 text-[14px] font-semibold ${win === k ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
            >
              {WINDOWS[k].label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <BookingGrid
            day={day}
            now={now}
            courts={courts}
            selected={{ bookingId: selectedBooking?.id, courtId: court?.id, time: sp.time }}
            window={win}
            extraQuery={preMember ? `&member=${preMember.id}` : ""}
            bookings={bookings.map((b) => ({
              id: b.id,
              courtId: b.courtId,
              start: b.start,
              end: b.end,
              type: b.type,
              capacity: b.capacity,
              players: b.players.filter((p) => p.status === "confirmed").length,
              label: b.member?.name ?? b.guestName ?? "Walk-in",
              plan: b.member?.plan.name,
            }))}
          />
          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <div className="border border-line bg-paper p-[18px]">
              <div className="text-[14px] text-muted">Booked {now.toDateString() === day.toDateString() ? "today" : "this day"}</div>
              <div className="font-serif text-[28px] text-forest">
                {bookings.length} {bookings.length === 1 ? "session" : "sessions"}
              </div>
            </div>
            <div className="border border-line bg-paper p-[18px]">
              <div className="text-[14px] text-muted">Court income</div>
              <div className="font-serif text-[28px] text-forest">{inr(revenue)}</div>
            </div>
            <div className="border border-line bg-paper p-[18px]">
              <div className="text-[14px] text-muted">{social ? "Social play" : "Courts"}</div>
              <div className={`font-serif text-[28px] ${social ? "text-clay" : "text-forest"}`}>
                {social ? `${social.players.filter((p) => p.status === "confirmed").length} of ${social.capacity} places` : `${courts.length} open 6am–11pm`}
              </div>
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="border border-line bg-paper p-6">
            {selectedBooking ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                      {selectedBooking.type === "social" ? "Social play" : selectedBooking.type === "trial" ? "Trial session" : "Booking"} #{selectedBooking.id}
                    </p>
                    <h2 className="mt-1 font-serif text-[24px] font-medium leading-tight text-forest">{selectedBooking.court.name}</h2>
                    <p className="text-[15px]">
                      {fmtDate(selectedBooking.start)} · {fmtTime(selectedBooking.start)} – {fmtTime(selectedBooking.end)}
                    </p>
                  </div>
                  <Link href={closeHref} scroll={false} aria-label="Close" className="grid size-8 place-items-center text-muted hover:bg-cream">
                    <X className="size-4" />
                  </Link>
                </div>

                {selectedBooking.type !== "social" && (
                  <dl className="space-y-2 border-t border-line pt-4 text-[15px]">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Player</dt>
                      <dd className="text-right">
                        {selectedBooking.member ? (
                          <Link href={`/staff/members/${selectedBooking.member.id}`} className="font-semibold text-forest underline underline-offset-4">
                            {selectedBooking.member.name}
                          </Link>
                        ) : (
                          (selectedBooking.guestName ?? "Walk-in")
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Plan</dt>
                      <dd>{selectedBooking.member?.plan.name ?? "Walk-in"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Price</dt>
                      <dd className="tabular-nums">{selectedBooking.price ? inr(selectedBooking.price) : "Free"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Status</dt>
                      <dd>{selectedBooking.status === "booked" ? <Badge tone="green">Booked</Badge> : <Badge>Cancelled</Badge>}</dd>
                    </div>
                    {selectedBooking.price > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Payment</dt>
                        <dd>{selectedDue > 0 ? <Badge tone="clay">{inr(selectedDue)} due</Badge> : selectedPaid > 0 ? <Badge tone="green">Paid {inr(selectedPaid)}</Badge> : <Badge>Nothing paid</Badge>}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {selectedDue > 0 && (
                  <div className="grid gap-2 bg-clay-soft/60 p-3">
                    <p className="text-[13.5px] text-[#7a2f14]">Not paid yet. Take payment at the desk:</p>
                    <CollectForm bookingId={selectedBooking.id} amount={selectedDue} />
                  </div>
                )}

                {selectedBooking.type === "social" && <SocialRoster booking={selectedBooking} members={memberOptions} />}

                {selectedBooking.status === "booked" && selectedBooking.end > now && (
                  <form action={cancelBooking} className="border-t border-line pt-4">
                    <input type="hidden" name="bookingId" value={selectedBooking.id} />
                    <button type="submit" className="w-full border border-clay/50 px-4 py-2.5 text-[14.5px] font-semibold text-clay hover:bg-clay-soft">
                      Cancel booking{selectedPaid > 0 ? ` and refund ${inr(selectedPaid)}` : ""}
                    </button>
                  </form>
                )}
              </div>
            ) : court && slotStart ? (
              <NewBookingForm
                key={`${court.id}-${sp.time}`}
                court={court}
                date={date}
                time={sp.time!}
                timeLabel={`${fmtDate(slotStart)} · ${fmtTime(slotStart)} – ${fmtTime(sessionEnd(slotStart))}`}
                members={memberOptions}
                defaultMember={preMember ? `${preMember.code} · ${preMember.name}` : undefined}
                socialAllowed={slotStart.getDay() === 5 && slotStart.getHours() >= 18}
                closeHref={closeHref}
              />
            ) : (
              <div className="space-y-2 text-[15px]">
                <h2 className="font-serif text-[22px] font-medium text-forest">Pick a free slot</h2>
                <p className="text-muted">
                  {preMember ? `Booking for ${preMember.name}. ` : ""}Hover the grid and click any free half-hour to start a booking. Click a booking to see
                  details or cancel it.
                </p>
                {day.getDay() === 5 && <p className="text-muted">It’s Friday: evening slots from 6 pm can be opened for social play.</p>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
