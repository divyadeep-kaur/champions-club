import type { Member, Plan, Prisma } from "@prisma/client";
import { overlaps } from "./bookings";
import { MAX_BOOKINGS_PER_DAY } from "./constants";
import { courtPrice } from "./pricing";

type Tx = Prisma.TransactionClient;
type Payer = "cash" | "card" | "upi" | null;

export const socialShare = (plan: { courtRate: number } | null, walkInRate: number) => Math.round(courtPrice(plan, walkInRate) / 4);

const paymentNote = (name: string) => `Social play: ${name}`;

async function paidAmount(tx: Tx, bookingId: number, name: string) {
  const rows = await tx.payment.findMany({ where: { source: "court", refId: bookingId, note: { in: [paymentNote(name), `Refund, social play: ${name}`] } }, select: { amount: true } });
  return rows.reduce((s, r) => s + r.amount, 0);
}

export async function joinSession(tx: Tx, bookingId: number, who: { member: (Member & { plan: Plan }) | null; guestName?: string }, method: Payer) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { court: true, players: true } });
  if (!booking || booking.type !== "social" || booking.status !== "booked") throw new Error("This social session is not open");
  if (booking.end <= new Date()) throw new Error("This session has finished");
  const { member } = who;

  if (member) {
    const dayStart = new Date(booking.start.getFullYear(), booking.start.getMonth(), booking.start.getDate());
    if (member.endDate < dayStart) throw new Error(`${member.name}'s membership has expired`);
    if (booking.players.some((p) => p.memberId === member.id)) throw new Error(`${member.name} is already on this roster`);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const [own, social] = await Promise.all([
      tx.booking.findMany({ where: { memberId: member.id, status: "booked", start: { gte: dayStart, lt: dayEnd } } }),
      tx.socialPlayer.count({ where: { memberId: member.id, status: { in: ["confirmed", "offered"] }, booking: { status: "booked", start: { gte: dayStart, lt: dayEnd } } } }),
    ]);
    if (own.some((b) => overlaps(b, booking))) throw new Error(`${member.name} is already on another court at that time`);
    if (own.length + social >= MAX_BOOKINGS_PER_DAY) throw new Error("Members can play at most twice a day");
  }

  const taken = booking.players.filter((p) => p.status !== "waitlist").length;
  const status = taken < booking.capacity ? "confirmed" : "waitlist";
  const price = socialShare(member?.plan ?? null, booking.court.walkInRate);
  const name = member?.name ?? who.guestName ?? "Guest";
  await tx.socialPlayer.create({ data: { bookingId, memberId: member?.id, name, status, price } });
  if (status === "confirmed" && price > 0 && method) {
    await tx.payment.create({ data: { source: "court", refId: bookingId, amount: price, method, note: paymentNote(name) } });
  }
  return { status, name, position: taken + 1, capacity: booking.capacity, price };
}

async function offerNext(tx: Tx, bookingId: number) {
  const next = await tx.socialPlayer.findFirst({ where: { bookingId, status: "waitlist" }, orderBy: { createdAt: "asc" } });
  if (next) await tx.socialPlayer.update({ where: { id: next.id }, data: { status: "offered" } });
}

export async function leaveSession(tx: Tx, playerId: number) {
  const player = await tx.socialPlayer.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const paid = await paidAmount(tx, player.bookingId, player.name);
  await tx.socialPlayer.delete({ where: { id: player.id } });
  if (paid > 0) await tx.payment.create({ data: { source: "court", refId: player.bookingId, amount: -paid, method: "cash", note: `Refund, social play: ${player.name}` } });
  if (player.status !== "waitlist") await offerNext(tx, player.bookingId);
  return player;
}

export async function answerOffer(tx: Tx, playerId: number, accept: boolean, method: Payer) {
  const player = await tx.socialPlayer.findUnique({ where: { id: playerId } });
  if (!player || player.status !== "offered") return null;
  if (accept) {
    await tx.socialPlayer.update({ where: { id: player.id }, data: { status: "confirmed" } });
    if (player.price > 0 && method) await tx.payment.create({ data: { source: "court", refId: player.bookingId, amount: player.price, method, note: paymentNote(player.name) } });
  } else {
    await tx.socialPlayer.delete({ where: { id: player.id } });
    await offerNext(tx, player.bookingId);
  }
  return player;
}
