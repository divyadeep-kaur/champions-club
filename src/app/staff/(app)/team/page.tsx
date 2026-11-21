import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { isoDate } from "@/lib/dates";
import { byDepartment, DEPARTMENTS, deptLabel, payslip } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { Badge, Table, Td } from "@/components/staff/ui";
import { AddStaffForm } from "./AddStaffForm";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ dept?: string; q?: string }> }) {
  await requireStaff(["owner"]);
  const sp = await searchParams;
  const dept = DEPARTMENTS.some((d) => d.key === sp.dept) ? sp.dept : undefined;
  const q = sp.q?.trim();

  const [all, open, onLeave] = await Promise.all([
    db.staff.findMany({ orderBy: [{ active: "desc" }, { code: "asc" }] }),
    db.staffQuery.groupBy({ by: ["staffId"], where: { status: "open" }, _count: true }),
    db.leaveRequest.findMany({ where: { status: "approved", from: { lte: new Date() }, to: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, select: { staffId: true } }),
  ]);
  const active = all.filter((s) => s.active);
  const depts = byDepartment(active);
  const gross = depts.reduce((s, d) => s + d.gross, 0);
  const ctc = depts.reduce((s, d) => s + d.ctc, 0);
  const shown = all.filter(
    (s) =>
      (!dept || s.department === dept) &&
      (!q || [s.name, s.code ?? "", s.jobTitle, s.phone ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase()))),
  );
  const openFor = (id: number) => open.find((o) => o.staffId === id)?._count ?? 0;
  const leaveIds = new Set(onLeave.map((l) => l.staffId));

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Team</h1>
          <p className="mt-1.5 text-muted">Every staff member with their ID, role, salary and open questions.</p>
        </div>
        <Link href="/staff/queries" className="min-h-11 border-[1.5px] border-forest px-4 py-2.5 font-semibold text-forest hover:bg-forest/5">
          Staff queries ({open.reduce((s, o) => s + o._count, 0)} waiting)
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <div className="bg-forest p-5 text-cream">
          <p className="text-[14px] opacity-85">Active staff</p>
          <p className="font-serif text-[34px] tabular-nums">{active.length}</p>
          <p className="text-[13px] opacity-75">{leaveIds.size ? `${leaveIds.size} on leave today` : "Nobody on leave today"}</p>
        </div>
        <div className="border border-line bg-paper p-5">
          <p className="text-[14px] text-muted">Monthly gross salaries</p>
          <p className="font-serif text-[30px] text-forest tabular-nums">{inr(gross)}</p>
        </div>
        <div className="border border-line bg-paper p-5">
          <p className="text-[14px] text-muted">Full monthly cost</p>
          <p className="font-serif text-[30px] text-forest tabular-nums">{inr(ctc)}</p>
          <p className="text-[13px] text-muted">incl. {inr(ctc - gross)} employer PF and ESI</p>
        </div>
        <div className="border border-line bg-paper p-5">
          <p className="text-[14px] text-muted">Cost per year</p>
          <p className="font-serif text-[30px] text-forest tabular-nums">{inr(ctc * 12)}</p>
        </div>
      </div>

      <section className="border border-line bg-paper p-5">
        <h2 className="mb-3 text-[18px] font-semibold">Cost by department</h2>
        <div className="grid gap-2.5">
          {depts.map((d) => (
            <Link key={d.key} href={`/staff/team?dept=${d.key}`} className="grid grid-cols-[140px_minmax(0,1fr)_110px] items-center gap-3 text-[14.5px] hover:text-forest">
              <span>
                {d.label} <span className="text-muted">· {d.headcount}</span>
              </span>
              <span className="h-3.5 bg-[#ece5d6]" role="img" aria-label={`${d.label} ${Math.round((d.ctc / ctc) * 100)}% of staff cost`}>
                <span className="block h-3.5 bg-forest" style={{ width: `${(d.ctc / ctc) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums">{inr(d.ctc)}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <div className="grid min-w-0 flex-[999_1_620px] gap-3">
          <form className="flex flex-wrap gap-2" role="search">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, ID, job or phone"
              aria-label="Search staff"
              className="min-h-11 min-w-0 flex-1 border border-[#b5aa98] bg-white px-3"
            />
            <select name="dept" defaultValue={dept ?? ""} aria-label="Department" className="min-h-11 border border-[#b5aa98] bg-white px-2">
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
            <button className="min-h-11 bg-forest px-4 font-semibold text-cream">Filter</button>
          </form>
          <Table head={["ID", "Name", "Department", "Gross / month", "Take-home", ""]} empty={shown.length === 0}>
            {shown.map((s) => (
              <tr key={s.id} className={s.active ? "" : "opacity-60"}>
                <Td className="font-mono font-semibold">{s.code}</Td>
                <Td>
                  <Link href={`/staff/team/${s.id}`} className="font-semibold text-forest hover:underline">
                    {s.name}
                  </Link>
                  <span className="block text-[13px] text-muted">{s.jobTitle}</span>
                </Td>
                <Td>{deptLabel(s.department)}</Td>
                <Td className="tabular-nums">{inr(s.monthlySalary)}</Td>
                <Td className="tabular-nums">{inr(payslip(s.monthlySalary).net)}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1.5">
                    {!s.active && <Badge>Inactive</Badge>}
                    {leaveIds.has(s.id) && <Badge tone="gold">On leave</Badge>}
                    {openFor(s.id) > 0 && <Badge tone="clay">{openFor(s.id)} query</Badge>}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
        <div className="min-w-0 flex-[1_1_340px]">
          <AddStaffForm today={isoDate(new Date())} />
        </div>
      </div>
    </div>
  );
}
