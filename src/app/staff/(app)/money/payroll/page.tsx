import { requireStaff } from "@/lib/session";
import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { monthKey, monthLabel, monthRange } from "@/lib/money";
import { byDepartment, deptLabel, payslip, statutoryDue } from "@/lib/payroll";
import { payAllSalaries, payExpense, runPayroll, setSalary } from "../actions";

export const dynamic = "force-dynamic";

const th = "px-3 py-2.5 font-semibold";
const td = "px-3 py-2.5 tabular-nums";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireStaff(["owner"]);
  const month = (await searchParams).month ?? monthKey();
  const { from, to } = monthRange(month);
  const key = monthKey(from);
  const label = monthLabel(from);
  const prev = monthKey(new Date(from.getFullYear(), from.getMonth() - 1, 1));
  const next = monthKey(new Date(from.getFullYear(), from.getMonth() + 1, 1));

  const [staff, slips, statBill, advances] = await Promise.all([
    db.staff.findMany({ where: { active: true }, orderBy: [{ department: "asc" }, { code: "asc" }] }),
    db.payslip.findMany({ where: { month: key }, include: { staff: true }, orderBy: { staff: { code: "asc" } } }),
    db.expense.findFirst({ where: { category: "statutory", description: `PF, ESI and PT ${label}` } }),
    db.staffQuery.findMany({ where: { topic: "advance", status: "approved", recoveredMonth: null } }),
  ]);
  const paidMap = new Map(
    (await db.expense.findMany({ where: { id: { in: slips.map((s) => s.expenseId).filter((x): x is number => !!x) } } })).map((e) => [e.id, e.paidAt]),
  );
  const eligible = staff.filter((s) => s.monthlySalary > 0 && s.joinedAt < to);
  const missing = eligible.filter((s) => !slips.some((p) => p.staffId === s.id));
  const owedBy = (id: number) => advances.filter((a) => a.staffId === id).reduce((n, a) => n + (a.amount ?? 0), 0);

  const rows = slips.length ? slips : [];
  const projected = eligible.map((s) => payslip(s.monthlySalary, owedBy(s.id)));
  const basis = rows.length ? rows : projected;
  const sum = (k: "gross" | "pf" | "esi" | "pt" | "advance" | "net" | "employerPf" | "employerEsi") => basis.reduce((n, r) => n + r[k], 0);
  const stat = statutoryDue(basis);
  const unpaid = rows.filter((r) => r.expenseId && !paidMap.get(r.expenseId));
  const depts = byDepartment(staff);

  return (
    <div className="grid content-start gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/staff/money/payroll?month=${prev}`}
            aria-label="Previous month"
            className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
          >
            ‹
          </Link>
          <span className="px-2 text-[17px] font-semibold">Payroll · {label}</span>
          <Link
            href={`/staff/money/payroll?month=${next}`}
            aria-label="Next month"
            className="grid size-11 place-items-center border-[1.5px] border-forest text-forest hover:bg-forest/5"
          >
            ›
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {missing.length > 0 && (
            <form action={runPayroll}>
              <input type="hidden" name="month" value={key} />
              <button type="submit" className="min-h-11 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep">
                {rows.length ? `Add ${missing.length} missing payslips` : `Run payroll for ${label}`}
              </button>
            </form>
          )}
          {unpaid.length > 0 && (
            <form action={payAllSalaries}>
              <input type="hidden" name="month" value={key} />
              <button type="submit" className="min-h-11 border-[1.5px] border-forest px-4 font-semibold text-forest hover:bg-forest/5">
                Pay all {unpaid.length} by bank ({inr(unpaid.reduce((n, r) => n + r.net, 0))})
              </button>
            </form>
          )}
          {rows.length > 0 && (
            <a
              href={`/staff/money/payroll/export?month=${key}`}
              className="flex min-h-11 items-center border-[1.5px] border-forest px-4 font-semibold text-forest hover:bg-forest/5"
            >
              Download CSV
            </a>
          )}
        </div>
      </div>

      {!rows.length && (
        <p className="border border-dashed border-line p-4 text-[14.5px] text-muted">
          Payroll hasn’t run for {label}. The figures below are a forecast from current salaries. Running it creates a payslip for each person, a salary bill
          for each take-home amount, and one PF, ESI and PT bill due on the 15th of next month. Approved advances are taken off automatically.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {[
          ["Gross salaries", sum("gross"), "text-forest"],
          ["Employee deductions", sum("pf") + sum("esi") + sum("pt"), "text-forest"],
          ["Advances recovered", sum("advance"), "text-forest"],
          ["Take-home to pay", sum("net"), "text-forest"],
          ["Employer PF + ESI", sum("employerPf") + sum("employerEsi"), "text-clay"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="border border-line bg-paper p-4">
            <p className="text-[13.5px] text-muted">{l}</p>
            <p className={`font-serif text-[24px] tabular-nums ${c}`}>{inr(v as number)}</p>
          </div>
        ))}
        <div className="bg-forest p-4 text-cream">
          <p className="text-[13.5px] opacity-85">Total staff cost</p>
          <p className="font-serif text-[26px] tabular-nums">{inr(sum("gross") + sum("employerPf") + sum("employerEsi"))}</p>
        </div>
      </div>

      <section className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[900px] text-left text-[14px]">
          <caption className="px-3 pt-4 pb-2 text-left text-[18px] font-semibold">{rows.length ? "Payslips" : "Forecast"}</caption>
          <thead className="text-muted">
            <tr>
              <th className={th}>ID</th>
              <th className={th}>Name</th>
              <th className={`${th} text-right`}>Gross</th>
              <th className={`${th} text-right`}>PF</th>
              <th className={`${th} text-right`}>ESI</th>
              <th className={`${th} text-right`}>PT</th>
              <th className={`${th} text-right`}>Advance</th>
              <th className={`${th} text-right`}>Take-home</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {(rows.length ? rows.map((r) => ({ ...r, who: r.staff })) : eligible.map((s, i) => ({ ...projected[i], id: -s.id, who: s, expenseId: null }))).map(
              (r) => {
                const paidAt = r.expenseId ? paidMap.get(r.expenseId) : null;
                return (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 font-mono font-semibold">{r.who.code}</td>
                    <td className="px-3 py-2.5">
                      {r.id > 0 ? (
                        <Link href={`/staff/payslip/${r.id}`} className="font-semibold text-forest hover:underline">
                          {r.who.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{r.who.name}</span>
                      )}
                      <span className="block text-[12.5px] text-muted">{deptLabel(r.who.department)}</span>
                    </td>
                    <td className={`${td} text-right`}>{inr(r.gross)}</td>
                    <td className={`${td} text-right`}>{inr(r.pf)}</td>
                    <td className={`${td} text-right`}>{inr(r.esi)}</td>
                    <td className={`${td} text-right`}>{inr(r.pt)}</td>
                    <td className={`${td} text-right`}>{r.advance ? inr(r.advance) : "—"}</td>
                    <td className={`${td} text-right font-semibold`}>{inr(r.net)}</td>
                    <td className="px-3 py-2.5">
                      {r.id < 0 ? (
                        <span className="text-muted">Forecast</span>
                      ) : paidAt ? (
                        <span className="text-[13px] font-semibold text-[#4d7a12]">
                          Paid {paidAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      ) : r.expenseId ? (
                        <form action={payExpense}>
                          <input type="hidden" name="expenseId" value={r.expenseId} />
                          <input type="hidden" name="method" value="bank" />
                          <button className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">Pay</button>
                        </form>
                      ) : (
                        <span className="text-muted">Nothing to pay</span>
                      )}
                    </td>
                  </tr>
                );
              },
            )}
            <tr className="bg-cream font-semibold">
              <td className="px-3 py-2.5" colSpan={2}>
                Total ({basis.length} people)
              </td>
              <td className={`${td} text-right`}>{inr(sum("gross"))}</td>
              <td className={`${td} text-right`}>{inr(sum("pf"))}</td>
              <td className={`${td} text-right`}>{inr(sum("esi"))}</td>
              <td className={`${td} text-right`}>{inr(sum("pt"))}</td>
              <td className={`${td} text-right`}>{inr(sum("advance"))}</td>
              <td className={`${td} text-right`}>{inr(sum("net"))}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-paper p-6">
          <h2 className="mb-1 text-[18px] font-semibold">Government dues for {label}</h2>
          <p className="mb-3 text-[14px] text-muted">Employee and employer shares, paid together by the 15th of next month.</p>
          {[
            ["Provident fund (EPFO)", stat.pf],
            ["ESI (ESIC)", stat.esi],
            ["Professional tax (Punjab)", stat.pt],
          ].map(([l, v]) => (
            <div key={l as string} className="flex justify-between border-t border-line py-2.5 text-[14.5px]">
              <span>{l}</span>
              <span className="tabular-nums">{inr(v as number)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line py-2.5 text-[15px] font-semibold">
            <span>Total</span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums">{inr(stat.total)}</span>
              {statBill?.paidAt ? (
                <span className="text-[13px] text-[#4d7a12]">Paid</span>
              ) : statBill ? (
                <form action={payExpense}>
                  <input type="hidden" name="expenseId" value={statBill.id} />
                  <input type="hidden" name="method" value="bank" />
                  <button className="min-h-9 border-[1.5px] border-forest px-3 text-[13.5px] font-semibold text-forest hover:bg-forest/5">Pay</button>
                </form>
              ) : (
                <span className="text-[13px] font-normal text-muted">Bill created when payroll runs</span>
              )}
            </span>
          </div>
        </section>

        <section className="border border-line bg-paper p-6">
          <h2 className="mb-1 text-[18px] font-semibold">Salaries by department</h2>
          <p className="mb-3 text-[14px] text-muted">Change a salary and press Enter. It applies from the next payroll.</p>
          {depts.map((d) => (
            <details key={d.key} className="border-t border-line py-2">
              <summary className="flex cursor-pointer justify-between gap-3 py-1 text-[14.5px] font-semibold">
                <span>
                  {d.label} · {d.headcount}
                </span>
                <span className="tabular-nums">{inr(d.gross)}</span>
              </summary>
              {staff
                .filter((s) => s.department === d.key)
                .map((s) => (
                  <form key={s.id} action={setSalary} className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-3 py-1.5 text-[14px]">
                    <input type="hidden" name="staffId" value={s.id} />
                    <span>
                      <span className="font-mono text-[12.5px] text-muted">{s.code}</span> {s.name}
                      <span className="block text-[12.5px] text-muted">{s.jobTitle}</span>
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
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
