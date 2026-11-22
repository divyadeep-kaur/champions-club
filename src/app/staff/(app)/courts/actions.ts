"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { SLOT_MINUTES, SPORTS, CLOSE_HOUR, OPEN_HOUR } from "@/lib/constants";
import { BLOCKED } from "@/lib/courtSlots";
import { paidSoFar, refundMethod } from "@/lib/ledger";
import { refundable } from "@/lib/money";

export type CourtState = { error?: string; ok?: string; at?: number };

function refresh() {
  for (const p of ["/staff/courts", "/staff/bookings", "/staff", "/courts", "/", "/me/book", "/me"]) revalidatePath(p);
}

const courtSchema = z.object({
  name: z.string().trim().min(2, "Give the court a name").max(40, "Keep the name under 40 characters"),
  sport: z.enum(SPORTS),
  walkInRate: z.coerce.number().int().min(0, "Rate can't be negative").max(100_000, "That rate looks too high"),
});

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Check the details and try again";
const isDuplicate = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function addCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const parsed = courtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), at: Date.now() };
  let id = 0;
  try {
    id = (await db.court.create({ data: parsed.data })).id;
  } catch (e) {
    return { error: isDuplicate(e) ? "A court with that name already exists" : "Could not add the court", at: Date.now() };
  }
  refresh();
  redirect(`/staff/courts?court=${id}`);
}

export async function updateCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const id = Number(formData.get("courtId")) || 0;
  const parsed = courtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error), at: Date.now() };
  try {
    await db.court.update({ where: { id }, data: parsed.data });
  } catch (e) {
    return { error: isDuplicate(e) ? "A court with that name already exists" : "Could not save the court", at: Date.now() };
  }
  refresh();
  return { ok: "Saved. New rates apply to new bookings only.", at: Date.now() };
}

export async function deleteCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const id = Number(formData.get("courtId")) || 0;
  const history = await db.booking.count({ where: { courtId: id, type: { not: BLOCKED } } });
  if (history > 0)
    return {
      error: `This court has ${history} booking${history === 1 ? "" : "s"} on record, so it can't be deleted without losing payment history. Block its slots instead.`,
      at: Date.now(),
    };
  try {
    await db.$transaction([db.booking.deleteMany({ where: { courtId: id, type: BLOCKED } }), db.court.delete({ where: { id } })]);
  } catch {
    return { error: "Could not delete the court", at: Date.now() };
  }
  refresh();
  redirect("/staff/courts");
}

const blockSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(60).optional(),
});

export async function blockSlots(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a court and day first", at: Date.now() };
  const { courtId, date } = parsed.data;
  const reason = parsed.data.reason || "Blocked";
  const times = [...new Set(formData.getAll("slot").map(String))].filter((t) => /^\d{2}:\d{2}$/.test(t)).sort();
  if (times.length === 0) return { error: "Tick at least one free slot to block", at: Date.now() };

  const now = new Date();
  let blocked = 0;
  let skipped = 0;
  await db.$transaction(async (tx) => {
    for (const t of times) {
      const start = new Date(`${date}T${t}:00`);
      const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
      const inHours = start.getHours() >= OPEN_HOUR && end <= new Date(start.getFullYear(), start.getMonth(), start.getDate(), CLOSE_HOUR, 0);
      const clash = await tx.booking.count({ where: { courtId, status: "booked", start: { lt: end }, end: { gt: start } } });
      if (!inHours || end <= now || clash > 0 || start.getMinutes() % SLOT_MINUTES !== 0) {
        skipped++;
        continue;
      }
      await tx.booking.create({
        data: { courtId, start, end, type: BLOCKED, guestName: reason, price: 0, capacity: 1, paidAt: now },
      });
      blocked++;
    }
  });
  refresh();
  if (blocked === 0) return { error: "Those slots were booked or already passed, so nothing was blocked", at: Date.now() };
  return {
    ok: `Blocked ${blocked} slot${blocked === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped: already taken or passed)` : ""}`,
    at: Date.now(),
  };
}

export async function unblockSlot(formData: FormData) {
  await requireStaff(["owner"]);
  const id = Number(formData.get("bookingId")) || 0;
  await db.booking.deleteMany({ where: { id, type: BLOCKED } });
  refresh();
}

export async function unblockDay(formData: FormData) {
  await requireStaff(["owner"]);
  const courtId = Number(formData.get("courtId")) || 0;
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const day = new Date(`${date}T00:00:00`);
  await db.booking.deleteMany({ where: { courtId, type: BLOCKED, start: { gte: day, lt: new Date(day.getTime() + 86_400_000) } } });
  refresh();
}

// Same rules as cancelling from the Bookings page: only upcoming bookings,
// and anything already paid is refunded by the original method.
export async function cancelSlotBooking(formData: FormData) {
  await requireStaff(["owner"]);
  const id = Number(formData.get("bookingId")) || 0;
  const booking = await db.booking.findUnique({ where: { id }, include: { court: true } });
  if (!booking || booking.status !== "booked" || booking.type === BLOCKED || booking.end <= new Date()) return;

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
  refresh();
  revalidatePath("/staff/money", "layout");
}
