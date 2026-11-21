import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthKey, monthLabel, monthRange } from "@/lib/money";
import { STAFF_INVOICE_KIND } from "@/lib/staffInvoices";
import { Badge } from "@/components/staff/ui";
import { payExpense } from "../actions";

export const dynamic = "force-dynamic";

const KINDS = [{ key: "", label: "All" }, ...Object.entries(STAFF_INVOICE_KIND).map(([key, label]) => ({ key, label }))];

export default async function StaffInvoicesPage({ searchParams }: { searchParams: Promise<{ kind?: string; unpaid?: string; month?: string }> }) {
  const sp = await searchParams;
  const kind = STAFF_INVOICE_KIND[sp.kind ?? ""] ? sp.kind : undefined;
  const unpaidOnly = sp.unpaid === "1";
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month : undefined;

  const invoices = await db.staffInvoice.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(month ? { OR: [{ month }, { month: null, issuedAt: { gte: monthRange(month).from, lt: monthRange(month).to } }] } : {}),
    },
    include: { staff: true },
    orderBy: [{ issuedAt: "desc" }, { number: "desc" }],
    take: 300,
  });
  const expenses = await db.expense.findMany({ where: { id: { in: invoices.map((i) => i.expenseId).filter((x): x is number => !!x) } } });
  const paidAt = new Map(expenses.map((e) => [e.id, e.paidAt]));
  const isPaid = (i: (typeof invoices)[number]) => !i.expenseId || !!paidAt.get(i.expenseId);
  const shown = unpaidOnly ? invoices.filter((i) => !isPaid(i)) : invoices;
  const total = shown.reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter((i) => !isPaid(i)).reduce((s, i) => s + i.amount, 0);
  const byKind = Object.keys(STAFF_INVOICE_KIND).map((k) => ({ k, amount: shown.filter((i) => i.kind === k).reduce((s, i) => s + i.amount, 0) }));
  const months = [...new Set(invoices.map((i) => i.month ?? monthKey(i.issuedAt)))].slice(0, 8);
  const q = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { kind, month, unpaid: unpaidOnly ? "1" : undefined, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/staff/money/staff-invoices${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="grid content-start gap-4">
      <p className="text-[14.5px] text-muted">
        Every salary, advance and approved claim gets a numbered staff invoice (SAL-year-number) linked to its bill, so each rupee paid to staff can be traced in
        the books.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        <div className="bg-forest p-4 text-cream">
          <p className="text-[13.5px] opacity-85">{unpaidOnly ? "Unpaid shown" : "Total shown"}</p>
          <p className="font-serif text-[26px] tabular-nums">{inr(total)}</p>
          <p className="text-[12.5px] opacity-75">{shown.length} invoices</p>
        </div>
        {byKind.map((b) => (
          <div key={b.k} className="border border-line bg-paper p-4">
            <p className="text-[13.5px] text-muted">{STAFF_INVOICE_KIND[b.k]}</p>
            <p className="font-serif text-[24px] text-forest tabular-nums">{inr(b.amount)}</p>
          </div>
        ))}
        <div className="border border-line bg-paper p-4">
          <p className="text-[13.5px] text-muted">Still to pay staff</p>
          <p className={`font-serif text-[24px] tabular-nums ${outstanding ? "text-clay" : "text-forest"}`}>{inr(outstanding)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Invoice type" className="flex flex-wrap border-[1.5px] border-forest">
          {KINDS.map((k) => (
            <Link
              key={k.key}
              href={q({ kind: k.key || undefined })}
              aria-current={(kind ?? "") === k.key ? "page" : undefined}
              className={`flex min-h-10 items-center px-3.5 text-[14px] font-semibold ${(kind ?? "") === k.key ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
            >
              {k.label}
            </Link>
          ))}
        </nav>
        <Link
          href={q({ unpaid: unpaidOnly ? undefined : "1" })}
          aria-pressed={unpaidOnly}
          className={`flex min-h-10 items-center border-[1.5px] px-3.5 text-[14px] font-semibold ${unpaidOnly ? "border-clay bg-clay text-white" : "border-forest text-forest"}`}
        >
          Unpaid only
        </Link>
        <span className="ml-1 flex flex-wrap gap-1.5 text-[13.5px]">
          <Link href={q({ month: undefined })} className={`px-2 py-1 ${!month ? "font-bold text-forest underline" : "text-muted"}`}>
            Any month
          </Link>
          {months.map((m) => (
            <Link key={m} href={q({ month: m })} className={`px-2 py-1 ${month === m ? "font-bold text-forest underline" : "text-muted"}`}>
              {monthLabel(new Date(`${m}-01T12:00:00`))}
            </Link>
          ))}
        </span>
      </div>

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-[14.5px]">
          <thead className="text-muted">
            <tr>
              {["Invoice", "Staff", "Type", "Issued", "Amount", "Status"].map((h) => (
                <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {shown.map((i) => {
              const paid = isPaid(i);
              const when = i.expenseId ? paidAt.get(i.expenseId) : null;
              return (
                <tr key={i.id} className="hover:bg-cream">
                  <td className="px-3.5 py-3 font-mono font-semibold">
                    <Link href={`/staff/salary-invoice/${i.id}`} className="text-forest hover:underline">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3">
                    {i.staff.name}
                    <span className="block text-[12.5px] text-muted">
                      {i.staff.code} · {i.staff.jobTitle}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    {STAFF_INVOICE_KIND[i.kind]}
                    {i.month && <span className="block text-[12.5px] text-muted">{monthLabel(new Date(`${i.month}-01T12:00:00`))}</span>}
                  </td>
                  <td className="px-3.5 py-3">{i.issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-3.5 py-3 font-semibold tabular-nums">{inr(i.amount)}</td>
                  <td className="px-3.5 py-3">
                    {paid ? (
                      <Badge tone="green">Paid{when ? ` ${when.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</Badge>
                    ) : (
                      <form action={payExpense} className="flex items-center gap-2">
                        <input type="hidden" name="expenseId" value={i.expenseId!} />
                        <select name="method" aria-label={`How ${i.number} is paid`} defaultValue={i.kind === "salary" ? "bank" : "cash"} className="min-h-9 border border-[#b5aa98] bg-white px-1.5 text-[13.5px]">
                          <option value="bank">Bank</option>
                          <option value="upi">UPI</option>
                          <option value="cash">Cash</option>
                        </select>
                        <button className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">Pay</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-10 text-center text-muted">No staff invoices match.</p>}
      </div>
    </div>
  );
}
