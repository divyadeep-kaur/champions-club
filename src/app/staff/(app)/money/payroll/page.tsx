import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthKey, monthLabel, monthRange } from "@/lib/money";
import { payExpense, runPayroll, setSalary } from "../actions";

export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = { owner: "Owner", desk: "Front desk", bar: "Café & bar" };

export default async function PayrollPage() {
  const month = monthKey();
  const { from } = monthRange(month);
  const label = monthLabel(from);
  const [staff, slips, leaves] = await Promise.all([
    db.staff.findMany({ orderBy: { name: "asc" } }),
    db.expense.findMany({ where: { category: "salary", description: { contains: label } }, orderBy: { vendor: "asc" } }),
    db.leaveRequest.findMany({ where: { status: "approved", from: { lt: monthRange(month).to }, to: { gte: from } } }),
  ]);
  const total = staff.reduce((s, m) => s + m.monthlySalary, 0);
  const leaveDays = (id: number) =>
    leaves.filter((l) => l.staffId === id).reduce((n, l) => n + Math.round((l.to.getTime() - l.from.getTime()) / 86_400_000) + 1, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border border-line bg-paper p-6">
        <h2 className="mb-1 text-[18px] font-semibold">Staff and salaries</h2>
        <p className="mb-3 text-[14px] text-muted">Monthly salary bill {inr(total)}. Change a salary and press Enter.</p>
        {staff.map((s) => (
          <form key={s.id} action={setSalary} className="grid grid-cols-[minmax(0,1fr)_140px] items-center gap-3 border-t border-line py-2.5 text-[14.5px]">
            <input type="hidden" name="staffId" value={s.id} />
            <span>
              <strong>{s.name}</strong> · {roleLabel[s.role] ?? s.role}
              {leaveDays(s.id) > 0 && <span className="block text-[13px] text-muted">{leaveDays(s.id)} day(s) approved leave this month</span>}
            </span>
            <label className="flex items-center gap-1">
              <span className="text-muted">₹</span>
              <input
                name="amount"
                type="number"
                min={0}
                defaultValue={s.monthlySalary}
                aria-label={`${s.name} monthly salary`}
                className="min-h-10 w-full border border-[#b5aa98] bg-white px-2 text-right tabular-nums"
              />
            </label>
          </form>
        ))}
      </section>

      <section className="border border-line bg-paper p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold">Payroll · {label}</h2>
          <form action={runPayroll}>
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="min-h-11 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep">
              {slips.length ? "Add missing salaries" : `Run payroll for ${label}`}
            </button>
          </form>
        </div>
        {slips.length === 0 && (
          <p className="text-muted">Payroll hasn’t been run for this month yet. Running it adds each salary as a bill due on the last day of the month.</p>
        )}
        {slips.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-3 border-t border-line py-2.5 text-[14.5px]">
            <span>{e.vendor}</span>
            <span className="flex items-center gap-3">
              <strong className="tabular-nums">{inr(e.amount)}</strong>
              {e.paidAt ? (
                <span className="text-[13px] font-semibold text-[#4d7a12]">
                  Paid {e.paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              ) : (
                <form action={payExpense}>
                  <input type="hidden" name="expenseId" value={e.id} />
                  <input type="hidden" name="method" value="bank" />
                  <button type="submit" className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">
                    Pay
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
