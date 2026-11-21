"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { invoiceTotals, monthKey, monthLabel, monthRange, nextInvoiceNumber } from "@/lib/money";
import { payslip, statutoryDue } from "@/lib/payroll";
import { issueStaffInvoice } from "@/lib/staffInvoices";
import { requireStaff } from "@/lib/session";

export type MoneyState = { error?: string; ok?: string; at?: number };

const refresh = () => revalidatePath("/staff/money", "layout");

const expenseSchema = z.object({
  category: z.enum(["stock", "salary", "statutory", "claims", "rent", "utilities", "other"]),
  description: z.string().trim().min(2, "Describe the bill").max(120),
  vendor: z.string().trim().max(80).optional(),
  amount: z.coerce.number().int("Whole rupees only").min(1, "Enter the amount").max(10_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
  paidNow: z.string().optional(),
});

export async function addExpense(_: MoneyState, formData: FormData): Promise<MoneyState> {
  await requireStaff(["owner"]);
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  await db.expense.create({
    data: {
      category: f.category,
      description: f.description,
      vendor: f.vendor || null,
      amount: f.amount,
      dueDate: new Date(`${f.dueDate}T12:00:00`),
      ...(f.paidNow ? { paidAt: new Date(), method: "bank" } : {}),
    },
  });
  refresh();
  return { ok: "Bill added", at: Date.now() };
}

export async function payExpense(formData: FormData) {
  await requireStaff(["owner"]);
  const id = Number(formData.get("expenseId"));
  const method = String(formData.get("method") ?? "bank");
  await db.expense.updateMany({ where: { id, paidAt: null }, data: { paidAt: new Date(), method } });
  refresh();
  revalidatePath("/staff/me");
}

export async function payAllSalaries(formData: FormData) {
  await requireStaff(["owner"]);
  const slips = await db.payslip.findMany({ where: { month: String(formData.get("month") ?? "") }, select: { expenseId: true } });
  const ids = slips.map((x) => x.expenseId).filter((x): x is number => !!x);
  await db.expense.updateMany({ where: { id: { in: ids }, paidAt: null }, data: { paidAt: new Date(), method: "bank" } });
  refresh();
  revalidatePath("/staff/me");
}

export async function setSalary(formData: FormData) {
  await requireStaff(["owner"]);
  const staffId = Number(formData.get("staffId"));
  const amount = Math.max(0, Math.min(1_000_000, Math.round(Number(formData.get("amount")) || 0)));
  await db.staff.update({ where: { id: staffId }, data: { monthlySalary: amount } });
  refresh();
}

export async function runPayroll(formData: FormData) {
  await requireStaff(["owner"]);
  const month = String(formData.get("month") ?? "");
  const { from, to } = monthRange(month);
  const key = monthKey(from);
  const label = monthLabel(from);
  const due = new Date(from.getFullYear(), from.getMonth() + 1, 0, 12);
  const [staff, leaves] = await Promise.all([
    db.staff.findMany({ where: { monthlySalary: { gt: 0 }, active: true, joinedAt: { lt: to }, payslips: { none: { month: key } } } }),
    db.leaveRequest.findMany({ where: { status: "approved", from: { lt: to }, to: { gte: from } } }),
  ]);
  for (const s of staff) {
    const advances = await db.staffQuery.findMany({ where: { staffId: s.id, topic: "advance", status: "approved", recoveredMonth: null, createdAt: { lt: to } } });
    const slip = payslip(
      s.monthlySalary,
      advances.reduce((n, a) => n + (a.amount ?? 0), 0),
    );
    const leaveDays = leaves
      .filter((l) => l.staffId === s.id)
      .reduce((n, l) => n + Math.round((Math.min(l.to.getTime(), to.getTime() - 1) - Math.max(l.from.getTime(), from.getTime())) / 86_400_000) + 1, 0);
    await db.$transaction(async (tx) => {
      const expense =
        slip.net > 0
          ? await tx.expense.create({ data: { category: "salary", description: `Salary ${label} · ${s.name}`, vendor: s.name, amount: slip.net, dueDate: due } })
          : null;
      const created = await tx.payslip.create({
        data: {
          staffId: s.id,
          month: key,
          gross: slip.gross,
          basic: slip.basic,
          hra: slip.hra,
          allowance: slip.allowance,
          pf: slip.pf,
          esi: slip.esi,
          pt: slip.pt,
          advance: slip.advance,
          net: slip.net,
          employerPf: slip.employerPf,
          employerEsi: slip.employerEsi,
          leaveDays: Math.max(0, leaveDays),
          expenseId: expense?.id,
        },
      });
      await issueStaffInvoice(tx, {
        staffId: s.id,
        kind: "salary",
        month: key,
        payslipId: created.id,
        expenseId: expense?.id,
        amount: slip.net,
        description: `Salary for ${label}: gross ${slip.gross}, deductions ${slip.deductions}`,
      });
      if (advances.length) await tx.staffQuery.updateMany({ where: { id: { in: advances.map((a) => a.id) } }, data: { recoveredMonth: label } });
    });
  }

  const slips = await db.payslip.findMany({ where: { month: key } });
  const stat = statutoryDue(slips);
  const description = `PF, ESI and PT ${label}`;
  const existing = await db.expense.findFirst({ where: { category: "statutory", description } });
  if (!existing && stat.total > 0) {
    await db.expense.create({
      data: { category: "statutory", description, vendor: "EPFO / ESIC / Punjab PT", amount: stat.total, dueDate: new Date(from.getFullYear(), from.getMonth() + 1, 15, 12) },
    });
  } else if (existing && !existing.paidAt) {
    await db.expense.update({ where: { id: existing.id }, data: { amount: stat.total } });
  }
  refresh();
  revalidatePath("/staff/me");
}

const lineSchema = z.object({
  description: z.string().trim().min(1),
  qty: z.coerce.number().int().min(1).max(10_000),
  unitPrice: z.coerce.number().int().min(0).max(10_000_000),
  gstRate: z.coerce
    .number()
    .int()
    .refine((r) => [0, 5, 12, 18, 28].includes(r)),
});

export async function createInvoice(_: MoneyState, formData: FormData): Promise<MoneyState> {
  await requireStaff(["owner"]);
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (customerName.length < 2) return { error: "Enter who the invoice is for" };
  const gstin = String(formData.get("customerGstin") ?? "")
    .trim()
    .toUpperCase();
  if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) return { error: "That GSTIN doesn’t look right (15 characters)" };

  const lines = [0, 1, 2]
    .map((i) => ({ description: formData.get(`d${i}`), qty: formData.get(`q${i}`), unitPrice: formData.get(`p${i}`), gstRate: formData.get(`g${i}`) }))
    .filter((l) => String(l.description ?? "").trim())
    .map((l) => lineSchema.safeParse(l));
  if (lines.length === 0) return { error: "Add at least one line" };
  const bad = lines.find((l) => !l.success);
  if (bad) return { error: "Check each line: quantity, price and GST rate" };

  const dueDays = Math.max(0, Math.min(90, Number(formData.get("dueDays")) || 15));
  const year = new Date().getFullYear();
  const last = await db.invoice.findFirst({ where: { number: { startsWith: `INV-${year}-` } }, orderBy: { number: "desc" } });
  const invoice = await db.invoice.create({
    data: {
      number: nextInvoiceNumber(last?.number ?? null, year),
      customerName,
      customerGstin: gstin || null,
      customerAddress: String(formData.get("customerAddress") ?? "").trim() || null,
      dueAt: new Date(Date.now() + dueDays * 86_400_000),
      notes: String(formData.get("notes") ?? "").trim() || null,
      lines: { create: lines.map((l) => (l.success ? l.data : null)!).filter(Boolean) },
    },
  });
  refresh();
  redirect(`/staff/money/invoices/${invoice.id}`);
}

export async function invoiceMembership(formData: FormData) {
  await requireStaff(["owner"]);
  const member = await db.member.findUnique({ where: { id: Number(formData.get("memberId")) }, include: { plan: true } });
  if (!member) return;
  const payment = await db.payment.findFirst({ where: { source: "membership", refId: member.id }, orderBy: { createdAt: "desc" } });
  const year = new Date().getFullYear();
  const last = await db.invoice.findFirst({ where: { number: { startsWith: `INV-${year}-` } }, orderBy: { number: "desc" } });
  const amount = payment?.amount ?? member.plan.monthlyFee;
  const taxable = Math.round((amount * 100) / 118);
  const invoice = await db.invoice.create({
    data: {
      number: nextInvoiceNumber(last?.number ?? null, year),
      customerName: member.name,
      memberId: member.id,
      status: payment ? "paid" : "issued",
      paidAt: payment?.createdAt,
      dueAt: new Date(),
      notes: `Member ${member.code}. Prices include GST.`,
      lines: { create: [{ description: `${member.plan.name} membership, ${member.plan.durationDays} days`, qty: 1, unitPrice: taxable, gstRate: 18 }] },
    },
  });
  refresh();
  redirect(`/staff/money/invoices/${invoice.id}`);
}

export async function markInvoicePaid(formData: FormData) {
  await requireStaff(["owner"]);
  const id = Number(formData.get("invoiceId"));
  const method = String(formData.get("method") ?? "upi");
  const invoice = await db.invoice.findUnique({ where: { id }, include: { lines: true } });
  if (!invoice || invoice.status === "paid") return;
  if (!["cash", "card", "upi", "bank"].includes(method)) return;
  const t = invoiceTotals(invoice.lines);
  await db.$transaction(async (tx) => {
    const claimed = await tx.invoice.updateMany({ where: { id, status: { not: "paid" } }, data: { status: "paid", paidAt: new Date() } });
    if (!claimed.count) return;
    await tx.payment.create({ data: { source: "invoice", refId: invoice.id, amount: t.total, gst: t.gst, method, note: `Invoice ${invoice.number} · ${invoice.customerName}` } });
  });
  refresh();
  revalidatePath("/staff");
}
