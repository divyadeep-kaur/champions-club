import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { addDays, fmtTime, startOfDay } from "@/lib/dates";
import { asPeriod, incomeSummary, PERIODS, SOURCE_LABEL, METHOD_LABEL } from "@/lib/reports";
import { requireStaff } from "@/lib/session";
import { btnOutline } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

const sourceColor: Record<string, string> = { court: "bg-forest", membership: "bg-[#4d7a12]", shop: "bg-clay", bar: "bg-[#8a6d3b]" };
const card = "border border-line bg-paper p-6";

function Bar({ label, pct, value, color }: { label: string; pct: number; value: string; color: string }) {
  return (
    <div className="mb-3 grid grid-cols-[110px_minmax(0,1fr)_80px] items-center gap-3 text-[14.5px]">
      <span>{label}</span>
      <div className="h-3.5 bg-[#ece5d6]" role="img" aria-label={`${label} ${value}`}>
        <div className={`h-3.5 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-right font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Row({ left, right, tone }: { left: React.ReactNode; right: React.ReactNode; tone?: string }) {
  return (
    <div className="flex justify-between gap-2 border-t border-line py-2.5 text-[14.5px]">
      <span>{left}</span>
      <span className={tone}>{right}</span>
    </div>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const session = await requireStaff();
  const period = asPeriod((await searchParams).period);
  const now = new Date();
  const today = startOfDay(now);
  const isOwner = session.role === "owner";

  const [income, products, expiring, inUse, openTabs, toPack, newLeads, latest, courtCount] = await Promise.all([
    incomeSummary(period, now),
    db.product.findMany({ select: { name: true, stock: true, lowStockAt: true } }),
    db.member.findMany({ where: { endDate: { gte: today, lt: addDays(today, 8) } }, include: { plan: true }, orderBy: { endDate: "asc" }, take: 5 }),
    db.booking.count({ where: { status: "booked", start: { lte: now }, end: { gt: now } } }),
    db.tab.count({ where: { status: "open" } }),
    db.order.count({ where: { channel: "online", status: { in: ["pending", "ready"] } } }),
    db.lead.count({ where: { status: "new" } }),
    db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.court.count(),
  ]);

  const low = products
    .filter((p) => p.stock <= p.lowStockAt)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4);
  const greeting = now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening";
  const periodLong = PERIODS.find((p) => p.key === period)!.long;

  return (
    <div className="grid content-start gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">
            Good {greeting}, {session.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-muted">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        {isOwner && (
          <div className="flex flex-wrap gap-2.5">
            <div role="group" aria-label="Period" className="flex border-[1.5px] border-forest">
              {PERIODS.map((p) => (
                <Link
                  key={p.key}
                  href={p.key === "today" ? "/staff" : `/staff?period=${p.key}`}
                  aria-current={period === p.key ? "true" : undefined}
                  className={`flex min-h-11 items-center px-4 font-semibold ${period === p.key ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
                >
                  {p.label}
                </Link>
              ))}
            </div>
            <a href={`/staff/export?period=${period}`} className={`${btnOutline} bg-paper`} download>
              Export CSV
            </a>
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <div className="bg-forest p-5 text-cream">
              <div className="text-[14px] opacity-85">Total income · {periodLong}</div>
              <div className="mt-1.5 font-serif text-[38px] leading-tight tabular-nums">{inr(income.total)}</div>
            </div>
            {income.sources.map((s) => (
              <div key={s.key} className="border border-line bg-paper p-5">
                <div className="text-[14px] text-muted">{s.label}</div>
                <div className="mt-1.5 font-serif text-[30px] leading-tight text-forest tabular-nums">{inr(s.amount)}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className={card}>
              <h2 className="mb-4 text-[18px] font-semibold">Income by source</h2>
              {income.sources.map((s) => (
                <Bar key={s.key} label={s.label} pct={s.share} value={`${s.share}%`} color={sourceColor[s.key]} />
              ))}
            </section>
            <section className={card}>
              <h2 className="mb-4 text-[18px] font-semibold">Income by payment method</h2>
              {income.methods.length === 0 && <p className="text-muted">No payments yet {periodLong}.</p>}
              {income.methods.map((m) => (
                <Bar key={m.key} label={m.label} pct={m.share} value={`${m.share}%`} color="bg-forest" />
              ))}
            </section>
          </div>
        </>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Low stock</h2>
          {low.length === 0 && <p className="text-muted">Everything is well stocked.</p>}
          {low.map((l) => (
            <Row key={l.name} left={l.name} right={`${l.stock} left`} tone="font-bold text-[#a8411f]" />
          ))}
          <Link href="/staff/shop" className="mt-2.5 inline-block text-[14.5px] font-semibold text-forest">
            Open shop
          </Link>
        </section>
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Plans ending this week</h2>
          {expiring.length === 0 && <p className="text-muted">No plans end this week.</p>}
          {expiring.map((e) => (
            <Row
              key={e.id}
              left={
                <Link href={`/staff/members/${e.id}`} className="hover:underline">
                  {e.name} · {e.plan.name}
                </Link>
              }
              right={e.endDate.toDateString() === today.toDateString() ? "Today" : e.endDate.toLocaleDateString("en-IN", { weekday: "short" })}
              tone="text-muted"
            />
          ))}
          <Link href="/staff/members?status=ending" className={`${btnOutline} mt-2.5 text-[14.5px]`}>
            Call them about renewing
          </Link>
        </section>
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Right now</h2>
          <Row
            left={
              <Link href="/staff/bookings" className="hover:underline">
                Courts in use
              </Link>
            }
            right={
              <strong>
                {inUse} of {courtCount}
              </strong>
            }
          />
          <Row
            left={
              <Link href="/staff/bar" className="hover:underline">
                Open bar tabs
              </Link>
            }
            right={<strong>{openTabs}</strong>}
          />
          <Row
            left={
              <Link href="/staff/shop" className="hover:underline">
                Online orders to pack
              </Link>
            }
            right={<strong>{toPack}</strong>}
          />
          <Row
            left={
              <Link href="/staff/leads" className="hover:underline">
                New enquiries
              </Link>
            }
            right={<strong>{newLeads}</strong>}
          />
        </section>
      </div>

      {isOwner && (
        <section className={card}>
          <h2 className="mb-3 text-[18px] font-semibold">Latest payments</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[14.5px]">
              <thead>
                <tr className="text-left text-muted">
                  {["Time", "Source", "For", "Method"].map((h) => (
                    <th key={h} scope="col" className="px-2 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {latest.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-2 py-2.5 tabular-nums">
                      {p.createdAt.toDateString() === today.toDateString()
                        ? fmtTime(p.createdAt)
                        : p.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-2 py-2.5">{SOURCE_LABEL[p.source] ?? p.source}</td>
                    <td className="px-2 py-2.5">{p.note ?? "—"}</td>
                    <td className="px-2 py-2.5">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold tabular-nums ${p.amount < 0 ? "text-clay" : ""}`}>{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
