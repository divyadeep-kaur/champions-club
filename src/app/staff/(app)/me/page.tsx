import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthLabel } from "@/lib/money";
import { payslip, topicLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { STAFF_INVOICE_KIND } from "@/lib/staffInvoices";
import { SlipBreakdown } from "@/components/staff/SlipBreakdown";
import { StaffIdCard } from "@/components/staff/StaffIdCard";
import { Badge } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

const monthName = (key: string) => monthLabel(new Date(`${key}-01T12:00:00`));

export default async function MyPay() {
  const session = await requireStaff();
  const [me, slips, queries, leaves, advances, invoices] = await Promise.all([
    db.staff.findUnique({ where: { id: session.id } }),
    db.payslip.findMany({ where: { staffId: session.id }, orderBy: { month: "desc" }, take: 12 }),
    db.staffQuery.findMany({ where: { staffId: session.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.leaveRequest.findMany({ where: { staffId: session.id, status: "approved", from: { gte: new Date(new Date().getFullYear(), 0, 1) } } }),
    db.staffQuery.findMany({ where: { staffId: session.id, topic: "advance", status: "approved", recoveredMonth: null } }),
    db.staffInvoice.findMany({ where: { staffId: session.id }, orderBy: [{ issuedAt: "desc" }, { number: "desc" }], take: 12 }),
  ]);
  if (!me) return null;
  const owed = advances.reduce((s, a) => s + (a.amount ?? 0), 0);
  const preview = payslip(me.monthlySalary, owed);
  const paidIds = [...slips, ...invoices].map((s) => s.expenseId).filter((x): x is number => !!x);
  const paid = new Map((await db.expense.findMany({ where: { id: { in: paidIds } } })).map((e) => [e.id, e.paidAt]));
  const yearKey = String(new Date().getFullYear());
  const ytd = slips.filter((s) => s.month.startsWith(yearKey));
  const leaveDays = leaves.reduce((n, l) => n + Math.round((l.to.getTime() - l.from.getTime()) / 86_400_000) + 1, 0);

  return (
    <div className="grid content-start gap-5">
      <div>
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">My pay</h1>
        <p className="mt-1.5 text-muted">Your staff ID, salary, payslips and questions to the owner.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <StaffIdCard staff={me} />
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-line bg-paper p-4">
              <p className="text-[13px] text-muted">Take-home {yearKey}</p>
              <p className="font-serif text-[22px] text-forest tabular-nums">{inr(ytd.reduce((s, x) => s + x.net, 0))}</p>
            </div>
            <div className="border border-line bg-paper p-4">
              <p className="text-[13px] text-muted">PF saved {yearKey}</p>
              <p className="font-serif text-[22px] text-forest tabular-nums">{inr(ytd.reduce((s, x) => s + x.pf + x.employerPf, 0))}</p>
            </div>
            <div className="border border-line bg-paper p-4">
              <p className="text-[13px] text-muted">Leave taken {yearKey}</p>
              <p className="font-serif text-[22px] text-forest tabular-nums">{leaveDays} days</p>
            </div>
            <div className="border border-line bg-paper p-4">
              <p className="text-[13px] text-muted">Advance to repay</p>
              <p className={`font-serif text-[22px] tabular-nums ${owed ? "text-clay" : "text-forest"}`}>{inr(owed)}</p>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-4">
          <section className="border border-line bg-paper p-5">
            <h2 className="mb-3 text-[18px] font-semibold">This month’s salary</h2>
            {me.monthlySalary > 0 ? <SlipBreakdown slip={preview} /> : <p className="text-muted">No salary is set for your account.</p>}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">Payslips</h2>
            {slips.length === 0 && <p className="text-muted">Your first payslip appears after payroll runs at the end of the month.</p>}
            {slips.map((s) => {
              const paidAt = s.expenseId ? paid.get(s.expenseId) : null;
              return (
                <Link key={s.id} href={`/staff/payslip/${s.id}`} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
                  <span className="font-semibold">{monthName(s.month)}</span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{inr(s.net)}</span>
                    {paidAt ? <Badge tone="green">Paid</Badge> : <Badge tone="gold">Due</Badge>}
                    <span aria-hidden className="text-forest">
                      →
                    </span>
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">My invoices</h2>
            {invoices.length === 0 && <p className="text-muted">No invoices yet.</p>}
            {invoices.map((i) => {
              const paidAt = i.expenseId ? paid.get(i.expenseId) : null;
              return (
                <Link key={i.id} href={`/staff/salary-invoice/${i.id}`} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
                  <span>
                    <span className="font-mono font-semibold">{i.number}</span>
                    <span className="block text-[13px] text-muted">
                      {STAFF_INVOICE_KIND[i.kind]}
                      {i.month ? ` · ${monthName(i.month)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums">{inr(i.amount)}</span>
                    {paidAt || !i.expenseId ? <Badge tone="green">Paid</Badge> : <Badge tone="gold">Due</Badge>}
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="border border-line bg-paper p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[18px] font-semibold">My queries</h2>
              <Link href="/staff/queries" className="text-[14.5px] font-semibold text-forest">
                Ask a question →
              </Link>
            </div>
            {queries.length === 0 && <p className="text-muted">Nothing asked yet.</p>}
            {queries.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14.5px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{q.subject}</span>
                  <span className="text-[13px] text-muted">{topicLabel(q.topic)}</span>
                </span>
                <Badge tone={q.status === "open" ? "gold" : q.status === "declined" ? "clay" : "green"}>
                  {q.status === "open" ? "Waiting" : q.status[0].toUpperCase() + q.status.slice(1)}
                </Badge>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
