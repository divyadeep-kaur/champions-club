import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { EXPENSE_CATEGORIES, invoiceTotals, monthKey, monthLabel, monthRange } from "@/lib/money";
import { SOURCE_LABEL } from "@/lib/reports";

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

  const [income, monthExpenses, unpaid, openInvoices] = await Promise.all([
    db.payment.groupBy({ by: ["source"], where: { createdAt: { gte: from, lt: to } }, _sum: { amount: true } }),
    db.expense.findMany({ where: { dueDate: { gte: from, lt: to } } }),
    db.expense.findMany({ where: { paidAt: null }, orderBy: { dueDate: "asc" } }),
    db.invoice.findMany({ where: { status: { not: "paid" } }, include: { lines: true }, orderBy: { dueAt: "asc" } }),
  ]);

  const incomeTotal = income.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: monthExpenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0) }));
  const costs = byCat.reduce((s, c) => s + c.amount, 0);
  const profit = incomeTotal - costs;
  const owe = unpaid.reduce((s, e) => s + e.amount, 0);
  const overdue = unpaid.filter((e) => e.dueDate < today);
  const owedToUs = openInvoices.reduce((s, i) => s + invoiceTotals(i.lines).total, 0);

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
          <div className={`font-serif text-[30px] tabular-nums ${profit < 0 ? "text-[#a8411f]" : "text-[#4d7a12]"}`}>{inr(profit)}</div>
        </div>
        <div className="border border-line bg-paper p-5">
          <div className="text-[14px] text-muted">What we owe</div>
          <div className="font-serif text-[30px] text-clay tabular-nums">{inr(owe)}</div>
          <div className="text-[13.5px] text-muted">{overdue.length ? `${overdue.length} overdue` : "Nothing overdue"}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Where it came from</h2>
          {income.length === 0 && <p className="text-muted">No income this month.</p>}
          {["court", "membership", "shop", "bar"].map((k) => {
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
