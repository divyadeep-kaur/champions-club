"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { placeBooking } from "@/lib/bookingService";
import { normalizePhone } from "@/lib/members";
import { clearMemberSession, createMemberSession, requireMember } from "@/lib/memberSession";
import { recomputeTab } from "@/lib/tabs";
import { answerOffer, joinSession, leaveSession } from "@/lib/socialService";

export type MeState = { error?: string; ok?: string };

function refreshCourts() {
  for (const p of ["/me", "/me/book", "/staff/bookings", "/staff", "/", "/courts"]) revalidatePath(p);
}

const loginSchema = z.object({
  phone: z.string().trim().min(1, "Enter your mobile number"),
  code: z.string().trim().min(1, "Enter your member code"),
  next: z.string().optional(),
});

export async function memberLogin(_: MeState, formData: FormData): Promise<MeState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhone(parsed.data.phone);
  const code = parsed.data.code.toUpperCase().replace(/^CC-?/, "CC-").replace(/^(\d+)$/, "CC-$1");
  const member = phone ? await db.member.findUnique({ where: { phone } }) : null;
  if (!member || member.code !== code) return { error: "That phone number and member code don't match. Ask at the front desk if you've lost your code." };

  await createMemberSession({ memberId: member.id, name: member.name });
  const next = parsed.data.next;
  redirect(next && next.startsWith("/me") && !next.startsWith("//") ? next : "/me");
}

export async function memberLogout() {
  await clearMemberSession();
  redirect("/me/login");
}

const bookSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function memberBook(_: MeState, formData: FormData): Promise<MeState> {
  const member = await requireMember();
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a court and a time" };
  const start = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (start.getTime() - Date.now() > 7 * 86_400_000) return { error: "You can book up to 7 days ahead" };

  try {
    await db.$transaction((tx) => placeBooking(tx, { courtId: parsed.data.courtId, start, member, type: "regular", method: "later" }));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not book that court" };
  }
  refreshCourts();
  redirect("/me?booked=1");
}

export async function memberCancel(formData: FormData) {
  const member = await requireMember();
  const booking = await db.booking.findUnique({ where: { id: Number(formData.get("bookingId")) } });
  if (!booking || booking.memberId !== member.id || booking.status !== "booked" || booking.start <= new Date()) return;
  const paid = await db.payment.aggregate({ where: { source: "court", refId: booking.id }, _sum: { amount: true } });
  const refund = paid._sum.amount ?? 0;
  await db.$transaction([
    db.booking.update({ where: { id: booking.id }, data: { status: "cancelled" } }),
    ...(refund > 0 ? [db.payment.create({ data: { source: "court", refId: booking.id, amount: -refund, method: "cash", note: "Refund, cancelled by member" } })] : []),
  ]);
  refreshCourts();
}

const orderSchema = z.object({
  items: z.string(),
  tableId: z.coerce.number().int().optional(),
});

export async function orderFood(_: MeState, formData: FormData): Promise<MeState> {
  const member = await requireMember();
  const parsed = orderSchema.safeParse({ items: formData.get("items"), tableId: formData.get("tableId") || undefined });
  if (!parsed.success) return { error: "Something went wrong, try again" };

  let lines: { id: number; qty: number }[];
  try {
    lines = z.array(z.object({ id: z.number().int(), qty: z.number().int().min(1).max(20) })).min(1).parse(JSON.parse(parsed.data.items));
  } catch {
    return { error: "Add something to your order first" };
  }

  const menu = await db.menuItem.findMany({ where: { id: { in: lines.map((l) => l.id) }, active: true } });
  if (menu.length !== lines.length) return { error: "Some items are no longer available" };
  const tab = await db.$transaction(async (tx) => {
    let open = await tx.tab.findFirst({ where: { memberId: member.id, status: "open" } });
    if (!open) {
      const shift = await tx.shift.findFirst({ where: { end: null }, orderBy: { start: "desc" } });
      open = await tx.tab.create({ data: { memberId: member.id, tableId: parsed.data.tableId, shiftId: shift?.id } });
    } else if (parsed.data.tableId && open.tableId !== parsed.data.tableId) {
      await tx.tab.update({ where: { id: open.id }, data: { tableId: parsed.data.tableId } });
    }
    await tx.tabItem.createMany({
      data: lines.map((l) => ({ tabId: open.id, menuItemId: l.id, qty: l.qty, unitPrice: menu.find((m) => m.id === l.id)!.price })),
    });
    return recomputeTab(tx, open.id);
  });
  if (!tab) return { error: "Could not update your tab" };

  for (const p of ["/me", "/me/cafe", "/staff/bar", "/staff/kitchen"]) revalidatePath(p);
  return { ok: `Sent to the kitchen. Your tab is now ₹${tab.total.toLocaleString("en-IN")}.` };
}

export async function memberJoinSocial(_: MeState, formData: FormData): Promise<MeState> {
  const member = await requireMember();
  try {
    const r = await db.$transaction((tx) => joinSession(tx, Number(formData.get("bookingId")), { member }, null));
    refreshCourts();
    return {
      ok:
        r.status === "confirmed"
          ? `You’re in, ${r.position} of ${r.capacity}.${r.price ? ` Pay ₹${r.price} at the desk.` : ""}`
          : "The court is full. You’re on the waitlist and we’ll offer you the next place.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not join" };
  }
}

export async function memberLeaveSocial(formData: FormData) {
  const member = await requireMember();
  const id = Number(formData.get("playerId"));
  const player = await db.socialPlayer.findUnique({ where: { id } });
  if (!player || player.memberId !== member.id) return;
  await db.$transaction((tx) => leaveSession(tx, id));
  refreshCourts();
}

export async function memberAnswerOffer(formData: FormData) {
  const member = await requireMember();
  const id = Number(formData.get("playerId"));
  const player = await db.socialPlayer.findUnique({ where: { id } });
  if (!player || player.memberId !== member.id) return;
  await db.$transaction((tx) => answerOffer(tx, id, formData.get("answer") === "accept", null));
  refreshCourts();
}
