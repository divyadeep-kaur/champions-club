import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/dates";
import { ageOn, membershipStatus } from "@/lib/members";
import { requireStaff } from "@/lib/session";
import { Badge, Table, Td } from "@/components/staff/ui";
import { RenewForm } from "../RenewForm";

export const dynamic = "force-dynamic";

function StatusBadge({ endDate }: { endDate: Date }) {
  const { status, daysLeft } = membershipStatus(endDate);
  if (status === "expired") return <Badge tone="clay">Expired</Badge>;
  if (status === "ending") return <Badge tone="clay">{daysLeft === 0 ? "Ends today" : `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}</Badge>;
  return <Badge tone="green">Active</Badge>;
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: string }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-[22px] font-medium text-forest">{title}</h2>
        {aside && <span className="text-[14px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export default async function MemberProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  await requireStaff(["owner", "desk"]);
  const { id } = await params;
  const { welcome } = await searchParams;
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  const [member, plans, payments, courtRates] = await Promise.all([
    db.member.findUnique({
      where: { id: memberId },
      include: {
        plan: true,
        bookings: { include: { court: true }, orderBy: { start: "desc" }, take: 8 },
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 6 },
        tabs: { orderBy: { openedAt: "desc" }, take: 6 },
        leads: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.payment.findMany({ where: { source: "membership", refId: memberId }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.court.aggregate({ _min: { walkInRate: true } }),
  ]);
  if (!member) notFound();

  const walkIn = courtRates._min.walkInRate ?? 0;
  const shopSpend = member.orders.reduce((s, o) => s + o.total, 0);
  const barSpend = member.tabs.filter((t) => t.status === "paid").reduce((s, t) => s + t.total, 0);

  return (
    <div className="space-y-8">
      <Link href="/staff/members" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest">
        <ArrowLeft className="size-4" /> All members
      </Link>

      {welcome && (
        <p role="status" className="flex items-center gap-2 border border-[#c9dfa0] bg-[#eef6dc] px-4 py-3 text-[15px] text-[#3d5a12]">
          <CheckCircle2 className="size-5" /> {member.name} is now a {member.plan.name} member. Code {member.code}.
        </p>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-mono text-[13px] text-muted">{member.code}</p>
          <h1 className="mt-1 font-serif text-[40px] font-semibold leading-none tracking-[-0.02em] text-forest">{member.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={member.plan.name === "Gold" ? "gold" : "gray"}>{member.plan.name}</Badge>
            <StatusBadge endDate={member.endDate} />
            <span className="text-[14px] text-muted">Member since {fmtDate(member.createdAt)}</span>
            {member.leads[0] && (
              <Link href={`/staff/leads/${member.leads[0].id}`} className="text-[14px] font-semibold text-forest underline underline-offset-4">
                Came from a {member.leads[0].interest} enquiry on {fmtDate(member.leads[0].createdAt)}
              </Link>
            )}
          </div>
        </div>
        <Link href={`/staff/bookings?member=${member.id}`} className="bg-forest px-5 py-2.5 text-[15px] font-semibold text-cream hover:bg-forest-deep">
          Book a court
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border border-line bg-paper p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Contact</h2>
          <dl className="mt-3 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4"><dt className="text-muted">Phone</dt><dd className="tabular-nums">{member.phone}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="truncate">{member.email ?? "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Age</dt><dd>{member.birthDate ? ageOn(member.birthDate, new Date()) : "—"}</dd></div>
          </dl>
          {member.notes && <p className="mt-3 border-t border-line pt-3 text-[14px] text-muted">{member.notes}</p>}
        </div>

        <div className="border border-line bg-paper p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{member.plan.name} plan includes</h2>
          <dl className="mt-3 space-y-2 text-[15px]">
            <div className="flex justify-between gap-4"><dt className="text-muted">Court, per hour</dt><dd>{member.plan.courtRate === 0 ? "Included" : `${inr(member.plan.courtRate)} (walk-in ${inr(walkIn)})`}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Shop discount</dt><dd>{member.plan.shopDiscount}%</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Café & bar discount</dt><dd>{member.plan.barDiscount ? `${member.plan.barDiscount}%` : "—"}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Fee</dt><dd>{inr(member.plan.monthlyFee)} / {member.plan.durationDays} days</dd></div>
          </dl>
        </div>

        <div className="border border-line bg-paper p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Membership</h2>
          <p className="mt-3 text-[15px]">
            {fmtDate(member.startDate)} → <span className="font-semibold">{fmtDate(member.endDate)}</span>
          </p>
          <div className="mt-4 border-t border-line pt-4">
            <RenewForm memberId={member.id} currentPlanId={member.planId} plans={plans} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section title="Court bookings" aside={`Last ${member.bookings.length}`}>
          <Table head={["Date", "Court", "Price", "Status"]} empty={member.bookings.length === 0}>
            {member.bookings.map((b) => (
              <tr key={b.id}>
                <Td className="tabular-nums">{fmtDate(b.start)} · {fmtTime(b.start)}</Td>
                <Td>{b.court.name}</Td>
                <Td className="tabular-nums">{b.price ? inr(b.price) : "Included"}</Td>
                <Td>{b.status === "booked" ? <Badge tone="green">Booked</Badge> : <Badge>Cancelled</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Membership payments">
          <Table head={["Date", "Amount", "Paid by", "Note"]} empty={payments.length === 0}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="tabular-nums">{fmtDate(p.createdAt)}</Td>
                <Td className="tabular-nums">{inr(p.amount)}</Td>
                <Td className="uppercase">{p.method}</Td>
                <Td className="text-muted">{p.note ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Shop purchases" aside={shopSpend ? `${inr(shopSpend)} recently` : undefined}>
          <Table head={["Date", "Items", "Discount", "Total"]} empty={member.orders.length === 0}>
            {member.orders.map((o) => (
              <tr key={o.id}>
                <Td className="tabular-nums">{fmtDate(o.createdAt)}</Td>
                <Td>{o.items.map((i) => `${i.product.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</Td>
                <Td className="tabular-nums">{o.discount ? `−${inr(o.discount)}` : "—"}</Td>
                <Td className="tabular-nums">{inr(o.total)}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Café & bar" aside={barSpend ? `${inr(barSpend)} recently` : undefined}>
          <Table head={["Date", "Discount", "Total", "Status"]} empty={member.tabs.length === 0}>
            {member.tabs.map((t) => (
              <tr key={t.id}>
                <Td className="tabular-nums">{fmtDate(t.openedAt)}</Td>
                <Td className="tabular-nums">{t.discount ? `−${inr(t.discount)}` : "—"}</Td>
                <Td className="tabular-nums">{inr(t.total)}</Td>
                <Td>{t.status === "open" ? <Badge tone="clay">Open tab</Badge> : <Badge>Paid</Badge>}</Td>
              </tr>
            ))}
          </Table>
        </Section>
      </div>
    </div>
  );
}
