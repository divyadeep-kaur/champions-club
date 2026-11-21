import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { booksCheck } from "@/lib/booksCheck";

export const dynamic = "force-dynamic";

const AREAS = ["Courts", "Café & bar", "Shop", "Memberships", "Invoices", "Payroll"];

export default async function ChecksPage() {
  await requireStaff(["owner"]);
  const since = new Date(Date.now() - 60 * 86_400_000);
  const issues = await booksCheck(db, since);
  const [payments, refunds] = await Promise.all([
    db.payment.count({ where: { createdAt: { gte: since } } }),
    db.payment.aggregate({ where: { createdAt: { gte: since }, amount: { lt: 0 } }, _sum: { amount: true }, _count: true }),
  ]);
  const gap = issues.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="grid content-start gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div className={`p-5 ${issues.length ? "bg-clay text-white" : "bg-forest text-cream"}`}>
          <p className="text-[14px] opacity-90">Books check · last 60 days</p>
          <p className="font-serif text-[30px] leading-tight">{issues.length ? `${issues.length} to look at` : "Everything balances"}</p>
          {issues.length > 0 && <p className="text-[13px] opacity-90">Net difference {inr(gap)}</p>}
        </div>
        <div className="border border-line bg-paper p-5">
          <p className="text-[14px] text-muted">Payments checked</p>
          <p className="font-serif text-[28px] text-forest tabular-nums">{payments.toLocaleString("en-IN")}</p>
        </div>
        <div className="border border-line bg-paper p-5">
          <p className="text-[14px] text-muted">Refunds in this period</p>
          <p className="font-serif text-[28px] text-forest tabular-nums">{inr(Math.abs(refunds._sum.amount ?? 0))}</p>
          <p className="text-[13px] text-muted">{refunds._count} refunds</p>
        </div>
      </div>

      <p className="text-[14px] text-muted">
        Every closed tab, shop order, court booking, invoice, membership payment and payslip is matched against the money actually recorded for it. A row here
        means the record and the money disagree; open it to fix it.
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AREAS.map((area) => {
          const list = issues.filter((i) => i.area === area);
          return (
            <section key={area} className="border border-line bg-paper p-4">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold">{area}</h2>
                <span className={`px-2 py-0.5 text-[12.5px] font-semibold ${list.length ? "bg-clay-soft text-[#9a3b19]" : "bg-[#e3f1c9] text-[#3d5a12]"}`}>
                  {list.length ? `${list.length} issue${list.length > 1 ? "s" : ""}` : "OK"}
                </span>
              </div>
              {list.length === 0 && <p className="text-[13.5px] text-muted">All records match their payments.</p>}
              {list.slice(0, 8).map((i, n) => (
                <Link key={n} href={i.href} className="block border-t border-line py-2 text-[13.5px] hover:bg-cream">
                  <span className="block font-semibold">{i.title}</span>
                  <span className="text-muted">
                    {i.detail}
                    {i.amount ? ` · gap ${inr(i.amount)}` : ""}
                  </span>
                </Link>
              ))}
              {list.length > 8 && <p className="pt-1 text-[13px] text-muted">and {list.length - 8} more</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
