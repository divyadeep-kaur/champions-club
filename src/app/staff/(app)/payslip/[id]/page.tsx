import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthLabel } from "@/lib/money";
import { deptLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { SlipBreakdown } from "@/components/staff/SlipBreakdown";
import { PrintButton } from "../../money/invoices/[id]/PrintButton";

export const dynamic = "force-dynamic";

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  const slip = await db.payslip.findUnique({ where: { id: Number((await params).id) }, include: { staff: true } });
  if (!slip || (session.role !== "owner" && slip.staffId !== session.id)) notFound();
  const [expense, invoice] = await Promise.all([
    slip.expenseId ? db.expense.findUnique({ where: { id: slip.expenseId } }) : null,
    db.staffInvoice.findUnique({ where: { payslipId: slip.id } }),
  ]);
  const month = monthLabel(new Date(`${slip.month}-01T12:00:00`));
  const s = slip.staff;

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={session.role === "owner" ? `/staff/team/${s.id}` : "/staff/me"} className="font-semibold text-forest">
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
              <p className="text-[13px] text-muted">Payslip for {month}</p>
            </div>
          </div>
          <div className="text-right text-[13.5px]">
            <p className="font-mono font-bold">{s.code}</p>
            {invoice && (
              <Link href={`/staff/salary-invoice/${invoice.id}`} className="block font-mono text-forest underline print:no-underline">
                {invoice.number}
              </Link>
            )}
            <p>{expense?.paidAt ? `Paid ${expense.paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} by bank` : "Payment due"}</p>
          </div>
        </header>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-4">
          <dt className="text-muted">Name</dt>
          <dd className="font-semibold">{s.name}</dd>
          <dt className="text-muted">Role</dt>
          <dd>{s.jobTitle}</dd>
          <dt className="text-muted">Department</dt>
          <dd>{deptLabel(s.department)}</dd>
          <dt className="text-muted">Joined</dt>
          <dd>{s.joinedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
          <dt className="text-muted">Paid days</dt>
          <dd>30</dd>
          <dt className="text-muted">Leave in month</dt>
          <dd>{slip.leaveDays} days</dd>
        </dl>
        <SlipBreakdown slip={slip} />
        <p className="border-t border-line pt-3 text-[12.5px] text-muted">
          PF is 12% of half the gross pay, capped at ₹1,800. ESI applies when gross pay is ₹21,000 or less. Professional tax is ₹200 a month above ₹2.5 lakh a year. Net pay{" "}
          {inr(slip.net)}.
        </p>
      </article>
    </div>
  );
}
