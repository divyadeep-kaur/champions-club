"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export type LeaveState = { error?: string; ok?: string; at?: number };

const schema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the first day"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the last day"),
  reason: z.string().trim().min(3, "Add a short reason").max(200),
});

export async function requestLeave(_: LeaveState, formData: FormData): Promise<LeaveState> {
  const staff = await requireStaff();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const from = new Date(`${parsed.data.from}T00:00:00`);
  const to = new Date(`${parsed.data.to}T00:00:00`);
  const today = new Date(new Date().toDateString());
  if (from < today) return { error: "Leave can’t start in the past" };
  if (to < from) return { error: "The last day is before the first day" };
  if ((to.getTime() - from.getTime()) / 86_400_000 > 30) return { error: "Ask for 30 days or fewer at a time" };
  const clash = await db.leaveRequest.findFirst({ where: { staffId: staff.id, status: { not: "rejected" }, from: { lte: to }, to: { gte: from } } });
  if (clash) return { error: "You already asked for leave on some of these days" };
  await db.leaveRequest.create({ data: { staffId: staff.id, from, to, reason: parsed.data.reason } });
  revalidatePath("/staff/leave");
  return { ok: "Sent to the owner", at: Date.now() };
}

export async function decideLeave(formData: FormData) {
  const owner = await requireStaff(["owner"]);
  const id = Number(formData.get("leaveId"));
  const decision = String(formData.get("decision"));
  if (!["approved", "rejected"].includes(decision)) return;
  await db.leaveRequest.updateMany({ where: { id, status: "pending" }, data: { status: decision, decidedById: owner.id, decidedAt: new Date() } });
  revalidatePath("/staff/leave");
  revalidatePath("/staff/money/payroll");
}
