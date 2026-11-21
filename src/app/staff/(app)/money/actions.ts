"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { monthLabel, monthRange, nextInvoiceNumber } from "@/lib/money";
import { requireStaff } from "@/lib/session";

export type MoneyState = { error?: string; ok?: string; at?: number };

const refresh = () => revalidatePath("/staff/money", "layout");

const expenseSchema = z.object({
  category: z.enum(["stock", "salary", "rent", "utilities", "other"]),
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
  const { from } = monthRange(month);
  const label = monthLabel(from);
  const due = new Date(from.getFullYear(), from.getMonth() + 1, 0, 12);
  const staff = await db.staff.findMany({ where: { monthlySalary: { gt: 0 } } });
  for (const s of staff) {
    const description = `Salary ${label} · ${s.name}`;
    const exists = await db.expense.findFirst({ where: { category: "salary", description } });
    if (!exists) await db.expense.create({ data: { category: "salary", description, vendor: s.name, amount: s.monthlySalary, dueDate: due } });
  }
  refresh();
}

const lineSchema = z.object({ description: z.string().trim().min(1), qty: z.coerce.number().int().min(1).max(10_000), unitPrice: z.coerce.number().int().min(0).max(10_000_000), gstRate: z.coerce.number().int().refine((r) => [0, 5, 12, 18, 28].includes(r)) });

export async function createInvoice(_: MoneyState, formData: FormData): Promise<MoneyState> {
  await requireStaff(["owner"]);
  const customerName = String(formData.get("customerName") ?? "").trim();
  if (customerName.length < 2) return { error: "Enter who the invoice is for" };
  const gstin = String(formData.get("customerGstin") ?? "").trim().toUpperCase();
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
  const total = invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice + Math.round((l.qty * l.unitPrice * l.gstRate) / 100), 0);
  await db.$transaction([
    db.invoice.update({ where: { id }, data: { status: "paid", paidAt: new Date() } }),
    db.payment.create({ data: { source: "membership", amount: total, method, note: `Invoice ${invoice.number} · ${invoice.customerName}` } }),
  ]);
  refresh();
  revalidatePath("/staff");
}
