import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthLabel } from "@/lib/money";
import { ROLE_LABEL } from "@/lib/nav";
import { payslip, topicLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { STAFF_INVOICE_KIND } from "@/lib/staffInvoices";
import { SlipBreakdown } from "@/components/staff/SlipBreakdown";
import { StaffIdCard } from "@/components/staff/StaffIdCard";
import { Badge } from "@/components/staff/ui";
import { setActive } from "../actions";
import { EditStaffForm } from "./EditStaffForm";

export const dynamic = "force-dynamic";

const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function StaffDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(["owner"]);
  const s = await db.staff.findUnique({
    where: { id: Number((await params).id) },
    include: {
      payslips: { orderBy: { month: "desc" }, take: 12 },
      queries: { orderBy: { createdAt: "desc" }, take: 10 },
      leaves: { orderBy: { from: "desc" }, take: 6 },
      invoices: { orderBy: [{ issuedAt: "desc" }, { number: "desc" }], take: 8 },
    },
  });
  if (!s) notFound();
  const owed = s.queries.filter((q) => q.topic === "advance" && q.status === "approved" && !q.recoveredMonth).reduce((n, q) => n + (q.amount ?? 0), 0);
  const paidTotal = s.payslips.reduce((n, p) => n + p.net, 0);
  const shiftCount = await db.shift.count({ where: { staffId: s.id, start: { gte: new Date(Date.now() - 30 * 86_400_000) } } });

  return (
    <div className="grid content-start gap-5">
      <Link href="/staff/team" className="font-semibold text-forest">
        ← Team
      </Link>
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <StaffIdCard staff={s} />
          <div className="grid gap-2 border border-line bg-paper p-5 text-[14.5px]">
            <div className="flex justify-between">
              <span className="text-muted">App access</span>
              <span className="font-semibold">{ROLE_LABEL[s.role] ?? s.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paid in last 12 payslips</span>
              <span className="font-semibold tabular-nums">{inr(paidTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Advance to recover</span>
              <span className={`font-semibold tabular-nums ${owed ? "text-clay" : ""}`}>{inr(owed)}</span>
            </div>
            {s.role === "bar" && (
              <div className="flex justify-between">
                <span className="text-muted">Bar shifts, last 30 days</span>
                <span className="font-semibold tabular-nums">{shiftCount}</span>
              </div>
            )}
            {s.id !== session.id && (
              <form action={setActive} className="mt-2">
                <input type="hidden" name="staffId" value={s.id} />
                <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                <button
                  className={`min-h-10 w-full text-[14px] font-semibold ${s.active ? "border-[1.5px] border-[#a8411f] text-[#a8411f]" : "bg-forest text-cream"}`}
                >
                  {s.active ? "Mark as left (blocks sign-in and payroll)" : "Make active again"}
                </button>
              </form>
            )}
          </div>
          {s.role !== "owner" && <EditStaffForm id={s.id} jobTitle={s.jobTitle} department={s.department} phone={s.phone} salary={s.monthlySalary} />}
        </div>

        <div className="grid content-start gap-4">
          <section className="border border-line bg-paper p-5">
            <h2 className="mb-3 text-[18px] font-semibold">Salary breakdown</h2>
            {s.monthlySalary > 0 ? <SlipBreakdown slip={payslip(s.monthlySalary, owed)} /> : <p className="text-muted">No salary set.</p>}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">Payslips</h2>
            {s.payslips.length === 0 && <p className="text-muted">No payslips yet.</p>}
            {s.payslips.map((p) => (
              <Link key={p.id} href={`/staff/payslip/${p.id}`} className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
                <span className="font-semibold">{monthLabel(new Date(`${p.month}-01T12:00:00`))}</span>
                <span className="tabular-nums">
                  {inr(p.gross)} gross · <strong>{inr(p.net)}</strong> net
                </span>
              </Link>
            ))}
          </section>

          <section className="border border-line bg-paper p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Invoices</h2>
              <Link href="/staff/money/staff-invoices" className="text-[14.5px] font-semibold text-forest">
                All staff invoices →
              </Link>
            </div>
            {s.invoices.length === 0 && <p className="text-muted">No invoices yet.</p>}
            {s.invoices.map((i) => (
              <Link key={i.id} href={`/staff/salary-invoice/${i.id}`} className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
                <span>
                  <span className="font-mono font-semibold">{i.number}</span> · {STAFF_INVOICE_KIND[i.kind]}
                </span>
                <span className="tabular-nums">{inr(i.amount)}</span>
              </Link>
            ))}
          </section>

          <section className="border border-line bg-paper p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Queries</h2>
              <Link href="/staff/queries" className="text-[14.5px] font-semibold text-forest">
                Inbox →
              </Link>
            </div>
            {s.queries.length === 0 && <p className="text-muted">No queries.</p>}
            {s.queries.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14.5px]">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{q.subject}</span>
                  <span className="text-[13px] text-muted">
                    {topicLabel(q.topic)} · {short(q.createdAt)}
                    {q.amount ? ` · ${inr(q.amount)}` : ""}
                  </span>
                </span>
                <Badge tone={q.status === "open" ? "gold" : q.status === "declined" ? "clay" : "green"}>{q.status === "open" ? "Waiting" : q.status}</Badge>
              </div>
            ))}
          </section>

          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">Leave</h2>
            {s.leaves.length === 0 && <p className="text-muted">No leave requests.</p>}
            {s.leaves.map((l) => (
              <div key={l.id} className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px]">
                <span>
                  {short(l.from)}
                  {l.to.getTime() !== l.from.getTime() ? ` – ${short(l.to)}` : ""} · {l.reason}
                </span>
                <Badge tone={l.status === "approved" ? "green" : l.status === "pending" ? "gold" : "gray"}>{l.status}</Badge>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
