"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { juniorAgeError, nextMemberCode, normalizePhone, renewalPeriod } from "@/lib/members";
import { requireStaff } from "@/lib/session";

export type FormState = { error?: string; fields?: Record<string, string> };

const method = z.enum(["cash", "card", "upi"], { message: "Choose how they paid" });

const newMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's full name").max(80),
  phone: z.string().trim().min(1, "Enter a phone number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  birthDate: z.string().optional(),
  planId: z.coerce.number({ message: "Choose a plan" }).int().positive("Choose a plan"),
  method,
  notes: z.string().trim().max(300).optional(),
  leadId: z.string().optional(),
});

export async function createMember(_: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff(["owner", "desk"]);
  const fields = Object.fromEntries(formData) as Record<string, string>;
  const parsed = newMemberSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const data = parsed.data;

  const phone = normalizePhone(data.phone);
  if (!phone) return { error: "Enter a 10-digit Indian mobile number", fields };

  const plan = await db.plan.findUnique({ where: { id: data.planId } });
  if (!plan) return { error: "Choose a plan", fields };

  const birthDate = data.birthDate ? new Date(`${data.birthDate}T00:00:00`) : null;
  if (birthDate && (isNaN(birthDate.getTime()) || birthDate > new Date())) return { error: "Enter a valid date of birth", fields };
  const ageError = juniorAgeError(plan.name, birthDate);
  if (ageError) return { error: ageError, fields };

  const existing = await db.member.findUnique({ where: { phone } });
  if (existing) return { error: `${existing.name} (${existing.code}) already uses this phone number`, fields };

  const last = await db.member.findFirst({ orderBy: { id: "desc" }, select: { code: true } });
  const lead = data.leadId ? await db.lead.findUnique({ where: { id: Number(data.leadId) || 0 } }) : null;
  const fee = lead?.quoteAmount != null && lead.plan === plan.name ? lead.quoteAmount : plan.monthlyFee;
  const { start, end } = renewalPeriod(new Date(), new Date(), plan.durationDays);

  const member = await db.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: {
        code: nextMemberCode(last?.code ?? null),
        name: data.name,
        phone,
        email: data.email || null,
        birthDate,
        planId: plan.id,
        startDate: start,
        endDate: end,
        notes: data.notes || null,
      },
    });
    await tx.payment.create({
      data: { source: "membership", refId: m.id, amount: fee, method: data.method, note: `New ${plan.name} membership${lead ? " (from enquiry)" : ""}` },
    });
    if (lead && lead.status !== "won") {
      await tx.lead.update({ where: { id: lead.id }, data: { status: "won", memberId: m.id } });
      if (lead.bookingId) await tx.booking.update({ where: { id: lead.bookingId }, data: { memberId: m.id, guestName: null } });
      await tx.leadActivity.create({ data: { leadId: lead.id, kind: "joined", text: `Joined as a ${plan.name} member (${m.code})`, staffName: staff.name } });
    }
    return m;
  });

  revalidatePath("/staff/members");
  redirect(`/staff/members/${member.id}?welcome=1`);
}

const renewSchema = z.object({ memberId: z.coerce.number().int().positive(), planId: z.coerce.number().int().positive(), method });

export async function renewMember(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff(["owner", "desk"]);
  const parsed = renewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { memberId, planId, method: payMethod } = parsed.data;

  const [member, plan] = await Promise.all([db.member.findUnique({ where: { id: memberId } }), db.plan.findUnique({ where: { id: planId } })]);
  if (!member || !plan) return { error: "Member or plan not found" };

  const ageError = juniorAgeError(plan.name, member.birthDate);
  if (ageError) return { error: ageError };

  const today = new Date();
  const { start, end } = renewalPeriod(member.endDate, today, plan.durationDays);
  const expired = member.endDate < today;

  await db.$transaction([
    db.member.update({ where: { id: member.id }, data: { planId: plan.id, endDate: end, ...(expired ? { startDate: start } : {}) } }),
    db.payment.create({ data: { source: "membership", refId: member.id, amount: plan.monthlyFee, method: payMethod, note: `Renewed ${plan.name}` } }),
  ]);

  revalidatePath(`/staff/members/${member.id}`);
  revalidatePath("/staff/members");
  return {};
}
