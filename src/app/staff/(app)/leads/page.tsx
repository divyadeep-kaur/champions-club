import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/dates";
import { STAGES, stageLabel } from "@/lib/leads";
import { requireStaff } from "@/lib/session";
import { PageHeader, Table, Td } from "@/components/staff/ui";
import { LeadBadge } from "./LeadBadge";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff(["owner", "desk"]);
  const { status = "open" } = await searchParams;

  const [leads, counts] = await Promise.all([
    db.lead.findMany({
      where: status === "open" ? { status: { notIn: ["won", "lost"] } } : status === "all" ? {} : { status },
      include: { activities: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const open = counts.filter((c) => c.status !== "won" && c.status !== "lost").reduce((n, c) => n + c._count, 0);
  const tabs = [{ key: "open", label: "Open", n: open }, ...STAGES.map((s) => ({ key: s.key, label: s.label, n: count(s.key) })), { key: "lost", label: "Lost", n: count("lost") }, { key: "all", label: "All", n: counts.reduce((n, c) => n + c._count, 0) }];

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description={`${count("new")} new to call back · ${open} open in the pipeline`} />

      <nav aria-label="Filter by stage" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "open" ? "/staff/leads" : `/staff/leads?status=${t.key}`}
            aria-current={status === t.key ? "true" : undefined}
            className={`flex items-center gap-2 px-3 py-2 text-[14px] font-medium ${status === t.key ? "bg-forest text-cream" : "text-ink hover:bg-paper"}`}
          >
            {t.label}
            <span className={`text-[12.5px] tabular-nums ${status === t.key ? "text-cream/70" : "text-muted"}`}>{t.n}</span>
          </Link>
        ))}
      </nav>

      <Table head={["Received", "Name", "Interested in", "Wants to play", "Last update", "Stage"]} empty={leads.length === 0}>
        {leads.map((l) => (
          <tr key={l.id} className="group relative hover:bg-cream/70">
            <Td className="whitespace-nowrap tabular-nums text-muted">{fmtDate(l.createdAt)}</Td>
            <Td>
              <Link href={`/staff/leads/${l.id}`} className="font-medium after:absolute after:inset-0 group-hover:underline">
                {l.name}
              </Link>
              <p className="tabular-nums text-[13px] text-muted">{l.phone}</p>
            </Td>
            <Td className="capitalize">
              {l.interest}
              {l.quoteAmount ? <span className="block text-[13px] normal-case text-muted">Quoted {inr(l.quoteAmount)}</span> : null}
            </Td>
            <Td className="whitespace-nowrap tabular-nums">{l.preferredAt ? `${fmtDate(l.preferredAt)}, ${fmtTime(l.preferredAt)}` : "—"}</Td>
            <Td className="max-w-[260px] truncate text-[13.5px] text-muted">{l.activities[0]?.text ?? l.message ?? "—"}</Td>
            <Td>
              <LeadBadge status={l.status} />
            </Td>
          </tr>
        ))}
      </Table>
      <p className="text-[13.5px] text-muted">Enquiries from the website’s trial form land here as {stageLabel("new")}.</p>
    </div>
  );
}
