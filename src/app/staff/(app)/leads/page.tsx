import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { Badge, ComingNext, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

const tone: Record<string, "green" | "clay" | "gray" | "gold"> = { new: "clay", contacted: "gold", quoted: "gold", won: "green", lost: "gray" };

export default async function LeadsPage() {
  await requireStaff(["owner", "desk"]);
  const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description={`${leads.filter((l) => l.status === "new").length} new enquiries`} />
      <Table head={["Received", "Name", "Phone", "Interested in", "Quote", "Status"]} empty={leads.length === 0}>
        {leads.map((l) => (
          <tr key={l.id}>
            <Td className="tabular-nums text-muted">{fmtDate(l.createdAt)}</Td>
            <Td>
              <p className="font-medium">{l.name}</p>
              {l.message && <p className="max-w-[320px] truncate text-[13px] text-muted">{l.message}</p>}
            </Td>
            <Td className="tabular-nums">{l.phone}</Td>
            <Td className="capitalize">{l.interest}</Td>
            <Td className="tabular-nums">{l.quoteAmount ? inr(l.quoteAmount) : "—"}</Td>
            <Td>
              <Badge tone={tone[l.status]}>{l.status}</Badge>
            </Td>
          </tr>
        ))}
      </Table>
      <ComingNext items={["Enquiry and trial forms on the public site feed this list", "Move a lead through contacted, quoted, won", "Convert a won lead into a member"]} />
    </div>
  );
}
