"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { MONEY_TOPICS, QUERY_TOPICS, topicLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { issueStaffInvoice } from "@/lib/staffInvoices";

export type QueryState = { error?: string; ok?: string; at?: number };

const refresh = () => {
  revalidatePath("/staff/queries");
  revalidatePath("/staff/me");
  revalidatePath("/staff/team", "layout");
  revalidatePath("/staff/money", "layout");
};

const askSchema = z.object({
  topic: z.enum(QUERY_TOPICS.map((t) => t.key) as [string, ...string[]]),
  subject: z.string().trim().min(3, "Add a short subject").max(80),
  message: z.string().trim().min(5, "Tell the owner a little more").max(600),
  amount: z.string().optional(),
});

export async function askQuery(_: QueryState, formData: FormData): Promise<QueryState> {
  const session = await requireStaff();
  const parsed = askSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { topic, subject, message } = parsed.data;

  let amount: number | null = null;
  if (MONEY_TOPICS.includes(topic)) {
    amount = Math.round(Number(parsed.data.amount));
    if (!Number.isFinite(amount) || amount < 1) return { error: "Enter the amount in rupees" };
    const me = await db.staff.findUnique({ where: { id: session.id } });
    if (topic === "advance") {
      const cap = Math.floor((me?.monthlySalary ?? 0) / 2);
      if (amount > cap) return { error: `An advance can be at most half your monthly salary (₹${cap.toLocaleString("en-IN")})` };
      const pending = await db.staffQuery.count({ where: { staffId: session.id, topic: "advance", OR: [{ status: "open" }, { status: "approved", recoveredMonth: null }] } });
      if (pending) return { error: "You already have an advance that hasn’t been paid back yet" };
    }
    if (topic === "claim" && amount > 50000) return { error: "Claims over ₹50,000 need a bill to the owner directly" };
  }

  await db.staffQuery.create({ data: { staffId: session.id, topic, subject, message, amount } });
  refresh();
  return { ok: "Sent to the owner. You’ll see the reply here.", at: Date.now() };
}

export async function answerQuery(formData: FormData) {
  const session = await requireStaff(["owner"]);
  const id = Number(formData.get("queryId"));
  const decision = String(formData.get("decision"));
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 600);
  const q = await db.staffQuery.findUnique({ where: { id }, include: { staff: true } });
  if (!q || q.status !== "open") return;

  const base = { repliedById: session.id, repliedAt: new Date() };
  if (decision === "approve" && MONEY_TOPICS.includes(q.topic) && q.amount) {
    await db.$transaction(async (tx) => {
      const claimed = await tx.staffQuery.updateMany({ where: { id, status: "open" }, data: { status: "approved", reply: reply || "Approved.", ...base } });
      if (!claimed.count) return;
      const expense = await tx.expense.create({
        data:
          q.topic === "advance"
            ? { category: "salary", description: `Salary advance · ${q.staff.name}`, vendor: q.staff.name, amount: q.amount!, dueDate: new Date() }
            : { category: "claims", description: `Claim: ${q.subject} · ${q.staff.name}`, vendor: q.staff.name, amount: q.amount!, dueDate: new Date() },
      });
      await tx.staffQuery.update({ where: { id }, data: { expenseId: expense.id } });
      await issueStaffInvoice(tx, {
        staffId: q.staffId,
        kind: q.topic === "advance" ? "advance" : "claim",
        queryId: id,
        expenseId: expense.id,
        amount: q.amount!,
        description: q.topic === "advance" ? `Salary advance: ${q.subject}` : `Expense claim: ${q.subject}`,
      });
    });
  } else if (decision === "decline") {
    await db.staffQuery.updateMany({ where: { id, status: "open" }, data: { status: "declined", reply: reply || `${topicLabel(q.topic)} declined.`, ...base } });
  } else if (reply) {
    await db.staffQuery.updateMany({ where: { id, status: "open" }, data: { status: "answered", reply, ...base } });
  }
  refresh();
}
