import { db } from "./db";
import { cashCloseSummary } from "./money";

export async function daySummary(day: string, counted?: number) {
  const from = new Date(`${day}T00:00:00`);
  const to = new Date(from.getTime() + 86_400_000);
  const [payments, paidOut] = await Promise.all([
    db.payment.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { method: true, amount: true, source: true } }),
    db.expense.findMany({ where: { paidAt: { gte: from, lt: to } }, select: { method: true, amount: true, description: true, category: true } }),
  ]);
  return { payments, paidOut, ...cashCloseSummary(payments, paidOut, counted) };
}
