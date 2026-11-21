import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, startOfDay } from "@/lib/dates";
import { CHANGE_POLICIES } from "@/lib/membership";
import { getDefaultPolicy } from "@/lib/membershipService";
import { requireStaff } from "@/lib/session";
import { PlanForm } from "./PlanForm";
import { PolicyForm } from "./PolicyForm";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const session = await requireStaff(["owner", "desk"]);
  const owner = session.role === "owner";
  const today = startOfDay();
  const [plans, policy, audits] = await Promise.all([
    db.plan.findMany({
      orderBy: { monthlyFee: "desc" },
      include: { _count: { select: { members: { where: { endDate: { gte: today }, suspendedAt: null } } } } },
    }),
    getDefaultPolicy(),
    db.planAudit.findMany({ include: { plan: true, staff: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="grid content-start gap-5">
      <div className="grid gap-4 xl:grid-cols-3">
        {plans.map((p) => (
          <section key={p.id} className="border border-line bg-paper p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-[26px] font-semibold text-forest">{p.name}</h2>
              <span className="text-[13.5px] text-muted">{p._count.members} active</span>
            </div>
            <p className="mt-1 font-serif text-[30px] leading-tight">
              {inr(p.monthlyFee)} <span className="font-sans text-[14px] text-muted">for {p.durationDays} days</span>
            </p>
            <p className="mt-1 text-[14.5px] text-[#3c4a43]">{p.description}</p>
            <dl className="mt-3 grid grid-cols-3 gap-px border border-line bg-line text-center">
              {[
                ["Courts", p.courtRate === 0 ? "Free" : `${inr(p.courtRate)}/hr`],
                ["Shop", `${p.shopDiscount}% off`],
                ["Café & bar", `${p.barDiscount}% off`],
              ].map(([k, v]) => (
                <div key={k} className="bg-cream px-2 py-2.5">
                  <dt className="text-[12px] text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {p.name === "Junior" && <p className="mt-2 text-[13px] text-muted">Only for players under 18 on the day they join, renew or switch.</p>}
            {owner && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[14px] font-semibold text-forest">Edit price and benefits</summary>
                <div className="mt-3">
                  <PlanForm plan={p} />
                </div>
              </details>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[17px] font-semibold">Mid-cycle plan changes</h2>
          <p className="mb-3 text-[14px] text-muted">
            The club has no fixed rule for charging when a member switches plan before their expiry, so you choose. This is the default the change form starts
            with; you can override it for any single change.
          </p>
          {owner ? (
            <PolicyForm current={policy} />
          ) : (
            <p className="text-[14.5px]">Current default: {CHANGE_POLICIES.find((x) => x.key === policy)?.label ?? "Not set"}</p>
          )}
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="text-[17px] font-semibold">Plan edit history</h2>
          {audits.length === 0 ? (
            <p className="mt-2 text-[14.5px] text-muted">Plan prices and benefits haven’t been changed yet.</p>
          ) : (
            <ul className="mt-2 grid">
              {audits.map((a) => (
                <li key={a.id} className="border-t border-line py-2.5 text-[14px] first:border-t-0">
                  <strong>{a.plan.name}</strong> · {a.changes}
                  <span className="block text-[12.5px] text-muted">
                    {fmtDate(a.createdAt)} · {a.staff.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
