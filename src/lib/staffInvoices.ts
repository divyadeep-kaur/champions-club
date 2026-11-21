import type { Prisma } from "@prisma/client";
import { nextInvoiceNumber } from "./money";

export const STAFF_INVOICE_KIND: Record<string, string> = { salary: "Salary", advance: "Salary advance", claim: "Expense claim" };

type Tx = Prisma.TransactionClient;

export async function issueStaffInvoice(
  tx: Tx,
  data: { staffId: number; kind: "salary" | "advance" | "claim"; description: string; amount: number; month?: string; payslipId?: number; queryId?: number; expenseId?: number | null; issuedAt?: Date },
) {
  const year = (data.issuedAt ?? new Date()).getFullYear();
  const last = await tx.staffInvoice.findFirst({ where: { number: { startsWith: `SAL-${year}-` } }, orderBy: { number: "desc" } });
  return tx.staffInvoice.create({ data: { ...data, expenseId: data.expenseId ?? null, number: nextInvoiceNumber(last?.number ?? null, year, "SAL") } });
}
