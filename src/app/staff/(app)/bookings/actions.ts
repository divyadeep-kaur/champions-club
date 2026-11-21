"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { bookingError, sessionEnd } from "@/lib/bookings";
import { normalizePhone } from "@/lib/members";
import { courtPrice } from "@/lib/pricing";
import { requireStaff } from "@/lib/session";

export type BookingState = { error?: string };

type Tx = Prisma.TransactionClient;

const dayRange = (d: Date) => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return { gte: start, lt: new Date(start.getTime() + 86_400_000) };
};

async function memberDayCount(tx: Tx, memberId: number, day: Date) {
  const range = dayRange(day);
  const [own, social] = await Promise.all([
    tx.booking.count({ where: { memberId, status: "booked", start: range } }),
    tx.socialPlayer.count({ where: { memberId, status: { in: ["confirmed", "offered"] }, booking: { status: "booked", start: range } } }),
  ]);
  return own + social;
}

async function findMember(tx: Tx, ref: string) {
  const code = ref.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  if (!code) return null;
  return tx.member.findUnique({ where: { code }, include: { plan: true } });
}

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  courtId: z.coerce.number().int().positive(),
  who: z.enum(["member", "walkin"]),
  type: z.enum(["regular", "trial", "social"]),
  member: z.string().optional(),
  guestName: z.string().trim().optional(),
  guestPhone: z.string().trim().optional(),
  method: z.enum(["cash", "card", "upi", "later"]).default("upi"),
  capacity: z.coerce.number().int().min(2).max(16).optional(),
});

export async function createBooking(_: BookingState, formData: FormData): Promise<BookingState> {
  await requireStaff(["owner", "desk"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the booking details and try again" };
  const f = parsed.data;

  const start = new Date(`${f.date}T${f.time}:00`);
  const end = sessionEnd(start);
  if (f.type === "social" && (start.getDay() !== 5 || start.getHours() < 18)) return { error: "Social play runs on Friday evenings from 6 pm" };

  let created = 0;
  try {
    created = await db.$transaction(async (tx) => {
      const court = await tx.court.findUnique({ where: { id: f.courtId } });
      if (!court) throw new Error("Court not found");

      const isSocial = f.type === "social";
      const member = !isSocial && f.who === "member" ? await findMember(tx, f.member ?? "") : null;
      if (!isSocial && f.who === "member" && !member) throw new Error("Pick a member from the list");

      let guestPhone: string | null = null;
      if (!isSocial && f.who === "walkin") {
        if (!f.guestName || f.guestName.length < 2) throw new Error("Enter the walk-in's name");
        guestPhone = f.guestPhone ? normalizePhone(f.guestPhone) : null;
        if (f.guestPhone && !guestPhone) throw new Error("Enter a 10-digit mobile number or leave it blank");
      }

      const existing = await tx.booking.findMany({
        where: { status: "booked", start: { lt: end }, end: { gt: start } },
        select: { courtId: true, memberId: true, start: true, end: true },
      });
      const error = bookingError(
        { courtId: court.id, start, end, now: new Date(), member: member ? { id: member.id, endDate: member.endDate } : null },
        { existing, memberBookingsThatDay: member ? await memberDayCount(tx, member.id, start) : 0 },
      );
      if (error) throw new Error(error);

      const price = isSocial || f.type === "trial" ? 0 : courtPrice(member?.plan ?? null, court.walkInRate);
      const booking = await tx.booking.create({
        data: {
          courtId: court.id,
          memberId: member?.id,
          guestName: isSocial ? "Social play" : f.who === "walkin" ? f.guestName : null,
          guestPhone,
          start,
          end,
          type: f.type,
          capacity: isSocial ? (f.capacity ?? 8) : 1,
          price,
        },
      });
      if (price > 0 && f.method !== "later") {
        await tx.payment.create({ data: { source: "court", refId: booking.id, amount: price, method: f.method, note: `${court.name} booking` } });
      }
      return booking.id;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the booking" };
  }

  revalidatePath("/staff/bookings");
  revalidatePath("/staff");
  redirect(`/staff/bookings?date=${f.date}&booking=${created}`);
}

export async function cancelBooking(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  const id = Number(formData.get("bookingId"));
  const booking = await db.booking.findUnique({ where: { id }, include: { court: true } });
  if (!booking || booking.status !== "booked") return;

  const paid = await db.payment.aggregate({ where: { source: "court", refId: id }, _sum: { amount: true } });
  const refund = paid._sum.amount ?? 0;
  await db.$transaction([
    db.booking.update({ where: { id }, data: { status: "cancelled" } }),
    ...(refund > 0
      ? [db.payment.create({ data: { source: "court", refId: id, amount: -refund, method: "cash", note: `Refund for cancelled ${booking.court.name} booking` } })]
      : []),
  ]);

  const d = booking.start;
  revalidatePath("/staff/bookings");
  revalidatePath("/staff");
  redirect(`/staff/bookings?date=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}&booking=${id}`);
}
