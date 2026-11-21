import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtDate, startOfDay } from "@/lib/dates";
import { normalizePhone } from "@/lib/members";
import { memberState, stateLabel } from "@/lib/membership";
import { requireStaff } from "@/lib/session";
import { btnOutline, fieldCls } from "@/components/staff/ui";
import { StateBadge } from "./StateBadge";

export const dynamic = "force-dynamic";

type Search = { q?: string; plan?: string; status?: string; joinedFrom?: string; joinedTo?: string; endsFrom?: string; endsTo?: string };
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
const range = (from?: string, to?: string) =>
  isDate(from) || isDate(to)
    ? { ...(isDate(from) ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(isDate(to) ? { lte: new Date(`${to}T23:59:59`) } : {}) }
    : undefined;

export default async function MembersDirectory({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff(["owner", "desk"]);
  const sp = await searchParams;
  const today = startOfDay();
  const week = addDays(today, 8);
  const term = sp.q?.trim() ?? "";
  const phone = normalizePhone(term);
  const status = sp.status ?? "all";

  const where: Prisma.MemberWhereInput = {
    AND: [
      term
        ? {
            OR: [
              { name: { contains: term } },
              { code: { contains: term.toUpperCase() } },
              { phone: { contains: phone ?? (term.replace(/\D/g, "") || term) } },
              { email: { contains: term.toLowerCase() } },
            ],
          }
        : {},
      sp.plan ? { plan: { name: sp.plan } } : {},
      status === "active"
        ? { endDate: { gte: today }, suspendedAt: null }
        : status === "ending"
          ? { endDate: { gte: today, lt: week }, suspendedAt: null }
          : status === "expired"
            ? { endDate: { lt: today }, suspendedAt: null }
            : status === "suspended"
              ? { suspendedAt: { not: null } }
              : {},
      range(sp.joinedFrom, sp.joinedTo) ? { createdAt: range(sp.joinedFrom, sp.joinedTo) } : {},
      range(sp.endsFrom, sp.endsTo) ? { endDate: range(sp.endsFrom, sp.endsTo) } : {},
    ],
  };

  const [all, members, plans, pending] = await Promise.all([
    db.member.findMany({ select: { endDate: true, suspendedAt: true, plan: { select: { name: true } } } }),
    db.member.findMany({ where, include: { plan: true }, orderBy: { name: "asc" } }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.membershipChange.aggregate({ where: { paymentStatus: "pending" }, _count: true, _sum: { amount: true } }),
  ]);

  const states = all.map((m) => ({ ...memberState(m, today), plan: m.plan.name }));
  const current = states.filter((s) => s.state === "active" || s.state === "ending");
  const count = (fn: (s: (typeof states)[number]) => boolean) => states.filter(fn).length;
  const stats: [string, string, string?, string?][] = [
    ["Registered members", String(all.length)],
    ["Active", String(current.length), undefined, "?status=active"],
    [
      "Expired",
      String(count((s) => s.state === "expired")),
      count((s) => s.state === "suspended") ? `${count((s) => s.state === "suspended")} suspended` : undefined,
      "?status=expired",
    ],
    ["Expiring in 7 days", String(count((s) => s.state === "ending")), undefined, "/expiry?window=7"],
    ...plans.map((p): [string, string, string, string] => [
      `${p.name} members`,
      String(current.filter((s) => s.plan === p.name).length),
      "active",
      `?plan=${encodeURIComponent(p.name)}&status=active`,
    ]),
    ["Pending payments", String(pending._count), pending._count ? inr(pending._sum.amount ?? 0) : "None owed", "/dues"],
  ];
  const filtered = Object.values(sp).some(Boolean);

  return (
    <div className="grid content-start gap-5">
      <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        {stats.map(([label, value, hint, href]) => (
          <div key={label} className="bg-paper p-4">
            <dt className="text-[13.5px] text-muted">{label}</dt>
            <dd className={`mt-1 font-serif text-[26px] leading-tight ${label === "Pending payments" && value !== "0" ? "text-clay" : "text-forest"}`}>
              {href ? (
                <Link href={href.startsWith("?") ? `/staff/members${href}` : `/staff/members${href}`} className="hover:underline">
                  {value}
                </Link>
              ) : (
                value
              )}
            </dd>
            {hint && <dd className="text-[13px] text-muted">{hint}</dd>}
          </div>
        ))}
      </dl>

      <form method="get" className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1 text-[13px] font-semibold text-muted lg:col-span-2">
          Search
          <input type="search" name="q" defaultValue={term} placeholder="Name, member ID, phone or email" className={fieldCls} />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-muted">
          Plan
          <select name="plan" defaultValue={sp.plan ?? ""} className={fieldCls}>
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-muted">
          Status
          <select name="status" defaultValue={status} className={fieldCls}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="ending">Expiring in 7 days</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-2">
          <legend className="mb-1 text-[13px] font-semibold text-muted">Registered between</legend>
          <input type="date" name="joinedFrom" defaultValue={sp.joinedFrom} aria-label="Registered from" className={fieldCls} />
          <input type="date" name="joinedTo" defaultValue={sp.joinedTo} aria-label="Registered until" className={fieldCls} />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-2 sm:col-span-1 lg:col-span-2">
          <legend className="mb-1 text-[13px] font-semibold text-muted">Expires between</legend>
          <input type="date" name="endsFrom" defaultValue={sp.endsFrom} aria-label="Expires from" className={fieldCls} />
          <input type="date" name="endsTo" defaultValue={sp.endsTo} aria-label="Expires until" className={fieldCls} />
        </fieldset>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="min-h-11 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep">
            Apply filters
          </button>
          {filtered && (
            <Link href="/staff/members" className={btnOutline}>
              Clear
            </Link>
          )}
          <span className="ml-auto self-center text-[14px] text-muted">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </form>

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[860px] text-left text-[14.5px]">
          <caption className="sr-only">Member directory</caption>
          <thead className="text-[13.5px] text-muted">
            <tr>
              {["Member", "Member ID", "Phone", "Plan", "Registered", "Expires", "Status"].map((h) => (
                <th key={h} scope="col" className="px-3.5 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-t [&>tr]:border-line">
            {members.map((m) => {
              const s = memberState(m, today);
              return (
                <tr key={m.id} className="relative hover:bg-[#f6f1e6]">
                  <td className="px-3.5 py-3 font-semibold">
                    <Link href={`/staff/members/${m.id}`} className="after:absolute after:inset-0 hover:text-forest">
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-3.5 py-3 tabular-nums">{m.code}</td>
                  <td className="px-3.5 py-3 tabular-nums">{m.phone}</td>
                  <td className="px-3.5 py-3">{m.plan.name}</td>
                  <td className="whitespace-nowrap px-3.5 py-3">{fmtDate(m.createdAt)}</td>
                  <td className="whitespace-nowrap px-3.5 py-3">{fmtDate(m.endDate)}</td>
                  <td className="px-3.5 py-3">
                    <StateBadge state={s.state}>{stateLabel(s.state, s.daysLeft)}</StateBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold">No members match</p>
            <p className="mt-1 text-[14px] text-muted">{all.length ? "Try clearing a filter." : "Sign up your first member to get started."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
