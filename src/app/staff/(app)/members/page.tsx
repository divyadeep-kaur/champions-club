import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtDate, startOfDay } from "@/lib/dates";
import { membershipStatus, normalizePhone } from "@/lib/members";
import { requireStaff } from "@/lib/session";
import { btnOutline, btnPrimary, fieldCls, labelCls } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; plan?: string; selected?: string };

const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff(["owner", "desk"]);
  const { q = "", status = "all", plan = "all", selected } = await searchParams;
  const today = startOfDay();
  const weekOut = addDays(today, 8);

  const term = q.trim();
  const phone = normalizePhone(term);
  const where: Prisma.MemberWhereInput = {
    AND: [
      term
        ? {
            OR: [{ name: { contains: term } }, { code: { contains: term.toUpperCase() } }, { phone: { contains: phone ?? (term.replace(/\D/g, "") || term) } }],
          }
        : {},
      status === "active"
        ? { endDate: { gte: weekOut } }
        : status === "ending"
          ? { endDate: { gte: today, lt: weekOut } }
          : status === "expired"
            ? { endDate: { lt: today } }
            : {},
      plan !== "all" ? { plan: { name: plan } } : {},
    ],
  };

  const [members, plans] = await Promise.all([
    db.member.findMany({ where, include: { plan: true }, orderBy: { name: "asc" } }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
  ]);
  const pickedId = Number(selected) || members[0]?.id;
  const picked = pickedId
    ? await db.member.findUnique({
        where: { id: pickedId },
        include: {
          plan: true,
          bookings: { include: { court: true }, orderBy: { start: "desc" }, take: 4 },
          orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 3 },
          tabs: { where: { status: "paid" }, orderBy: { openedAt: "desc" }, take: 3 },
        },
      })
    : null;
  const payments = picked ? await db.payment.findMany({ where: { source: "membership", refId: picked.id }, orderBy: { createdAt: "desc" }, take: 2 }) : [];

  const history = picked
    ? [
        ...picked.bookings.map((b) => ({
          when: b.start,
          what: `${b.court.name}${b.status === "cancelled" ? " (cancelled)" : ""}`,
          amount: b.price ? inr(b.price) : "—",
        })),
        ...picked.orders.map((o) => ({ when: o.createdAt, what: o.items.map((i) => i.product.name).join(", "), amount: inr(o.total) })),
        ...picked.tabs.map((t) => ({ when: t.openedAt, what: "Café & bar tab", amount: inr(t.total) })),
        ...payments.map((p) => ({ when: p.createdAt, what: p.note ?? "Membership", amount: inr(p.amount) })),
      ]
        .sort((a, b) => b.when.getTime() - a.when.getTime())
        .slice(0, 7)
    : [];

  const qs = (extra: Record<string, string>) =>
    `/staff/members?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(status !== "all" ? { status } : {}), ...(plan !== "all" ? { plan } : {}), ...extra })}`;

  return (
    <div className="flex flex-wrap content-start gap-6">
      <div className="grid min-w-0 flex-[999_1_560px] content-start gap-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Members</h1>
          <Link href="/staff/members/new" className={btnPrimary}>
            Sign up a member
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-2.5">
          <label className={`${labelCls} flex-[1_1_280px]`}>
            Search by name, phone or member code
            <input type="search" name="q" defaultValue={term} className={fieldCls} />
          </label>
          <label className={labelCls}>
            Plan
            <select name="plan" defaultValue={plan} className={fieldCls}>
              <option value="all">All plans</option>
              {plans.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className={labelCls}>
            Status
            <select name="status" defaultValue={status} className={fieldCls}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="ending">Ending soon</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <button type="submit" className={btnOutline}>
            Filter
          </button>
        </form>

        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[680px] text-[14.5px]">
            <thead>
              <tr className="text-left text-muted">
                {["Member", "Code", "Phone", "Plan", "Ends", "Status"].map((h) => (
                  <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const s = membershipStatus(m.endDate, today);
                const on = m.id === picked?.id;
                return (
                  <tr key={m.id} className={`relative border-t border-line ${on ? "bg-[#e3efc7]" : "hover:bg-cream"}`}>
                    <td className="px-3.5 py-3 font-semibold">
                      <Link
                        href={qs({ selected: String(m.id) })}
                        scroll={false}
                        aria-current={on ? "true" : undefined}
                        className="after:absolute after:inset-0"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-3.5 py-3 tabular-nums">{m.code}</td>
                    <td className="px-3.5 py-3 tabular-nums">{m.phone}</td>
                    <td className="px-3.5 py-3">{m.plan.name}</td>
                    <td className="px-3.5 py-3">{short(m.endDate)}</td>
                    <td
                      className={`px-3.5 py-3 font-semibold ${s.status === "active" ? "text-[#4d7a12]" : s.status === "ending" ? "text-[#a8411f]" : "text-muted"}`}
                    >
                      {s.status === "active" ? "Active" : s.status === "ending" ? (s.daysLeft === 0 ? "Ends today" : `Ends in ${s.daysLeft}d`) : "Expired"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="px-4 py-10 text-center text-muted">
              No member matches.{" "}
              <Link href="/staff/members/new" className="font-semibold text-forest underline underline-offset-4">
                Sign them up
              </Link>
            </p>
          )}
        </div>
      </div>

      {picked && (
        <aside className="grid min-w-0 flex-[1_1_320px] content-start gap-4 border border-line bg-paper p-6">
          <div>
            <h2 className="font-serif text-[26px] text-forest">{picked.name}</h2>
            <p className="mt-1 text-[14.5px] text-muted">
              {picked.code} · {picked.phone}
            </p>
          </div>
          <div className="grid gap-1.5 bg-forest p-4 text-[14.5px] text-cream">
            <div className="flex justify-between">
              <strong className="text-[18px]">{picked.plan.name}</strong>
              <span>
                {membershipStatus(picked.endDate, today).status === "expired" ? "Ended" : "Ends"} {short(picked.endDate)}
              </span>
            </div>
            <div className="opacity-85">
              Courts {picked.plan.courtRate === 0 ? "free" : `${inr(picked.plan.courtRate)}/hr`} · Shop {picked.plan.shopDiscount}% · Bar{" "}
              {picked.plan.barDiscount}%
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/staff/members/${picked.id}#renew`} className={btnOutline}>
              Renew
            </Link>
            <Link href={`/staff/bookings?member=${picked.id}`} className={btnOutline}>
              Book a court
            </Link>
          </div>
          <Link href={`/staff/members/${picked.id}`} className="text-[14.5px] font-bold text-forest">
            Open full profile and renewals →
          </Link>
          <h3 className="mt-1 text-[16px] font-semibold">History</h3>
          {history.length === 0 && <p className="text-[14px] text-muted">Nothing yet.</p>}
          {history.map((h, i) => (
            <div key={i} className="grid grid-cols-[70px_minmax(0,1fr)_auto] gap-2.5 border-t border-[#ece5d6] py-2 text-[14px]">
              <span className="text-muted">{short(h.when)}</span>
              <span className="truncate">{h.what}</span>
              <span className="font-semibold tabular-nums">{h.amount}</span>
            </div>
          ))}
          <p className="text-[12.5px] text-muted">Member since {fmtDate(picked.createdAt)}</p>
        </aside>
      )}
    </div>
  );
}
