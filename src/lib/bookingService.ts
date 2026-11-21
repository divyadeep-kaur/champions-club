import type { Member, Plan, Prisma } from "@prisma/client";
import { bookingError, sessionEnd } from "./bookings";
import { courtPrice } from "./pricing";

type Tx = Prisma.TransactionClient;

export const dayRange = (d: Date) => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
};

export async function memberDayCount(tx: Tx, memberId: number, day: Date) {
  const range = dayRange(day);
  const [own, social] = await Promise.all([
    tx.booking.count({ where: { memberId, status: "booked", start: range } }),
    tx.socialPlayer.count({ where: { memberId, status: { in: ["confirmed", "offered"] }, booking: { status: "booked", start: range } } }),
  ]);
  return own + social;
}

export async function placeBooking(
  tx: Tx,
  req: {
    courtId: number;
    start: Date;
    member: (Member & { plan: Plan }) | null;
    guestName?: string | null;
    guestPhone?: string | null;
    type: "regular" | "trial" | "social";
    capacity?: number;
    method: "cash" | "card" | "upi" | "later";
  },
) {
  const court = await tx.court.findUnique({ where: { id: req.courtId } });
  if (!court) throw new Error("Court not found");
  const end = sessionEnd(req.start);

  const existing = await tx.booking.findMany({
    where: { status: "booked", start: { lt: end }, end: { gt: req.start } },
    select: { courtId: true, memberId: true, start: true, end: true },
  });
  const error = bookingError(
    { courtId: court.id, start: req.start, end, now: new Date(), member: req.member ? { id: req.member.id, endDate: req.member.endDate } : null },
    { existing, memberBookingsThatDay: req.member ? await memberDayCount(tx, req.member.id, req.start) : 0 },
  );
  if (error) throw new Error(error);

  const social = req.type === "social";
  const price = social || req.type === "trial" ? 0 : courtPrice(req.member?.plan ?? null, court.walkInRate);
  const booking = await tx.booking.create({
    data: {
      courtId: court.id,
      memberId: req.member?.id,
      guestName: social ? "Social play" : req.member ? null : req.guestName,
      guestPhone: req.guestPhone ?? null,
      start: req.start,
      end,
      type: req.type,
      capacity: social ? (req.capacity ?? 8) : 1,
      price,
    },
  });
  if (price > 0 && req.method !== "later") {
    await tx.payment.create({ data: { source: "court", refId: booking.id, amount: price, method: req.method, note: `${court.name} booking` } });
  }
  return { booking, court };
}
