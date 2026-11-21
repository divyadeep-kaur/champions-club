import { db } from "./db";
import { addDays, startOfDay, startOfMonth, startOfWeek } from "./dates";

export type Period = "today" | "week" | "month";

export const PERIODS: { key: Period; label: string; long: string }[] = [
  { key: "today", label: "Today", long: "today" },
  { key: "week", label: "This week", long: "this week" },
  { key: "month", label: "This month", long: "this month" },
];

export const SOURCE_LABEL: Record<string, string> = { court: "Courts", membership: "Memberships", shop: "Shop", bar: "Café & bar", invoice: "Invoices" };
export const METHOD_LABEL: Record<string, string> = { upi: "UPI", card: "Card", cash: "Cash", online: "Online" };

export function periodRange(period: Period, now = new Date()) {
  const from = period === "today" ? startOfDay(now) : period === "week" ? startOfWeek(now) : startOfMonth(now);
  return { from, to: addDays(startOfDay(now), 1) };
}

export const asPeriod = (p?: string): Period => (p === "week" || p === "month" ? p : "today");

export async function incomeSummary(period: Period, now = new Date()) {
  const { from, to } = periodRange(period, now);
  const where = { createdAt: { gte: from, lt: to } };
  const [bySource, byMethod] = await Promise.all([
    db.payment.groupBy({ by: ["source"], where, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["method"], where, _sum: { amount: true } }),
  ]);
  const total = bySource.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
  const share = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const sources = ["court", "membership", "shop", "bar", "invoice"].map((key) => {
    const amount = bySource.find((r) => r.source === key)?._sum.amount ?? 0;
    return { key, label: SOURCE_LABEL[key], amount, share: share(amount) };
  });
  const methods = byMethod
    .map((r) => ({ key: r.method, label: METHOD_LABEL[r.method] ?? r.method, amount: r._sum.amount ?? 0 }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((m) => ({ ...m, share: share(m.amount) }));
  return { total, sources, methods, from, to };
}
