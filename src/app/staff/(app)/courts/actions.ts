"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES } from "@/lib/constants";
import { DURATIONS, type Duration } from "@/lib/bookings";
import { requireStaff } from "@/lib/session";

export type CourtState = { error?: string; ok?: string; at?: number };

const refresh = () => {
  for (const p of ["/staff/courts", "/staff/bookings", "/staff", "/", "/courts", "/me/book", "/trial"]) revalidatePath(p);
};

const courtSchema = z.object({
  name: z.string().trim().min(2, "Give the court a name").max(40),
  sport: z.enum(["tennis", "cricket"], { message: "Choose tennis or cricket" }),
  walkInRate: z.coerce.number({ message: "Enter the walk-in rate" }).int().min(100, "Walk-in rate should be at least ₹100").max(10000, "That rate looks too high"),
});

export async function addCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const parsed = courtSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  if (await db.court.findUnique({ where: { name: parsed.data.name } })) return { error: "A court with that name already exists", at: Date.now() };
  await db.court.create({ data: parsed.data });
  refresh();
  return { ok: `${parsed.data.name} added. It is open for bookings now.`, at: Date.now() };
}

export async function updateCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const id = Number(formData.get("courtId"));
  const parsed = courtSchema.omit({ sport: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  const clash = await db.court.findUnique({ where: { name: parsed.data.name } });
  if (clash && clash.id !== id) return { error: "Another court already has that name", at: Date.now() };
  await db.court.update({ where: { id }, data: parsed.data });
  refresh();
  return { ok: "Saved. New bookings use the new rate; old bookings keep their price.", at: Date.now() };
}

export async function deleteCourt(_: CourtState, formData: FormData): Promise<CourtState> {
  await requireStaff(["owner"]);
  const id = Number(formData.get("courtId"));
  const used = await db.booking.count({ where: { courtId: id } });
  if (used) return { error: `This court has ${used} booking${used === 1 ? "" : "s"} in its history, so it can't be deleted. Block its slots instead.`, at: Date.now() };
  await db.court.deleteMany({ where: { id } });
  refresh();
  return { ok: "Court deleted", at: Date.now() };
}

const blockSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  minutes: z.coerce.number().refine((m) => DURATIONS.includes(m as Duration), "Pick a length"),
  reason: z.string().trim().max(60).optional(),
});

export async function blockSlot(_: CourtState, formData: FormData): Promise<CourtState> {
  const staff = await requireStaff(["owner"]);
  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, at: Date.now() };
  const { courtId, date, time, minutes } = parsed.data;
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + minutes * 60_000);
  const open = new Date(`${date}T${String(OPEN_HOUR).padStart(2, "0")}:00:00`);
  const close = new Date(`${date}T${String(CLOSE_HOUR).padStart(2, "0")}:00:00`);
  if (start.getMinutes() % SLOT_MINUTES) return { error: "Blocks start on the hour or half hour", at: Date.now() };
  if (start < open || end > close) return { error: `Courts are open ${OPEN_HOUR} am to ${CLOSE_HOUR - 12} pm`, at: Date.now() };
  if (end <= new Date()) return { error: "That time has already passed", at: Date.now() };

  try {
    await db.$transaction(async (tx) => {
      const clash = await tx.booking.findFirst({ where: { courtId, status: "booked", start: { lt: end }, end: { gt: start } } });
      if (clash) throw new Error("Part of that time is already booked. Cancel that booking first or pick another time.");
      await tx.booking.create({
        data: { courtId, start, end, type: "blocked", price: 0, paidAt: new Date(), guestName: `Blocked: ${parsed.data.reason || "court closed"} (${staff.name})` },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not block that time", at: Date.now() };
  }
  refresh();
  return { ok: "Blocked. Nobody can book that time now.", at: Date.now() };
}

export async function unblockSlot(formData: FormData) {
  await requireStaff(["owner"]);
  await db.booking.updateMany({ where: { id: Number(formData.get("bookingId")), type: "blocked", status: "booked" }, data: { status: "cancelled" } });
  refresh();
}
