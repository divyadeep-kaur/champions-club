import { db } from "@/lib/db";
import { daysBetween, fmtDate, startOfDay } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { Badge, ComingNext, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  await requireStaff(["owner", "desk"]);
  const members = await db.member.findMany({ include: { plan: true }, orderBy: { name: "asc" } });
  const today = startOfDay();

  return (
    <div className="space-y-6">
      <PageHeader title="Members" description={`${members.length} members across Gold, Silver and Junior plans`} />
      <Table head={["Code", "Name", "Phone", "Plan", "Membership"]} empty={members.length === 0}>
        {members.map((m) => {
          const left = daysBetween(today, m.endDate);
          return (
            <tr key={m.id}>
              <Td className="font-mono text-[13px] text-muted">{m.code}</Td>
              <Td className="font-medium">{m.name}</Td>
              <Td className="tabular-nums">{m.phone}</Td>
              <Td>
                <Badge tone={m.plan.name === "Gold" ? "gold" : "gray"}>{m.plan.name}</Badge>
              </Td>
              <Td>
                {left < 0 ? (
                  <Badge tone="clay">Expired {fmtDate(m.endDate)}</Badge>
                ) : left <= 7 ? (
                  <Badge tone="clay">Ends in {left} {left === 1 ? "day" : "days"}</Badge>
                ) : (
                  <span className="text-muted">Until {fmtDate(m.endDate)}</span>
                )}
              </Td>
            </tr>
          );
        })}
      </Table>
      <ComingNext items={["Sign up a new member with plan selection", "Quick search by name, phone or code", "Member profile with booking, shop and bar history", "Renew a membership"]} />
    </div>
  );
}
