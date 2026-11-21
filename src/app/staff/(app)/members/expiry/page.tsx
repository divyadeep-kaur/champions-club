import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtDate, startOfDay } from "@/lib/dates";
import { CHANGE_KINDS, memberState, stateLabel } from "@/lib/membership";
import { requireStaff } from "@/lib/session";
import { StateBadge } from "../StateBadge";

export const dynamic = "force-dynamic";

type Search = { window?: string; plan?: string; sort?: string; pending?: string };

export default async function ExpiryPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff(["owner", "desk"]);
  const sp = await searchParams;
  const today = startOfDay();
  const win = ["7", "30", "active", "expired"].includes(sp.window ?? "") ? sp.window! : "7";
  const sort = sp.sort === "desc" ? "desc" : "asc";

  const windows: { key: string; label: string; where: Prisma.MemberWhereInput }[] = [
    { key: "7", label: "Expiring within 7 days", where: { endDate: { gte: today, lt: addDays(today, 8) } } },
    { key: "30", label: "Expiring within 30 days", where: { endDate: { gte: today, lt: addDays(today, 31) } } },
    { key: "active", label: "All active", where: { endDate: { gte: today } } },
    { key: "expired", label: "Already expired", where: { endDate: { lt: today } } },
  ];
  const chosen = windows.find((w) => w.key === win)!;
  const planFilter: Prisma.MemberWhereInput = sp.plan ? { plan: { name: sp.plan } } : {};

  const [members, counts, plans, pending] = await Promise.all([
    db.member.findMany({ where: { AND: [chosen.where, planFilter, { suspendedAt: null }] }, include: { plan: true }, orderBy: { endDate: sort } }),
    Promise.all(windows.map((w) => db.member.count({ where: { AND: [w.where, planFilter, { suspendedAt: null }] } }))),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.membershipChange.findMany({ where: { paymentStatus: "pending" }, include: { member: true, toPlan: true }, orderBy: { createdAt: "asc" } }),
  ]);
  const link = (extra: Partial<Search>) => {
    const p = new URLSearchParams();
    Object.entries({ window: win, plan: sp.plan, sort, ...extra }).forEach(([k, v]) => v && p.set(k, v));
    return `/staff/members/expiry?${p}`;
  };

  return (
    <div className="grid content-start gap-5">
      {sp.pending && (
        <section className="border border-line bg-paper" aria-labelledby="pending">
          <h2 id="pending" className="border-b border-line px-5 py-3.5 text-[17px] font-semibold">
            Pending membership payments
          </h2>
          {pending.length === 0 ? (
            <p className="px-5 py-6 text-muted">Nothing is owed.</p>
          ) : (
            <ul>
              {pending.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[14.5px] first:border-t-0">
                  <span>
                    <Link href={`/staff/members/${c.memberId}#history`} className="font-semibold hover:text-forest">
                      {c.member.name}
                    </Link>{" "}
                    · {CHANGE_KINDS[c.kind]} {c.toPlan ? `(${c.toPlan.name})` : ""} · {fmtDate(c.createdAt)}
                  </span>
                  <strong className="tabular-nums text-clay">{inr(c.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Expiry window" className="flex flex-wrap gap-2">
          {windows.map((w, i) => (
            <Link
              key={w.key}
              href={link({ window: w.key })}
              aria-current={win === w.key ? "page" : undefined}
              className={`min-h-10 border px-3.5 py-2 text-[14px] font-semibold ${win === w.key ? "border-forest bg-forest text-cream" : "border-line bg-paper text-forest hover:border-forest"}`}
            >
              {w.label} <span className="font-normal opacity-75">{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="window" value={win} />
          <label className="sr-only" htmlFor="plan">
            Plan
          </label>
          <select id="plan" name="plan" defaultValue={sp.plan ?? ""} className="min-h-10 border border-[#b5aa98] bg-white px-2.5 text-[14.5px]">
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="min-h-10 border border-[#b5aa98] bg-white px-2.5 text-[14.5px]">
            <option value="asc">Soonest expiry first</option>
            <option value="desc">Latest expiry first</option>
          </select>
          <button type="submit" className="min-h-10 border-[1.5px] border-forest px-3 text-[14px] font-semibold text-forest hover:bg-forest/5">
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-[14.5px]">
          <caption className="sr-only">{chosen.label}</caption>
          <thead className="text-[13.5px] text-muted">
            <tr>
              {["Member", "Plan", "Phone", "Expires", "Status", ""].map((h, i) => (
                <th key={i} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {members.map((m) => {
              const s = memberState(m, today);
              return (
                <tr key={m.id} className="hover:bg-[#f6f1e6]">
                  <td className="px-3.5 py-3">
                    <Link href={`/staff/members/${m.id}`} className="font-semibold hover:text-forest">
                      {m.name}
                    </Link>
                    <span className="block text-[12.5px] text-muted">{m.code}</span>
                  </td>
                  <td className="px-3.5 py-3">{m.plan.name}</td>
                  <td className="px-3.5 py-3 tabular-nums">
                    <a href={`tel:+91${m.phone}`} className="hover:text-forest">
                      {m.phone}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3">{fmtDate(m.endDate)}</td>
                  <td className="px-3.5 py-3">
                    <StateBadge state={s.state}>{s.state === "expired" ? `Expired ${-s.daysLeft} d ago` : stateLabel(s.state, s.daysLeft)}</StateBadge>
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <Link href={`/staff/members/${m.id}#renew`} className="text-[14px] font-semibold text-forest underline underline-offset-4">
                      Renew
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && <p className="px-4 py-12 text-center text-muted">No memberships in this window.</p>}
      </div>
      <p className="text-[13.5px] text-muted">
        Expired memberships stay on record. Until renewed they pay walk-in court rates and get no shop or café discount.
      </p>
    </div>
  );
}
