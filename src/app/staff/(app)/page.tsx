import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtTime, startOfDay } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { Badge, PageHeader, Stat, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await requireStaff();
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  const [paymentsToday, bookingsToday, upcoming, openTabs, expiring, products, newLeads] = await Promise.all([
    db.payment.groupBy({ by: ["source"], where: { createdAt: { gte: today, lt: tomorrow } }, _sum: { amount: true } }),
    db.booking.count({ where: { status: "booked", start: { gte: today, lt: tomorrow } } }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: new Date(now.getTime() - 30 * 60 * 1000), lt: tomorrow } },
      include: { court: true, member: { include: { plan: true } } },
      orderBy: { start: "asc" },
      take: 6,
    }),
    db.tab.count({ where: { status: "open" } }),
    db.member.count({ where: { endDate: { gte: today, lt: addDays(today, 8) } } }),
    db.product.findMany({ select: { stock: true, lowStockAt: true } }),
    db.lead.count({ where: { status: "new" } }),
  ]);

  const bySource = Object.fromEntries(paymentsToday.map((p) => [p.source, p._sum.amount ?? 0]));
  const revenueToday = Object.values(bySource).reduce((a, b) => a + b, 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockAt).length;
  const isOwner = session.role === "owner";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${session.name.split(" ")[0]}`}
        description={now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isOwner && (
          <Stat
            label="Revenue today"
            value={inr(revenueToday)}
            hint={`Courts ${inr(bySource.court ?? 0)} · Shop ${inr(bySource.shop ?? 0)} · Bar ${inr(bySource.bar ?? 0)}`}
          />
        )}
        <Stat label="Court bookings today" value={String(bookingsToday)} hint="Across 6 courts" />
        <Stat label="Open bar tabs" value={String(openTabs)} hint="Waiting to be settled" />
        <Stat label="Memberships ending" value={String(expiring)} hint="In the next 7 days" tone={expiring ? "warn" : "default"} />
        {!isOwner && <Stat label="Low stock items" value={String(lowStock)} hint="At or below reorder level" tone={lowStock ? "warn" : "default"} />}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-[24px] font-medium text-forest">Coming up on court</h2>
            <Link href="/staff/bookings" className="text-[14px] font-semibold text-forest underline underline-offset-4">
              All bookings
            </Link>
          </div>
          <Table head={["Time", "Court", "Player", "Price"]} empty={upcoming.length === 0}>
            {upcoming.map((b) => (
              <tr key={b.id}>
                <Td className="tabular-nums">{fmtTime(b.start)}</Td>
                <Td>{b.court.name}</Td>
                <Td>
                  {b.member ? (
                    <span className="flex items-center gap-2">
                      {b.member.name} <Badge tone={b.member.plan.name === "Gold" ? "gold" : "gray"}>{b.member.plan.name}</Badge>
                    </span>
                  ) : (
                    <span className="text-muted">{b.guestName ?? "Walk-in"}</span>
                  )}
                </Td>
                <Td className="tabular-nums">{b.price ? inr(b.price) : "Included"}</Td>
              </tr>
            ))}
          </Table>
        </div>

        <div className="space-y-3">
          <h2 className="font-serif text-[24px] font-medium text-forest">Needs attention</h2>
          <ul className="divide-y divide-line border border-line bg-paper">
            {[
              { href: "/staff/members", text: `${expiring} memberships end this week`, show: expiring > 0 },
              { href: "/staff/shop", text: `${lowStock} products are low on stock`, show: lowStock > 0 },
              { href: "/staff/leads", text: `${newLeads} new enquiries to follow up`, show: newLeads > 0 },
              { href: "/staff/bar", text: `${openTabs} bar tabs still open`, show: openTabs > 0 },
            ]
              .filter((i) => i.show)
              .map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="flex items-center justify-between px-4 py-3.5 text-[15px] hover:bg-cream">
                    {i.text}
                    <span aria-hidden="true" className="text-forest">→</span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
