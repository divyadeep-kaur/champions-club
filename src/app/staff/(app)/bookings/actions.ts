"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { placeBooking } from "@/lib/bookingService";
import { normalizePhone } from "@/lib/members";
import { requireStaff } from "@/lib/session";
import { collectBooking, paidSoFar, refundMethod } from "@/lib/ledger";
import { refundable } from "@/lib/money";
import { collectPlayer } from "@/lib/socialService";

export type BookingState = { error?: string };

type Tx = Prisma.TransactionClient;

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
  minutes: z.coerce
    .number()
    .refine((m) => [30, 60, 90, 120].includes(m))
    .default(60),
});

export async function createBooking(_: BookingState, formData: FormData): Promise<BookingState> {
  await requireStaff(["owner", "desk"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the booking details and try again" };
  const f = parsed.data;

  const start = new Date(`${f.date}T${f.time}:00`);
  if (f.type === "social" && (start.getDay() !== 5 || start.getHours() < 18)) return { error: "Social play runs on Friday evenings from 6 pm" };

  let created = 0;
  try {
    created = await db.$transaction(async (tx) => {
      const isSocial = f.type === "social";
      const member = !isSocial && f.who === "member" ? await findMember(tx, f.member ?? "") : null;
      if (!isSocial && f.who === "member" && !member) throw new Error("Pick a member from the list");

      let guestPhone: string | null = null;
      if (!isSocial && f.who === "walkin") {
        if (!f.guestName || f.guestName.length < 2) throw new Error("Enter the walk-in's name");
        guestPhone = f.guestPhone ? normalizePhone(f.guestPhone) : null;
        if (f.guestPhone && !guestPhone) throw new Error("Enter a 10-digit mobile number or leave it blank");
      }

      const { booking } = await placeBooking(tx, {
        courtId: f.courtId,
        start,
        member,
        guestName: f.who === "walkin" ? f.guestName : null,
        guestPhone,
        type: f.type,
        capacity: f.capacity,
        method: f.method,
        minutes: f.minutes,
      });
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
  if (!booking || booking.status !== "booked" || booking.end <= new Date()) return;

  await db.$transaction(async (tx) => {
    const claimed = await tx.booking.updateMany({ where: { id, status: "booked" }, data: { status: "cancelled" } });
    if (!claimed.count) return;
    if (booking.type === "social") await tx.socialPlayer.deleteMany({ where: { bookingId: id } });
    const refund = refundable(await paidSoFar(tx, "court", id));
    if (refund > 0)
      await tx.payment.create({
        data: {
          source: "court",
          refId: id,
          amount: -refund,
          method: await refundMethod(tx, "court", id),
          note: `Refund for cancelled ${booking.court.name} booking`,
        },
      });
  });

  const d = booking.start;
  revalidatePath("/staff/bookings");
  revalidatePath("/staff");
  redirect(`/staff/bookings?date=${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}&booking=${id}`);
}

const collectSchema = z.object({
  bookingId: z.coerce.number().int().positive().optional(),
  playerId: z.coerce.number().int().positive().optional(),
  method: z.enum(["cash", "card", "upi"]),
  back: z.string().optional(),
});

export async function collectCourtPayment(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  const parsed = collectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || (!parsed.data.bookingId && !parsed.data.playerId)) return;
  const { bookingId, playerId, method } = parsed.data;
  try {
    await db.$transaction((tx) => (bookingId ? collectBooking(tx, bookingId, method) : collectPlayer(tx, playerId!, method)));
  } catch {
    return;
  }
  for (const p of ["/staff/bookings", "/staff", "/me", "/staff/money"]) revalidatePath(p);
  revalidatePath("/staff/money", "layout");
}
