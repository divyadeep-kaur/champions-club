import type { Prisma } from "@prisma/client";
import { balanceDue } from "./money";

type Tx = Prisma.TransactionClient;

export async function paidSoFar(tx: Tx, source: string, refId: number) {
  const r = await tx.payment.aggregate({ where: { source, refId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

export async function refundMethod(tx: Tx, source: string, refId: number, note?: string) {
  const last = await tx.payment.findFirst({
    where: { source, refId, amount: { gt: 0 }, ...(note ? { note } : {}) },
    orderBy: { createdAt: "desc" },
    select: { method: true },
  });
  return last?.method ?? "cash";
}

export async function collectBooking(tx: Tx, bookingId: number, method: string) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { court: true, member: true } });
  if (!booking || booking.status !== "booked" || booking.type === "social") throw new Error("This booking can’t take a payment");
  const due = balanceDue(booking.price, await paidSoFar(tx, "court", booking.id));
  const claimed = await tx.booking.updateMany({ where: { id: booking.id, paidAt: null }, data: { paidAt: new Date() } });
  if (!claimed.count) throw new Error("Already paid");
  if (due > 0)
    await tx.payment.create({
      data: { source: "court", refId: booking.id, amount: due, method, note: `${booking.court.name} booking · ${booking.member?.name ?? booking.guestName ?? "Walk-in"} (paid at desk)` },
    });
  return due;
}

export async function courtDues(tx: Tx, before = new Date(Date.now() + 8 * 86_400_000)) {
  const [bookings, players] = await Promise.all([
    tx.booking.findMany({
      where: { status: "booked", type: "regular", price: { gt: 0 }, paidAt: null, start: { lt: before } },
      include: { court: true, member: true },
      orderBy: { start: "asc" },
    }),
    tx.socialPlayer.findMany({
      where: { status: "confirmed", price: { gt: 0 }, paidAt: null, booking: { status: "booked", start: { lt: before } } },
      include: { booking: { include: { court: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const paid = await tx.payment.groupBy({ by: ["refId"], where: { source: "court", refId: { in: bookings.map((b) => b.id) } }, _sum: { amount: true } });
  const paidFor = new Map(paid.map((p) => [p.refId, p._sum.amount ?? 0]));
  const courts = bookings.map((b) => ({ ...b, due: balanceDue(b.price, paidFor.get(b.id) ?? 0) })).filter((b) => b.due > 0);
  return { courts, players, total: courts.reduce((s, b) => s + b.due, 0) + players.reduce((s, p) => s + p.price, 0) };
}
