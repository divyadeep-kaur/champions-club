import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { isoDate } from "@/lib/dates";
import { EXPENSE_CATEGORIES } from "@/lib/money";
import { AddBillForm } from "../AddBillForm";
import { payExpense } from "../actions";

export const dynamic = "force-dynamic";

const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const catLabel = (k: string) => EXPENSE_CATEGORIES.find((c) => c.key === k)?.label ?? k;

export default async function BillsPage() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [unpaid, paid] = await Promise.all([
    db.expense.findMany({ where: { paidAt: null }, orderBy: { dueDate: "asc" } }),
    db.expense.findMany({ where: { paidAt: { not: null } }, orderBy: { paidAt: "desc" }, take: 12 }),
  ]);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="grid min-w-0 flex-[999_1_560px] gap-4">
        <section className="border border-line bg-paper">
          <h2 className="px-5 pt-5 text-[18px] font-semibold">
            To pay · <span className="tabular-nums">{inr(unpaid.reduce((s, e) => s + e.amount, 0))}</span>
          </h2>
          <div className="overflow-x-auto p-5 pt-3">
            <table className="w-full min-w-[620px] text-[14.5px]">
              <thead>
                <tr className="text-left text-muted">
                  {["Due", "Bill", "Type", "Amount", ""].map((h) => (
                    <th key={h} scope="col" className="py-2 pr-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unpaid.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className={`py-2.5 pr-3 ${e.dueDate < today ? "font-semibold text-[#a8411f]" : ""}`}>
                      {short(e.dueDate)}
                      {e.dueDate < today && <span className="block text-[12px]">overdue</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      {e.description}
                      {e.vendor && <span className="block text-[13px] text-muted">{e.vendor}</span>}
                    </td>
                    <td className="py-2.5 pr-3">{catLabel(e.category)}</td>
                    <td className="py-2.5 pr-3 font-semibold tabular-nums">{inr(e.amount)}</td>
                    <td className="py-2.5">
                      <form action={payExpense} className="flex justify-end gap-1">
                        <input type="hidden" name="expenseId" value={e.id} />
                        <select name="method" defaultValue="bank" aria-label="Paid by" className="min-h-9 border border-[#b5aa98] bg-white px-1.5 text-[13.5px]">
                          <option value="bank">Bank transfer</option>
                          <option value="upi">UPI</option>
                          <option value="cash">Cash</option>
                        </select>
                        <button type="submit" className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">
                          Mark paid
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unpaid.length === 0 && <p className="py-6 text-center text-muted">All bills are paid.</p>}
          </div>
        </section>

        <section className="border border-line bg-paper p-5">
          <h2 className="mb-2 text-[18px] font-semibold">Recently paid</h2>
          {paid.map((e) => (
            <div key={e.id} className="grid grid-cols-[80px_minmax(0,1fr)_auto] gap-3 border-t border-[#ece5d6] py-2.5 text-[14.5px]">
              <span className="text-muted">{short(e.paidAt!)}</span>
              <span className="truncate">
                {e.description} <span className="text-muted">· {catLabel(e.category)}</span>
              </span>
              <strong className="tabular-nums">{inr(e.amount)}</strong>
            </div>
          ))}
          {paid.length === 0 && <p className="text-muted">Nothing paid yet.</p>}
        </section>
      </div>
      <div className="min-w-0 flex-[1_1_320px]">
        <AddBillForm today={isoDate(now)} />
      </div>
    </div>
  );
}
