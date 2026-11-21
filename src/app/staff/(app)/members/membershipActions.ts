"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { juniorAgeError, normalizePhone } from "@/lib/members";
import { CHANGE_POLICIES, POLICY_SETTING, dayStart, extensionQuote, memberState, photoError, planChangeQuote, renewalQuote } from "@/lib/membership";
import { MembershipError, applyMembershipEvent, settlePendingPayment } from "@/lib/membershipService";
import { requireStaff } from "@/lib/session";

export type ActionState = { error?: string; ok?: string; at?: number; fields?: Record<string, string> };

const refresh = (id?: number) => {
  revalidatePath("/staff/members", "layout");
  if (id) revalidatePath(`/staff/members/${id}`);
  revalidatePath("/staff/money", "layout");
  revalidatePath("/staff");
};

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const toDate = (s: string) => new Date(`${s}T00:00:00`);
const policyKeys = CHANGE_POLICIES.map((p) => p.key) as [string, ...string[]];
const payment = {
  payNow: z.enum(["yes", "no"]).default("no"),
  method: z.union([z.literal(""), z.enum(["cash", "card", "upi"])]).optional(),
};
const reason = z.string().trim().min(3, "Give a reason, so the history makes sense later").max(300);

async function run(memberId: number, work: () => Promise<unknown>): Promise<ActionState> {
  try {
    await work();
  } catch (e) {
    if (e instanceof MembershipError) return { error: e.message };
    throw e;
  }
  refresh(memberId);
  return { ok: "Saved", at: Date.now() };
}

const changeSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  planId: z.coerce.number({ message: "Pick the new plan" }).int().positive("Pick the new plan"),
  effective: ymd,
  timing: z.enum(["keep", "restart"]),
  policy: z.enum(policyKeys, { message: "Choose how to price this change" }),
  customAmount: z.coerce.number().int("Whole rupees only").min(-100_000).max(100_000).optional(),
  reason,
  ...payment,
});

// Moves a member to another plan. The server recalculates everything from the
// database; only the owner's choices (plan, timing, policy, custom amount) come from the form.
export async function changePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireStaff(["owner"]);
  const parsed = changeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  const [member, next] = await Promise.all([
    db.member.findUnique({ where: { id: f.memberId }, include: { plan: true } }),
    db.plan.findUnique({ where: { id: f.planId } }),
  ]);
  if (!member || !next) return { error: "Member or plan not found" };
  if (next.id === member.planId) return { error: "That is their current plan. Use Renew or Extend instead." };
  if (!next.active) return { error: `${next.name} is closed to new sign-ups and plan changes` };
  const age = juniorAgeError(next.name, member.birthDate);
  if (age) return { error: age };
  const effective = toDate(f.effective);
  if (Math.abs(effective.getTime() - dayStart(new Date()).getTime()) > 31 * 86_400_000) return { error: "The effective date must be within a month of today" };
  if (f.policy === "custom" && f.customAmount === undefined) return { error: "Enter the custom amount" };

  const q = planChangeQuote({
    current: member.plan,
    next,
    startDate: member.startDate,
    endDate: member.endDate,
    effective,
    timing: f.timing,
    policy: f.policy as never,
    customAmount: f.customAmount,
  });
  return run(member.id, () =>
    db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: "change",
        toPlanId: next.id,
        newStart: q.newStart,
        newEnd: q.newEnd,
        effectiveDate: effective,
        policy: f.policy,
        amount: q.amount,
        payNow: f.payNow === "yes",
        method: f.method || null,
        reason: f.reason,
        staffId: owner.id,
      }),
    ),
  );
}

const renewSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  planId: z.coerce.number().int().positive("Pick a plan"),
  renewalDate: ymd,
  reason: z.string().trim().max(300).optional(),
  ...payment,
});

// Renews on the current or another eligible plan. The new period follows the club's
// existing rule, so renewing early never loses days.
export async function renewMembership(_: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireStaff(["owner"]);
  const parsed = renewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  const [member, plan] = await Promise.all([db.member.findUnique({ where: { id: f.memberId } }), db.plan.findUnique({ where: { id: f.planId } })]);
  if (!member || !plan) return { error: "Member or plan not found" };
  const age = juniorAgeError(plan.name, member.birthDate);
  if (age) return { error: age };
  if (member.suspendedAt) return { error: "Reactivate the membership before renewing it" };
  if (!plan.active && plan.id !== member.planId) return { error: `${plan.name} is closed. Members can only renew it if they are already on it` };
  const renewalDate = toDate(f.renewalDate);
  if (renewalDate > new Date(Date.now() + 31 * 86_400_000)) return { error: "The renewal date is too far ahead" };

  const q = renewalQuote(member.endDate, renewalDate, plan);
  return run(member.id, () =>
    db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: "renewal",
        toPlanId: plan.id,
        newStart: q.early ? member.startDate : q.newStart,
        newEnd: q.newEnd,
        effectiveDate: q.newStart,
        amount: q.amount,
        payNow: f.payNow === "yes",
        method: f.method || null,
        reason: f.reason || (plan.id === member.planId ? `Renewed ${plan.name}` : `Renewed on ${plan.name}`),
        staffId: owner.id,
      }),
    ),
  );
}

const extendSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  days: z.coerce.number().int().min(1, "Add at least one day").max(365, "Add a year or less"),
  amount: z.coerce.number().int().min(0).max(100_000).default(0),
  reason,
  ...payment,
});

// Adds days to the current expiry, for example to make up for a closed court.
export async function extendMembership(_: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireStaff(["owner"]);
  const parsed = extendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  const member = await db.member.findUnique({ where: { id: f.memberId } });
  if (!member) return { error: "Member not found" };
  const { newEnd } = extensionQuote(member.endDate, f.days);
  return run(member.id, () =>
    db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: "extension",
        newEnd,
        effectiveDate: dayStart(new Date()),
        amount: f.amount,
        payNow: f.payNow === "yes",
        method: f.method || null,
        reason: f.reason,
        staffId: owner.id,
      }),
    ),
  );
}

const suspendSchema = z.object({ memberId: z.coerce.number().int().positive(), action: z.enum(["suspend", "reactivate"]), reason });

// Suspension removes member prices and member bookings without touching the dates.
export async function setSuspension(_: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireStaff(["owner"]);
  const parsed = suspendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  const member = await db.member.findUnique({ where: { id: f.memberId } });
  if (!member) return { error: "Member not found" };
  if (f.action === "suspend" && member.suspendedAt) return { error: "Already suspended" };
  if (f.action === "reactivate" && !member.suspendedAt) return { error: "This membership isn't suspended" };
  const now = new Date();
  return run(member.id, () =>
    db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: f.action === "suspend" ? "suspension" : "reactivation",
        effectiveDate: now,
        amount: 0,
        payNow: false,
        reason: f.reason,
        staffId: owner.id,
        suspend: f.action === "suspend" ? { at: now, reason: f.reason } : "lift",
      }),
    ),
  );
}

const settleSchema = z.object({ changeId: z.coerce.number().int().positive(), method: z.enum(["cash", "card", "upi"], { message: "Choose how they paid" }) });

export async function settlePayment(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["owner"]);
  const parsed = settleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const change = await db.membershipChange.findUnique({ where: { id: parsed.data.changeId } });
  if (!change) return { error: "Record not found" };
  return run(change.memberId, () => db.$transaction((tx) => settlePendingPayment(tx, parsed.data)));
}

const profileSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "Enter the member's full name").max(80),
  phone: z.string().trim().min(1, "Enter a phone number"),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email")]),
  birthDate: z.union([z.literal(""), ymd]),
  notes: z.string().trim().max(300).optional(),
  removePhoto: z.string().optional(),
});

// Personal details only. Plan, dates and money change through the membership actions above.
export async function updateMemberProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["owner"]);
  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = profileSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;
  const member = await db.member.findUnique({ where: { id: f.memberId }, include: { plan: true } });
  if (!member) return { error: "Member not found", fields };
  const phone = normalizePhone(f.phone);
  if (!phone) return { error: "Enter a 10-digit Indian mobile number", fields };
  const clash = await db.member.findFirst({ where: { phone, id: { not: member.id } } });
  if (clash) return { error: `${clash.name} (${clash.code}) already uses this phone number`, fields };
  const birthDate = f.birthDate ? toDate(f.birthDate) : null;
  if (birthDate && birthDate > new Date()) return { error: "Enter a valid date of birth", fields };
  // Keep the Junior rule true for a current Junior membership.
  const age = memberState(member).state !== "expired" ? juniorAgeError(member.plan.name, birthDate) : null;
  if (age) return { error: `${age}. Change their plan first.`, fields };

  let photo: string | undefined;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const problem = photoError(file);
    if (problem) return { error: problem, fields };
    photo = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }

  await db.member.update({
    where: { id: member.id },
    data: {
      name: f.name,
      phone,
      email: f.email || null,
      birthDate,
      notes: f.notes || null,
      ...(photo ? { photo } : f.removePhoto ? { photo: null } : {}),
    },
  });
  refresh(member.id);
  redirect(`/staff/members/${member.id}?saved=1`);
}

const planSchema = z.object({
  planId: z.coerce.number().int().positive(),
  monthlyFee: z.coerce.number().int("Whole rupees only").min(0).max(1_000_000),
  courtRate: z.coerce.number().int("Whole rupees only").min(0).max(100_000),
  shopDiscount: z.coerce.number().int().min(0, "Discounts are 0 to 100%").max(100, "Discounts are 0 to 100%"),
  barDiscount: z.coerce.number().int().min(0, "Discounts are 0 to 100%").max(100, "Discounts are 0 to 100%"),
  durationDays: z.coerce.number().int().min(1, "At least one day").max(366, "A year or less"),
  description: z.string().trim().min(3, "Describe the plan").max(200),
});

// Plan prices and benefits. New prices apply to future renewals and changes;
// existing memberships keep their dates and past payments stay as they were.
export async function updatePlan(_: ActionState, formData: FormData): Promise<ActionState> {
  const owner = await requireStaff(["owner"]);
  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  const plan = await db.plan.findUnique({ where: { id: f.planId } });
  if (!plan) return { error: "Plan not found" };
  const labels: Record<string, string> = {
    monthlyFee: "Price",
    courtRate: "Court rate",
    shopDiscount: "Shop discount",
    barDiscount: "Café & bar discount",
    durationDays: "Duration",
    description: "Description",
  };
  const diffs = (Object.keys(labels) as (keyof typeof labels)[])
    .filter((k) => String(plan[k as keyof typeof plan]) !== String(f[k as keyof typeof f]))
    .map((k) => `${labels[k]}: ${plan[k as keyof typeof plan]} → ${f[k as keyof typeof f]}`);
  if (!diffs.length) return { error: "Nothing changed" };
  await db.$transaction([
    db.plan.update({
      where: { id: plan.id },
      data: {
        monthlyFee: f.monthlyFee,
        courtRate: f.courtRate,
        shopDiscount: f.shopDiscount,
        barDiscount: f.barDiscount,
        durationDays: f.durationDays,
        description: f.description,
      },
    }),
    db.planAudit.create({ data: { planId: plan.id, changes: diffs.join("; "), staffId: owner.id } }),
  ]);
  refresh();
  revalidatePath("/");
  return { ok: `${plan.name} updated`, at: Date.now() };
}

export async function setChangePolicy(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["owner"]);
  const parsed = z.object({ policy: z.enum(policyKeys, { message: "Pick a policy" }) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.clubSetting.upsert({
    where: { key: POLICY_SETTING },
    create: { key: POLICY_SETTING, value: parsed.data.policy },
    update: { value: parsed.data.policy },
  });
  refresh();
  return { ok: "Default saved", at: Date.now() };
}

export async function setPlanOpen(formData: FormData) {
  const owner = await requireStaff(["owner"]);
  const planId = Number(formData.get("planId"));
  const open = formData.get("open") === "1";
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || plan.active === open) return;
  await db.$transaction([
    db.plan.update({ where: { id: planId }, data: { active: open } }),
    db.planAudit.create({ data: { planId, changes: open ? "Reopened for sign-ups and plan changes" : "Closed to new sign-ups and plan changes", staffId: owner.id } }),
  ]);
  refresh();
  revalidatePath("/staff/members/new");
}
