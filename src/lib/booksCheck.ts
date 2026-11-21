import type { PrismaClient } from "@prisma/client";
import { invoiceTotals } from "./money";

export type BookIssue = { area: string; title: string; detail: string; amount: number; href: string };

const sumBy = (rows: { refId: number | null; _sum: { amount: number | null } }[]) => new Map(rows.map((r) => [r.refId, r._sum.amount ?? 0]));

export function compareRecord(expected: number, paid: number) {
  if (paid === expected) return null;
  return { gap: expected - paid, kind: paid > expected ? "over" : "under" } as const;
}

export async function booksCheck(db: PrismaClient, since = new Date(Date.now() - 60 * 86_400_000)): Promise<BookIssue[]> {
  const issues: BookIssue[] = [];
  const [tabs, orders, bookings, invoices, changes, products, payslips] = await Promise.all([
    db.tab.findMany({ where: { status: { in: ["paid", "void"] }, closedAt: { gte: since } }, include: { table: true, member: true } }),
    db.order.findMany({ where: { createdAt: { gte: since }, status: { in: ["completed", "cancelled"] } } }),
    db.booking.findMany({ where: { start: { gte: since }, type: "regular" }, include: { court: true, member: true } }),
    db.invoice.findMany({ where: { issuedAt: { gte: since } }, include: { lines: true } }),
    db.membershipChange.findMany({ where: { createdAt: { gte: since }, paymentStatus: "paid", paymentId: null }, include: { member: true } }),
    db.product.findMany({ where: { stock: { lt: 0 } } }),
    db.payslip.findMany({ where: { createdAt: { gte: since } }, include: { staff: true } }),
  ]);
  const [barPaid, shopPaid, courtPaid, invoicePaid] = await Promise.all([
    db.payment.groupBy({ by: ["refId"], where: { source: "bar", refId: { in: tabs.map((t) => t.id) } }, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["refId"], where: { source: "shop", refId: { in: orders.map((o) => o.id) } }, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["refId"], where: { source: "court", refId: { in: bookings.map((b) => b.id) } }, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["refId"], where: { source: "invoice", refId: { in: invoices.map((i) => i.id) } }, _sum: { amount: true } }),
  ]);
  const bar = sumBy(barPaid);
  const shop = sumBy(shopPaid);
  const court = sumBy(courtPaid);
  const inv = sumBy(invoicePaid);

  for (const t of tabs) {
    const expected = t.status === "paid" ? t.total : 0;
    const c = compareRecord(expected, bar.get(t.id) ?? 0);
    if (c)
      issues.push({
        area: "Café & bar",
        title: `${t.table?.label ?? "Counter"} tab #${t.id} ${t.status === "void" ? "was cleared but has money on it" : c.kind === "under" ? "was closed without full payment" : "was paid more than its total"}`,
        detail: `Tab total ${t.total}, payments ${bar.get(t.id) ?? 0}${t.member ? ` · ${t.member.name}` : ""}`,
        amount: c.gap,
        href: `/staff/bar?tab=${t.id}`,
      });
  }

  for (const o of orders) {
    const expected = o.status === "completed" ? o.total : 0;
    const c = compareRecord(expected, shop.get(o.id) ?? 0);
    if (c)
      issues.push({
        area: "Shop",
        title: `Order #${o.id} ${o.status === "cancelled" ? "was cancelled but still has money on it" : c.kind === "under" ? "was handed over without full payment" : "was paid more than its total"}`,
        detail: `${o.customerName} · total ${o.total}, payments ${shop.get(o.id) ?? 0}`,
        amount: c.gap,
        href: `/staff/shop?view=online`,
      });
  }

  for (const b of bookings) {
    const paid = court.get(b.id) ?? 0;
    const who = b.member?.name ?? b.guestName ?? "Walk-in";
    const date = `${b.start.getFullYear()}-${String(b.start.getMonth() + 1).padStart(2, "0")}-${String(b.start.getDate()).padStart(2, "0")}`;
    const href = `/staff/bookings?date=${date}&booking=${b.id}`;
    if (b.status === "cancelled" && paid !== 0)
      issues.push({
        area: "Courts",
        title: `Cancelled booking #${b.id} still has ${paid > 0 ? "money kept" : "an extra refund"}`,
        detail: `${b.court.name} · ${who}`,
        amount: -paid,
        href,
      });
    if (b.status === "booked" && paid > b.price)
      issues.push({
        area: "Courts",
        title: `Booking #${b.id} was paid more than its price`,
        detail: `${b.court.name} · ${who} · price ${b.price}, paid ${paid}`,
        amount: b.price - paid,
        href,
      });
    if (b.status === "booked" && b.paidAt && b.price > 0 && paid < b.price)
      issues.push({
        area: "Courts",
        title: `Booking #${b.id} is marked paid but money is missing`,
        detail: `${b.court.name} · ${who} · price ${b.price}, paid ${paid}`,
        amount: b.price - paid,
        href,
      });
  }

  for (const i of invoices) {
    const total = invoiceTotals(i.lines).total;
    const paid = inv.get(i.id) ?? 0;
    if (i.status === "paid" && paid !== total && !(paid === 0 && i.memberId))
      issues.push({
        area: "Invoices",
        title: `${i.number} is marked paid but the payment does not match`,
        detail: `${i.customerName} · total ${total}, payments ${paid}`,
        amount: total - paid,
        href: `/staff/money/invoices/${i.id}`,
      });
    if (i.status !== "paid" && paid > 0)
      issues.push({
        area: "Invoices",
        title: `${i.number} has a payment but is still open`,
        detail: `${i.customerName} · payments ${paid}`,
        amount: -paid,
        href: `/staff/money/invoices/${i.id}`,
      });
  }

  for (const c of changes)
    issues.push({
      area: "Memberships",
      title: `${c.member.name}: membership marked paid with no payment`,
      detail: `${c.kind} · ${c.amount}`,
      amount: c.amount,
      href: `/staff/members/${c.memberId}#history`,
    });

  for (const p of products)
    issues.push({
      area: "Shop",
      title: `${p.name} shows negative stock (${p.stock})`,
      detail: "Stock count is below zero",
      amount: 0,
      href: "/staff/shop?view=inventory",
    });

  for (const s of payslips)
    if (s.net > 0 && !s.expenseId)
      issues.push({
        area: "Payroll",
        title: `${s.staff.name}'s ${s.month} payslip has no salary bill`,
        detail: `Take-home ${s.net}`,
        amount: s.net,
        href: `/staff/money/payroll?month=${s.month}`,
      });

  return issues;
}
