import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtDate, fmtTime, isoDate, parseIsoDate } from "@/lib/dates";
import { sessionEnd } from "@/lib/bookings";
import { requireStaff } from "@/lib/session";
import { Badge, PageHeader } from "@/components/staff/ui";
import { BookingGrid } from "./BookingGrid";
import { NewBookingForm, type MemberOption } from "./NewBookingForm";
import { SocialRoster } from "./SocialRoster";
import { cancelBooking } from "./actions";

export const dynamic = "force-dynamic";

type Search = { date?: string; court?: string; time?: string; booking?: string; member?: string };

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

  const court = sp.court ? courts.find((c) => c.id === Number(sp.court)) : undefined;
  const slotStart = court && sp.time?.match(/^\d{2}:\d{2}$/) ? new Date(`${date}T${sp.time}:00`) : null;
  const closeHref = `/staff/bookings?date=${date}`;
  const revenue = bookings.reduce((s, b) => s + b.price, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description={`${fmtDate(day)} · ${bookings.length} ${bookings.length === 1 ? "booking" : "bookings"} · ${inr(revenue)} in court fees`}
        action={
          <div className="flex items-center gap-1">
            <Link href={`/staff/bookings?date=${isoDate(addDays(day, -1))}`} aria-label="Previous day" className="grid size-10 place-items-center border border-line bg-paper hover:bg-cream">
              <ChevronLeft className="size-4" />
            </Link>
            <Link href="/staff/bookings" className="border border-line bg-paper px-4 py-2 text-[14px] font-semibold hover:bg-cream">
              Today
            </Link>
            <Link href={`/staff/bookings?date=${isoDate(addDays(day, 1))}`} aria-label="Next day" className="grid size-10 place-items-center border border-line bg-paper hover:bg-cream">
              <ChevronRight className="size-4" />
            </Link>
            <form className="ml-2">
              <input
                type="date"
                name="date"
                defaultValue={date}
                aria-label="Go to date"
                className="border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-forest"
              />
              <button type="submit" className="sr-only">
                Go
              </button>
            </form>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-3 bg-forest" /> Member</span>
        <span className="flex items-center gap-1.5"><span className="size-3 border border-[#e9bfa9] bg-clay-soft" /> Walk-in</span>
        <span className="flex items-center gap-1.5"><span className="size-3 border border-[#e3cd85] bg-[#f6e7b8]" /> Trial</span>
        <span className="flex items-center gap-1.5"><span className="size-3 border border-[#b9d97a] bg-[#e4f2bf]" /> Social play</span>
        <span>Click a free slot to book. Sessions are 1 hour, starting every 30 minutes.</span>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <BookingGrid
            day={day}
            now={now}
            courts={courts}
            selected={{ bookingId: selectedBooking?.id, courtId: court?.id, time: sp.time }}
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
        </div>

        <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
          <div className="border border-line bg-paper p-5">
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
                  </dl>
                )}

                {selectedBooking.type === "social" && <SocialRoster booking={selectedBooking} members={memberOptions} />}

                {selectedBooking.status === "booked" && sessionEnd(selectedBooking.start) > now && (
                  <form action={cancelBooking} className="border-t border-line pt-4">
                    <input type="hidden" name="bookingId" value={selectedBooking.id} />
                    <button type="submit" className="w-full border border-clay/50 px-4 py-2.5 text-[14.5px] font-semibold text-clay hover:bg-clay-soft">
                      Cancel booking{selectedBooking.price ? ` and refund ${inr(selectedBooking.price)}` : ""}
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
                  {preMember ? `Booking for ${preMember.name}. ` : ""}Hover the grid and click any free half-hour to start a booking. Click a booking to see details or cancel it.
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
