import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, fmtDate, startOfDay } from "@/lib/dates";
import { membershipStatus, normalizePhone } from "@/lib/members";
import { requireStaff } from "@/lib/session";
import { Badge, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "ending", label: "Ending soon" },
  { key: "expired", label: "Expired" },
] as const;

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireStaff(["owner", "desk"]);
  const { q = "", status = "all" } = await searchParams;
  const today = startOfDay();
  const weekOut = addDays(today, 8);

  const term = q.trim();
  const phone = normalizePhone(term);
  const where: Prisma.MemberWhereInput = {
    AND: [
      term
        ? { OR: [{ name: { contains: term } }, { code: { contains: term.toUpperCase() } }, { phone: { contains: phone ?? (term.replace(/\D/g, "") || term) } }] }
        : {},
      status === "active" ? { endDate: { gte: weekOut } } : status === "ending" ? { endDate: { gte: today, lt: weekOut } } : status === "expired" ? { endDate: { lt: today } } : {},
    ],
  };

  const [members, total] = await Promise.all([db.member.findMany({ where, include: { plan: true }, orderBy: { name: "asc" } }), db.member.count()]);

  const href = (s: string) => `/staff/members?${new URLSearchParams({ ...(term ? { q: term } : {}), ...(s !== "all" ? { status: s } : {}) })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${total} members across Gold, Silver and Junior plans`}
        action={
          <Link href="/staff/members/new" className="inline-flex items-center gap-2 bg-forest px-5 py-2.5 text-[15px] font-semibold text-cream hover:bg-forest-deep">
            <Plus className="size-4" /> New member
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <form role="search" className="relative w-full max-w-[420px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={term}
            placeholder="Search name, phone or member code"
            aria-label="Search members"
            autoFocus
            className="w-full border border-line bg-paper py-2.5 pl-10 pr-3 text-[15px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
        </form>
        <nav aria-label="Filter by membership" className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={href(f.key)}
              aria-current={status === f.key ? "true" : undefined}
              className={`px-3 py-2 text-[14px] font-medium transition-colors ${status === f.key ? "bg-forest text-cream" : "text-ink hover:bg-paper"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      <Table head={["Code", "Name", "Phone", "Plan", "Membership"]} empty={members.length === 0}>
        {members.map((m) => {
          const { status: s, daysLeft } = membershipStatus(m.endDate, today);
          return (
            <tr key={m.id} className="group relative hover:bg-cream/70">
              <Td className="font-mono text-[13px] text-muted">{m.code}</Td>
              <Td className="font-medium">
                <Link href={`/staff/members/${m.id}`} className="after:absolute after:inset-0 group-hover:underline">
                  {m.name}
                </Link>
              </Td>
              <Td className="tabular-nums">{m.phone}</Td>
              <Td>
                <Badge tone={m.plan.name === "Gold" ? "gold" : "gray"}>{m.plan.name}</Badge>
              </Td>
              <Td>
                {s === "expired" ? (
                  <Badge tone="clay">Expired {fmtDate(m.endDate)}</Badge>
                ) : s === "ending" ? (
                  <Badge tone="clay">{daysLeft === 0 ? "Ends today" : `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}</Badge>
                ) : (
                  <span className="text-muted">Until {fmtDate(m.endDate)}</span>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
      {term && members.length === 0 && (
        <p className="text-[15px] text-muted">
          No member matches “{term}”.{" "}
          <Link href="/staff/members/new" className="font-semibold text-forest underline underline-offset-4">
            Sign them up
          </Link>
        </p>
      )}
    </div>
  );
}
