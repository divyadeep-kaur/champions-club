import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtTime } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { ComingNext, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

export default async function BarPage() {
  await requireStaff(["owner", "bar"]);
  const [tabs, tables] = await Promise.all([
    db.tab.findMany({ where: { status: "open" }, include: { table: true, member: true, items: true }, orderBy: { openedAt: "asc" } }),
    db.barTable.findMany({ orderBy: { id: "asc" } }),
  ]);
  const busy = new Set(tabs.map((t) => t.tableId));

  return (
    <div className="space-y-6">
      <PageHeader title="Café & Bar" description={`${tabs.length} open tabs · ${tables.length - busy.size} of ${tables.length} tables free`} />
      <Table head={["Table", "Customer", "Opened", "Items", "Running total"]} empty={tabs.length === 0}>
        {tabs.map((t) => (
          <tr key={t.id}>
            <Td className="font-medium">{t.table?.label ?? "Counter"}</Td>
            <Td>{t.member?.name ?? <span className="text-muted">{t.guestName ?? "Guest"}</span>}</Td>
            <Td className="tabular-nums">{fmtTime(t.openedAt)}</Td>
            <Td className="tabular-nums">{t.items.reduce((n, i) => n + i.qty, 0)}</Td>
            <Td className="tabular-nums">{inr(t.total)}</Td>
          </tr>
        ))}
      </Table>
      <ComingNext items={["Open a tab on a table, add items from the menu", "Member discount applied automatically", "Settle by cash, card or UPI", "Shifts and the day's earnings"]} />
    </div>
  );
}
