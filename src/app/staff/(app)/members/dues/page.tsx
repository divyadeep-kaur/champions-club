import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { CHANGE_KINDS } from "@/lib/membership";
import { requireStaff } from "@/lib/session";
import { SettlePayment } from "../[id]/SettlePayment";

export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const session = await requireStaff(["owner", "desk"]);
  const owner = session.role === "owner";
  const [pending, recent] = await Promise.all([
    db.membershipChange.findMany({
      where: { paymentStatus: "pending" },
      include: { member: true, fromPlan: true, toPlan: true, staff: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.membershipChange.findMany({
      where: { paymentStatus: "paid", kind: { not: "joined" }, paymentId: { not: null } },
      include: { member: true, toPlan: true, payment: true },
      orderBy: { payment: { createdAt: "desc" } },
      take: 8,
    }),
  ]);
  const total = pending.reduce((s, c) => s + c.amount, 0);
  const now = Date.now();
  const overdue = pending.filter((c) => now - c.createdAt.getTime() > 7 * 86_400_000);

  return (
    <div className="grid content-start gap-5">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={`p-5 ${total ? "bg-clay text-white" : "bg-forest text-cream"}`}>
          <p className="text-[14px] opacity-90">Membership money not yet collected</p>
          <p className="font-serif text-[34px] tabular-nums">{inr(total)}</p>
          <p className="text-[13px] opacity-85">
            {pending.length} item{pending.length === 1 ? "" : "s"}
            {overdue.length ? ` · ${overdue.length} older than a week` : ""}
          </p>
        </div>
        <p className="border border-line bg-paper p-5 text-[14px] text-muted">
          Plan changes, renewals and extensions saved without payment wait here. Recording the payment adds it to Money with a payment reference, so nothing is ever assumed
          paid.
        </p>
      </div>

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[820px] text-left text-[14.5px]">
          <caption className="sr-only">Pending membership payments</caption>
          <thead className="text-[13.5px] text-muted">
            <tr>
              {["Member", "For", "Saved", "Amount", ""].map((h) => (
                <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {pending.map((c) => {
              const age = Math.floor((now - c.createdAt.getTime()) / 86_400_000);
              return (
                <tr key={c.id}>
                  <td className="px-3.5 py-3">
                    <Link href={`/staff/members/${c.memberId}#history`} className="font-semibold text-forest hover:underline">
                      {c.member.name}
                    </Link>
                    <span className="block font-mono text-[12.5px] text-muted">{c.member.code}</span>
                  </td>
                  <td className="px-3.5 py-3">
                    {CHANGE_KINDS[c.kind] ?? c.kind}
                    <span className="block text-[12.5px] text-muted">
                      {c.kind === "change" && c.fromPlan ? `${c.fromPlan.name} → ${c.toPlan?.name}` : (c.toPlan?.name ?? "")}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    {fmtDate(c.createdAt)}
                    <span className={`block text-[12.5px] ${age > 7 ? "font-semibold text-clay" : "text-muted"}`}>
                      {age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`} · {c.staff.name}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 font-semibold tabular-nums">{inr(c.amount)}</td>
                  <td className="px-3.5 py-3">{owner ? <SettlePayment changeId={c.id} amount={c.amount} /> : <span className="text-[13px] text-muted">Owner records payments</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pending.length === 0 && <p className="px-4 py-10 text-center text-muted">Nothing is owed. Every plan change, renewal and extension is paid.</p>}
      </div>

      {recent.length > 0 && (
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-2 text-[17px] font-semibold">Recently collected</h2>
          {recent.map((r) => (
            <div key={r.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-2 text-[14px]">
              <span>
                <Link href={`/staff/members/${r.memberId}#history`} className="font-semibold hover:text-forest">
                  {r.member.name}
                </Link>{" "}
                · {CHANGE_KINDS[r.kind] ?? r.kind} {r.toPlan ? `(${r.toPlan.name})` : ""}
              </span>
              <span className="tabular-nums text-muted">
                {inr(r.amount)} · {r.method?.toUpperCase()} · PAY-{r.paymentId}
                {r.payment ? ` · ${fmtDate(r.payment.createdAt)}` : ""}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
