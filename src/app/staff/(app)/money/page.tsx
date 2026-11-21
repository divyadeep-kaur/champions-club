import Link from "next/link";
import { db } from "@/lib/db";
import { courtDues } from "@/lib/ledger";
import { inr } from "@/lib/constants";
import { EXPENSE_CATEGORIES, invoiceTotals, monthKey, monthLabel, monthRange, profitAndLoss, INCOME_SOURCES } from "@/lib/money";
import { METHOD_LABEL, SOURCE_LABEL } from "@/lib/reports";

export const dynamic = "force-dynamic";

const card = "border border-line bg-paper p-6";
const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function MoneyOverview({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month ?? monthKey();
  const { from, to } = monthRange(month);
  const prev = monthKey(new Date(from.getFullYear(), from.getMonth() - 1, 1));
  const next = monthKey(new Date(from.getFullYear(), from.getMonth() + 1, 1));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const trendFrom = new Date(from.getFullYear(), from.getMonth() - 5, 1);
  const [income, monthExpenses, unpaid, openInvoices, trendPay, trendExp, methods] = await Promise.all([
    db.payment.groupBy({ by: ["source"], where: { createdAt: { gte: from, lt: to } }, _sum: { amount: true, gst: true } }),
    db.expense.findMany({ where: { dueDate: { gte: from, lt: to } } }),
    db.expense.findMany({ where: { paidAt: null }, orderBy: { dueDate: "asc" } }),
    db.invoice.findMany({ where: { status: { not: "paid" } }, include: { lines: true }, orderBy: { dueAt: "asc" } }),
    db.payment.findMany({ where: { createdAt: { gte: trendFrom, lt: to } }, select: { amount: true, source: true, gst: true, createdAt: true } }),
    db.expense.findMany({ where: { dueDate: { gte: trendFrom, lt: to } }, select: { amount: true, category: true, dueDate: true } }),
    db.payment.groupBy({ by: ["method"], where: { createdAt: { gte: from, lt: to } }, _sum: { amount: true } }),
  ]);
  const pnl = profitAndLoss(
    income.map((r) => ({ source: r.source, amount: r._sum.amount ?? 0, gst: r._sum.gst })),
    monthExpenses,
  );
  const trend = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(trendFrom.getFullYear(), trendFrom.getMonth() + i, 1);
    const k = monthKey(m);
    const r = profitAndLoss(
      trendPay.filter((p) => monthKey(p.createdAt) === k),
      trendExp.filter((e) => monthKey(e.dueDate) === k),
    );
    return { k, label: m.toLocaleDateString("en-IN", { month: "short" }), income: r.netRevenue, costs: r.totalCosts, profit: r.profit };
  });
  const peak = Math.max(1, ...trend.flatMap((t) => [t.income, t.costs]));
  const methodTotal = methods.reduce((s, m) => s + (m._sum.amount ?? 0), 0);

  const incomeTotal = income.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: monthExpenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0) }));
  const costs = byCat.reduce((s, c) => s + c.amount, 0);
  const owe = unpaid.reduce((s, e) => s + e.amount, 0);
  const overdue = unpaid.filter((e) => e.dueDate < today);
  const [court, memberDues] = await Promise.all([
    courtDues(db, new Date()),
    db.membershipChange.aggregate({ where: { paymentStatus: "pending" }, _sum: { amount: true }, _count: true }),
  ]);
  const invoiceDue = openInvoices.reduce((s, i) => s + invoiceTotals(i.lines).total, 0);
  const owedToUs = invoiceDue + court.total + (memberDues._sum.amount ?? 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/staff/money?month=${prev}`}
          aria-label="Previous month"
          className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
        >
          ‹
        </Link>
        <span className="px-2 text-[17px] font-semibold">{monthLabel(from)}</span>
        <Link
          href={`/staff/money?month=${next}`}
          aria-label="Next month"
          className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="bg-forest p-5 text-cream">
          <div className="text-[14px] opacity-85">Income</div>
          <div className="font-serif text-[34px] tabular-nums">{inr(incomeTotal)}</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">Bills and salaries</div>
          <div className="font-serif text-[30px] text-forest tabular-nums">{inr(costs)}</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">Profit</div>
          <div className={`font-serif text-[30px] tabular-nums ${pnl.profit < 0 ? "text-[#a8411f]" : "text-[#4d7a12]"}`}>{inr(pnl.profit)}</div>
          <div className="text-[13.5px] text-muted">
            after {inr(pnl.gst)} GST · {pnl.margin}% margin
          </div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">Staff cost share</div>
          <div className={`font-serif text-[30px] tabular-nums ${pnl.staffShare > 55 ? "text-clay" : "text-forest"}`}>{pnl.staffShare}%</div>
          <div className="text-[13.5px] text-muted">of revenue after GST</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">What we owe</div>
          <div className="font-serif text-[30px] text-clay tabular-nums">{inr(owe)}</div>
          <div className="text-[13.5px] text-muted">{overdue.length ? `${overdue.length} overdue` : "Nothing overdue"}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={card}>
          <h2 className="mb-1 text-[18px] font-semibold">Six months at a glance</h2>
          <p className="mb-4 text-[13.5px] text-muted">Revenue after GST against all bills, salaries and dues, by month.</p>
          <div
            className="flex h-[200px] items-end gap-3"
            role="img"
            aria-label={trend.map((t) => `${t.label}: revenue ${inr(t.income)}, costs ${inr(t.costs)}`).join("; ")}
          >
            {trend.map((t) => (
              <Link key={t.k} href={`/staff/money?month=${t.k}`} className="group grid h-full flex-1 grid-rows-[1fr_auto] gap-1.5">
                <span className="flex items-end justify-center gap-1">
                  <span className="w-1/2 max-w-7 bg-forest group-hover:bg-forest-deep" style={{ height: `${(t.income / peak) * 100}%` }} />
                  <span className="w-1/2 max-w-7 bg-clay/80" style={{ height: `${(t.costs / peak) * 100}%` }} />
                </span>
                <span className={`text-center text-[12.5px] ${t.k === monthKey(from) ? "font-bold text-forest" : "text-muted"}`}>{t.label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-3 bg-forest" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 bg-clay/80" /> Costs
            </span>
          </div>
          <table className="mt-3 w-full text-[13.5px]">
            <thead className="text-muted">
              <tr>
                <th className="py-1.5 text-left font-semibold">Month</th>
                <th className="py-1.5 text-right font-semibold">Revenue</th>
                <th className="py-1.5 text-right font-semibold">Costs</th>
                <th className="py-1.5 text-right font-semibold">Profit</th>
              </tr>
            </thead>
            <tbody>
              {trend.map((t) => (
                <tr key={t.k} className="border-t border-line">
                  <td className="py-1.5">{t.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{inr(t.income)}</td>
                  <td className="py-1.5 text-right tabular-nums">{inr(t.costs)}</td>
                  <td className={`py-1.5 text-right font-semibold tabular-nums ${t.profit < 0 ? "text-[#a8411f]" : "text-[#4d7a12]"}`}>{inr(t.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Profit and loss · {monthLabel(from)}</h2>
          <div className="flex justify-between border-t border-line py-2 text-[14.5px]">
            <span>Takings (incl. GST)</span>
            <span className="tabular-nums">{inr(pnl.gross)}</span>
          </div>
          <div className="flex justify-between border-t border-line py-2 text-[14.5px] text-muted">
            <span>Less GST collected</span>
            <span className="tabular-nums">− {inr(pnl.gst)}</span>
          </div>
          <div className="flex justify-between border-t border-line py-2 text-[14.5px] font-semibold">
            <span>Revenue</span>
            <span className="tabular-nums">{inr(pnl.netRevenue)}</span>
          </div>
          {pnl.lines
            .filter((l) => l.amount)
            .map((l) => (
              <div key={l.key} className="flex justify-between border-t border-line py-2 text-[14.5px] text-muted">
                <span>Less {l.label.toLowerCase()}</span>
                <span className="tabular-nums">− {inr(l.amount)}</span>
              </div>
            ))}
          <div className={`mt-1 flex justify-between px-3 py-2.5 font-semibold ${pnl.profit < 0 ? "bg-clay-soft text-[#7a2f14]" : "bg-forest text-cream"}`}>
            <span>Net profit · {pnl.margin}%</span>
            <span className="font-serif text-[20px] tabular-nums">{inr(pnl.profit)}</span>
          </div>
          <h3 className="mt-5 mb-1 text-[15px] font-semibold">Income by payment method</h3>
          {methods
            .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
            .map((m) => (
              <div key={m.method} className="grid grid-cols-[80px_minmax(0,1fr)_96px] items-center gap-2 py-1 text-[13.5px]">
                <span>{METHOD_LABEL[m.method] ?? m.method}</span>
                <span className="h-2.5 bg-[#ece5d6]">
                  <span className="block h-2.5 bg-[#4d7a12]" style={{ width: `${((m._sum.amount ?? 0) / Math.max(1, methodTotal)) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{inr(m._sum.amount ?? 0)}</span>
              </div>
            ))}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Where it came from</h2>
          {income.length === 0 && <p className="text-muted">No income this month.</p>}
          {INCOME_SOURCES.filter((k) => k !== "invoice" || income.some((r) => r.source === "invoice")).map((k) => {
            const v = income.find((r) => r.source === k)?._sum.amount ?? 0;
            return (
              <div key={k} className="flex justify-between border-t border-line py-2.5 text-[14.5px]">
                <span>{SOURCE_LABEL[k]}</span>
                <span className="font-semibold tabular-nums">{inr(v)}</span>
              </div>
            );
          })}
        </section>
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Where it went</h2>
          {byCat.map((c) => (
            <div key={c.key} className="flex justify-between border-t border-line py-2.5 text-[14.5px]">
              <span>{c.label}</span>
              <span className="font-semibold tabular-nums">{inr(c.amount)}</span>
            </div>
          ))}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Bills to pay</h2>
          {unpaid.length === 0 && <p className="text-muted">All bills are paid.</p>}
          {unpaid.slice(0, 6).map((e) => (
            <div key={e.id} className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px]">
              <span className="min-w-0 truncate">
                {e.description}
                {e.vendor ? <span className="text-muted"> · {e.vendor}</span> : null}
              </span>
              <span className="shrink-0 text-right">
                <strong className="tabular-nums">{inr(e.amount)}</strong>
                <span className={`block text-[12.5px] ${e.dueDate < today ? "font-semibold text-[#a8411f]" : "text-muted"}`}>
                  {e.dueDate < today ? "overdue" : "due"} {short(e.dueDate)}
                </span>
              </span>
            </div>
          ))}
          <Link href="/staff/money/bills" className="mt-2 inline-block text-[14.5px] font-semibold text-forest">
            All bills →
          </Link>
        </section>
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Owed to us</h2>
          <p className="font-serif text-[26px] text-forest tabular-nums">{inr(owedToUs)}</p>
          <Link href="/staff/bookings" className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
            <span>Court bookings played, not paid ({court.courts.length + court.players.length})</span>
            <span className="tabular-nums">{inr(court.total)}</span>
          </Link>
          <Link href="/staff/members/dues" className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream">
            <span>Membership payments pending ({memberDues._count})</span>
            <span className="tabular-nums">{inr(memberDues._sum.amount ?? 0)}</span>
          </Link>
          <p className="border-t border-line pt-2.5 text-[13px] font-semibold text-muted">Invoices · {inr(invoiceDue)}</p>
          {openInvoices.slice(0, 5).map((i) => (
            <Link
              key={i.id}
              href={`/staff/money/invoices/${i.id}`}
              className="flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] hover:bg-cream"
            >
              <span>
                {i.number} · {i.customerName}
              </span>
              <span className="tabular-nums">{inr(invoiceTotals(i.lines).total)}</span>
            </Link>
          ))}
          {openInvoices.length === 0 && <p className="text-muted">No unpaid invoices.</p>}
        </section>
      </div>
    </>
  );
}
