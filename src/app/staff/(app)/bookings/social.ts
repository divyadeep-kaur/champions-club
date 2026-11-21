"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { overlaps } from "@/lib/bookings";
import { MAX_BOOKINGS_PER_DAY } from "@/lib/constants";
import { courtPrice } from "@/lib/pricing";
import { requireStaff } from "@/lib/session";

export type RosterState = { error?: string; ok?: string };

const socialShare = (plan: { courtRate: number } | null, walkInRate: number) => Math.round(courtPrice(plan, walkInRate) / 4);

const joinSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  player: z.string().trim().min(2, "Enter a member code or the guest's name"),
  method: z.enum(["cash", "card", "upi"]).default("upi"),
});

export async function joinSocial(_: RosterState, formData: FormData): Promise<RosterState> {
  await requireStaff(["owner", "desk"]);
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { bookingId, player, method } = parsed.data;

  try {
    const result = await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { court: true, players: true } });
      if (!booking || booking.type !== "social" || booking.status !== "booked") throw new Error("This social session is not open");
      if (booking.end <= new Date()) throw new Error("This session has finished");

      const code = player.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
      const member = code ? await tx.member.findUnique({ where: { code }, include: { plan: true } }) : null;
      if (code && !member) throw new Error(`No member with code ${code}`);

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
      const name = member?.name ?? player;
      await tx.socialPlayer.create({ data: { bookingId, memberId: member?.id, name, status, price } });
      if (status === "confirmed" && price > 0) {
        await tx.payment.create({ data: { source: "court", refId: bookingId, amount: price, method, note: `Social play: ${name}` } });
      }
      return status === "confirmed" ? `${name} is in (${taken + 1} of ${booking.capacity})` : `Court is full, ${name} is on the waitlist`;
    });
    revalidatePath("/staff/bookings");
    return { ok: result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add the player" };
  }
}

async function offerNext(bookingId: number) {
  const next = await db.socialPlayer.findFirst({ where: { bookingId, status: "waitlist" }, orderBy: { createdAt: "asc" } });
  if (next) await db.socialPlayer.update({ where: { id: next.id }, data: { status: "offered" } });
}

export async function leaveSocial(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  const player = await db.socialPlayer.findUnique({ where: { id: Number(formData.get("playerId")) } });
  if (!player) return;
  await db.$transaction([
    db.socialPlayer.delete({ where: { id: player.id } }),
    ...(player.status === "confirmed" && player.price > 0
      ? [db.payment.create({ data: { source: "court", refId: player.bookingId, amount: -player.price, method: "cash", note: `Refund, social play: ${player.name}` } })]
      : []),
  ]);
  if (player.status !== "waitlist") await offerNext(player.bookingId);
  revalidatePath("/staff/bookings");
}

export async function answerOffer(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  const player = await db.socialPlayer.findUnique({ where: { id: Number(formData.get("playerId")) } });
  if (!player || player.status !== "offered") return;
  if (formData.get("answer") === "accept") {
    await db.$transaction([
      db.socialPlayer.update({ where: { id: player.id }, data: { status: "confirmed" } }),
      ...(player.price > 0
        ? [db.payment.create({ data: { source: "court", refId: player.bookingId, amount: player.price, method: "upi", note: `Social play: ${player.name}` } })]
        : []),
    ]);
  } else {
    await db.socialPlayer.delete({ where: { id: player.id } });
    await offerNext(player.bookingId);
  }
  revalidatePath("/staff/bookings");
}
