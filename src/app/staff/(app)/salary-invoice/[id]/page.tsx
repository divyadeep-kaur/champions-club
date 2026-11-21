import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthLabel } from "@/lib/money";
import { deptLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { STAFF_INVOICE_KIND } from "@/lib/staffInvoices";
import { SlipBreakdown } from "@/components/staff/SlipBreakdown";
import { PrintButton } from "../../money/invoices/[id]/PrintButton";

export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function SalaryInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const inv = await db.staffInvoice.findUnique({ where: { id: Number((await params).id) }, include: { staff: true } });
  if (!inv || (session.role !== "owner" && inv.staffId !== session.id)) notFound();
  const [expense, slip] = await Promise.all([
    inv.expenseId ? db.expense.findUnique({ where: { id: inv.expenseId } }) : null,
    inv.payslipId ? db.payslip.findUnique({ where: { id: inv.payslipId } }) : null,
  ]);
  const s = inv.staff;
  const paid = !inv.expenseId || !!expense?.paidAt;

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={session.role === "owner" ? "/staff/money/staff-invoices" : "/staff/me"} className="font-semibold text-forest">
          ← Back
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto grid w-full max-w-[820px] gap-5 border border-line bg-paper p-6 sm:p-8 print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mark.png" alt="" width={52} height={52} unoptimized />
            <div>
              <p className="font-serif text-[22px] text-forest">The Champions Club</p>
              <p className="text-[13px] text-muted">Staff payment invoice</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[18px] font-bold">{inv.number}</p>
            <p className="text-[13.5px]">Issued {day(inv.issuedAt)}</p>
            <p className={`mt-1 inline-block px-2 py-0.5 text-[12.5px] font-bold ${paid ? "bg-[#e3f1c9] text-[#3d5a12]" : "bg-[#f6e7b8] text-[#7a5a06]"}`}>
              {paid ? `PAID${expense?.paidAt ? ` ${day(expense.paidAt)}${expense.method ? ` · ${expense.method.toUpperCase()}` : ""}` : ""}` : "DUE"}
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-[14px]">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-muted">Paid to</p>
            <p className="text-[16px] font-semibold">{s.name}</p>
            <p>
              {s.code} · {s.jobTitle}
            </p>
            <p className="text-muted">{deptLabel(s.department)}</p>
          </div>
          <div className="text-[14px] sm:text-right">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-muted">For</p>
            <p className="text-[16px] font-semibold">{STAFF_INVOICE_KIND[inv.kind]}</p>
            {inv.month && <p>{monthLabel(new Date(`${inv.month}-01T12:00:00`))}</p>}
            {expense && <p className="text-muted">Bill: {expense.description}</p>}
          </div>
        </div>

        {slip ? (
          <SlipBreakdown slip={slip} />
        ) : (
          <table className="w-full text-[14.5px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 text-left font-semibold">Description</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2.5">{inv.description}</td>
                <td className="py-2.5 text-right tabular-nums">{inr(inv.amount)}</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold">Total payable</td>
                <td className="py-2.5 text-right font-serif text-[20px] text-forest tabular-nums">{inr(inv.amount)}</td>
              </tr>
            </tbody>
          </table>
        )}

        <p className="border-t border-line pt-3 text-[12.5px] text-muted">
          {inv.kind === "advance"
            ? "This advance is recovered from the next salary run."
            : inv.kind === "claim"
              ? "Reimbursement against a bill given to the front desk. No tax deducted."
              : "Salary is paid by bank transfer on the last working day. PF, ESI and PT are paid to the government by the 15th of the next month."}
        </p>
      </article>
    </div>
  );
}
