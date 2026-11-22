"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { placeBooking } from "@/lib/bookingService";
import { DURATIONS, type Duration } from "@/lib/bookings";
import bcrypt from "bcryptjs";
import { nextMemberCode, normalizePhone } from "@/lib/members";
import { AWAITING_APPROVAL, SIGNUP_DECLINED, TRIAL_PLAN } from "@/lib/constants";
import { clearMemberSession, createMemberSession, requireMember } from "@/lib/memberSession";
import { recomputeTab } from "@/lib/tabs";
import { cafeShift } from "@/lib/cafe";
import { paidSoFar, refundMethod } from "@/lib/ledger";
import { refundable } from "@/lib/money";
import { answerOffer, joinSession, leaveSession } from "@/lib/socialService";

export type MeState = { error?: string; ok?: string };

function refreshCourts() {
  for (const p of ["/me", "/me/book", "/staff/bookings", "/staff", "/", "/courts"]) revalidatePath(p);
}

const cleanCode = (c: string) =>
  c
    .trim()
    .toUpperCase()
    .replace(/^CC-?/, "CC-")
    .replace(/^(\d+)$/, "CC-$1");

const loginSchema = z.object({
  phone: z.string().trim().min(1, "Enter your mobile number"),
  password: z.string().min(1, "Enter your password"),
  code: z.string().trim().min(1, "Enter your member code"),
  next: z.string().optional(),
});

export async function memberLogin(_: MeState, formData: FormData): Promise<MeState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhone(parsed.data.phone);
  const member = phone ? await db.member.findUnique({ where: { phone } }) : null;
  const wrong = { error: "That phone number, password and member code don't match. Ask at the front desk if you're stuck." };
  if (!member || member.code !== cleanCode(parsed.data.code)) return wrong;
  if (!member.passwordHash) return { error: "You haven't set a password yet. Tap Create account below and enter your member code to set one." };
  if (!(await bcrypt.compare(parsed.data.password, member.passwordHash))) return wrong;
  if (member.suspendReason === AWAITING_APPROVAL)
    return { error: `Hi ${member.name.split(" ")[0]}, your account is waiting for the front desk to approve it. Try again once it's approved.` };
  if (member.suspendReason === SIGNUP_DECLINED) return { error: "Your sign-up wasn't approved. Please talk to the front desk." };

  await createMemberSession({ memberId: member.id, name: member.name });
  const next = parsed.data.next;
  redirect(next && next.startsWith("/me") && !next.startsWith("//") ? next : "/me");
}

export type SignupState = { error?: string; code?: string; name?: string; claimed?: boolean; fields?: Record<string, string> };

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().min(1, "Enter your mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  password: z.string().min(6, "Use at least 6 characters for your password").max(72),
  confirm: z.string(),
  code: z.string().optional(),
});

export async function memberSignup(_: SignupState, formData: FormData): Promise<SignupState> {
  const fields = Object.fromEntries([...formData.entries()].filter(([k]) => k !== "password" && k !== "confirm")) as Record<string, string>;
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;
  if (f.password !== f.confirm) return { error: "The two passwords don't match", fields };
  const phone = normalizePhone(f.phone);
  if (!phone) return { error: "Enter a 10-digit Indian mobile number", fields };
  const passwordHash = await bcrypt.hash(f.password, 10);

  const existing = await db.member.findUnique({ where: { phone } });
  if (existing) {
    if (existing.passwordHash) return { error: "This number already has an account. Sign in instead.", fields };
    if (!f.code || cleanCode(f.code) !== existing.code)
      return { error: "This number is already a member. Enter the member code the front desk gave you to set your password.", fields };
    await db.member.update({ where: { id: existing.id }, data: { passwordHash } });
    return { code: existing.code, name: existing.name.split(" ")[0], claimed: true };
  }

  const trial = await db.plan.findUnique({ where: { name: TRIAL_PLAN } });
  if (!trial) return { error: "Sign-ups are closed right now. Please ask at the front desk.", fields };
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await db.member.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
    try {
      const m = await db.member.create({
        data: {
          code: nextMemberCode(last?.code ?? null),
          name: f.name,
          phone,
          email: f.email || null,
          passwordHash,
          planId: trial.id,
          startDate: now,
          endDate: now,
          suspendedAt: now,
          suspendReason: AWAITING_APPROVAL,
          notes: "Signed up in the member app",
        },
      });
      revalidatePath("/staff", "layout");
      return { code: m.code, name: m.name.split(" ")[0] };
    } catch {
      if (await db.member.findUnique({ where: { phone } })) return { error: "This number already has an account. Sign in instead.", fields };
    }
  }
  return { error: "Could not create your account, please try again", fields };
}

export async function memberLogout() {
  await clearMemberSession();
  redirect("/me/login");
}

const bookSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  minutes: z.coerce
    .number()
    .refine((m) => DURATIONS.includes(m as Duration), "Pick 30 minutes, 1 hour, 1½ hours or 2 hours")
    .default(60),
});

export async function memberBook(_: MeState, formData: FormData): Promise<MeState> {
  const member = await requireMember();
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick a court and a time" };
  const start = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (start.getTime() - Date.now() > 7 * 86_400_000) return { error: "You can book up to 7 days ahead" };

  try {
    await db.$transaction((tx) =>
      placeBooking(tx, { courtId: parsed.data.courtId, start, member, type: "regular", method: "later", minutes: parsed.data.minutes }),
    );
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
  await db.$transaction(async (tx) => {
    const claimed = await tx.booking.updateMany({ where: { id: booking.id, status: "booked" }, data: { status: "cancelled" } });
    if (!claimed.count) return;
    const refund = refundable(await paidSoFar(tx, "court", booking.id));
    if (refund > 0)
      await tx.payment.create({
        data: { source: "court", refId: booking.id, amount: -refund, method: await refundMethod(tx, "court", booking.id), note: "Refund, cancelled by member" },
      });
  });
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
    lines = z
      .array(z.object({ id: z.number().int(), qty: z.number().int().min(1).max(20) }))
      .min(1)
      .parse(JSON.parse(parsed.data.items));
  } catch {
    return { error: "Add something to your order first" };
  }

  const shift = await cafeShift();
  if (!shift) return { error: "The café is closed right now. You can order once the café team starts their shift." };
  const menu = await db.menuItem.findMany({ where: { id: { in: lines.map((l) => l.id) }, active: true } });
  if (menu.length !== lines.length) return { error: "Some items are no longer available" };
  const tab = await db.$transaction(async (tx) => {
    let open = await tx.tab.findFirst({ where: { memberId: member.id, status: "open" } });
    if (!open) {
      open = await tx.tab.create({ data: { memberId: member.id, tableId: parsed.data.tableId, shiftId: shift.id } });
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
