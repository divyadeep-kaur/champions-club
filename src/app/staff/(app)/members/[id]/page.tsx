import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate } from "@/lib/dates";
import { ageOn, membershipStatus } from "@/lib/members";
import { requireStaff } from "@/lib/session";
import { btnPrimary } from "@/components/staff/ui";
import { RenewForm } from "../RenewForm";

export const dynamic = "force-dynamic";

const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

type Row = { when: Date; what: string; amount: string; struck?: boolean };

function HistorySection({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className="border border-line bg-paper p-5">
      <h2 className="mb-2.5 text-[17px] font-semibold">{title}</h2>
      {rows.length === 0 && <p className="border-t border-[#ece5d6] py-2.5 text-[14.5px] text-muted">Nothing yet.</p>}
      {rows.map((r, i) => (
        <div
          key={i}
          className={`grid grid-cols-[80px_minmax(0,1fr)_auto] gap-2.5 border-t border-[#ece5d6] py-2.5 text-[14.5px] ${r.struck ? "text-muted line-through" : ""}`}
        >
          <span className="text-muted">{short(r.when)}</span>
          <span className="truncate">{r.what}</span>
          <strong className="tabular-nums">{r.amount}</strong>
        </div>
      ))}
    </section>
  );
}

export default async function MemberProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ welcome?: string }> }) {
  await requireStaff(["owner", "desk"]);
  const { id } = await params;
  const { welcome } = await searchParams;
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  const [member, plans, payments] = await Promise.all([
    db.member.findUnique({
      where: { id: memberId },
      include: {
        plan: true,
        bookings: { include: { court: true }, orderBy: { start: "desc" }, take: 6 },
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 5 },
        tabs: { orderBy: { openedAt: "desc" }, take: 5 },
        leads: { orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.payment.findMany({ where: { source: "membership", refId: memberId }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  if (!member) notFound();

  const st = membershipStatus(member.endDate);
  const badge =
    st.status === "expired"
      ? { text: "Expired", cls: "bg-clay-soft text-[#7a2f14]" }
      : st.status === "ending"
        ? { text: st.daysLeft === 0 ? "Ends today" : `Ending · ${st.daysLeft} days left`, cls: "bg-[#f6e7b8] text-[#5f4605]" }
        : { text: `Active · ${st.daysLeft} days left`, cls: "bg-[#e3efc7] text-[#2f4a0a]" };
  const lead = member.leads[0];

  return (
    <div className="grid content-start gap-5">
      <Link href="/staff/members" className="text-[14.5px] font-semibold text-forest">
        ← Members
      </Link>

      {welcome && (
        <p role="status" className="flex items-center gap-2 bg-[#e3efc7] px-4 py-3 text-[15px] text-[#2f4a0a]">
          <CheckCircle2 className="size-5" /> {member.name} is now a {member.plan.name} member. Code {member.code}.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">{member.name}</h1>
          <p className="mt-1.5 text-muted">
            {member.code} · {member.phone}
            {member.email ? ` · ${member.email}` : ""}
            {member.birthDate ? ` · age ${ageOn(member.birthDate, new Date())}` : ""}
            {lead ? (
              <>
                {" · "}
                <Link href={`/staff/leads/${lead.id}`} className="text-forest underline underline-offset-4">
                  joined from a {lead.interest} enquiry on {short(lead.createdAt)}
                </Link>
              </>
            ) : (
              ` · member since ${fmtDate(member.createdAt)}`
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-3.5 py-1.5 font-bold ${badge.cls}`}>{badge.text}</span>
          <Link href={`/staff/bookings?member=${member.id}`} className={btnPrimary}>
            Book a court
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        <div className="bg-forest p-[18px] text-cream">
          <div className="text-[14px] opacity-85">Membership</div>
          <div className="font-serif text-[26px]">{member.plan.name}</div>
          <div className="text-[14px] opacity-85">
            {st.status === "expired" ? "Ended" : "Ends"} {fmtDate(member.endDate)}
          </div>
        </div>
        {[
          ["Court, per hour", member.plan.courtRate === 0 ? "Free" : inr(member.plan.courtRate)],
          ["Shop discount", `${member.plan.shopDiscount}%`],
          ["Café & bar discount", `${member.plan.barDiscount}%`],
        ].map(([l, v]) => (
          <div key={l} className="border border-line bg-paper p-[18px]">
            <div className="text-[14px] text-muted">{l}</div>
            <div className="font-serif text-[26px] text-forest">{v}</div>
          </div>
        ))}
      </div>

      <section id="renew" className="scroll-mt-6 border border-line bg-paper p-5">
        <h2 className="mb-3 text-[18px] font-semibold">Renew</h2>
        <RenewForm memberId={member.id} currentPlanId={member.planId} plans={plans} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <HistorySection
          title="Court bookings"
          rows={member.bookings.map((b) => ({
            when: b.start,
            what: `${b.court.name} · ${b.start.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}${b.type === "trial" ? " · trial" : ""}`,
            amount: b.price ? inr(b.price) : "Free",
            struck: b.status === "cancelled",
          }))}
        />
        <HistorySection
          title="Membership payments"
          rows={payments.map((p) => ({ when: p.createdAt, what: `${p.note ?? "Membership"} · ${p.method.toUpperCase()}`, amount: inr(p.amount) }))}
        />
        <HistorySection
          title="Shop purchases"
          rows={member.orders.map((o) => ({
            when: o.createdAt,
            what: `${o.items.map((i) => `${i.product.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}${o.discount ? ` (−${inr(o.discount)})` : ""}`,
            amount: inr(o.total),
          }))}
        />
        <HistorySection
          title="Café & bar"
          rows={member.tabs.map((t) => ({
            when: t.openedAt,
            what: `${t.status === "open" ? "Open tab" : "Tab"}${t.discount ? ` (−${inr(t.discount)} member discount)` : ""}`,
            amount: inr(t.total),
          }))}
        />
      </div>
    </div>
  );
}
