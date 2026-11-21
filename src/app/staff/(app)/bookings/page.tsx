import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtTime, startOfDay } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { Badge, ComingNext, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  await requireStaff(["owner", "desk"]);
  const today = startOfDay();
  const bookings = await db.booking.findMany({
    where: { start: { gte: today, lt: addDays(today, 1) } },
    include: { court: true, member: true },
    orderBy: [{ start: "asc" }, { courtId: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" description={`Today · ${bookings.length} bookings`} />
      <Table head={["Time", "Court", "Player", "Type", "Price", "Status"]} empty={bookings.length === 0}>
        {bookings.map((b) => (
          <tr key={b.id}>
            <Td className="tabular-nums">
              {fmtTime(b.start)} – {fmtTime(b.end)}
            </Td>
            <Td>{b.court.name}</Td>
            <Td>{b.member ? b.member.name : <span className="text-muted">{b.guestName ?? "Walk-in"}</span>}</Td>
            <Td className="capitalize">{b.type}</Td>
            <Td className="tabular-nums">{b.price ? inr(b.price) : "Included"}</Td>
            <Td>{b.status === "booked" ? <Badge tone="green">Booked</Badge> : <Badge>Cancelled</Badge>}</Td>
          </tr>
        ))}
      </Table>
      <ComingNext items={["Court × time grid with free slots every 30 minutes", "Book for a member or walk-in with the right price", "Block double booking and a 3rd booking in a day", "Cancel a booking, Friday social play"]} />
    </div>
  );
}
