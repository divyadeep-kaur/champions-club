import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, isoDate } from "@/lib/dates";
import { ageOn } from "@/lib/members";
import { CHANGE_KINDS, CHANGE_POLICIES, PAYMENT_STATES, benefitPlan, memberState, stateLabel } from "@/lib/membership";
import { getDefaultPolicy } from "@/lib/membershipService";
import { requireStaff } from "@/lib/session";
import { btnOutline, btnPrimary } from "@/components/staff/ui";
import { StateBadge } from "../StateBadge";
import { MembershipActions } from "./MembershipActions";
import { SettlePayment } from "./SettlePayment";

export const dynamic = "force-dynamic";

const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
type Row = { when: Date; what: string; amount: string; struck?: boolean };

function HistorySection({ title, rows, empty = "Nothing yet." }: { title: string; rows: Row[]; empty?: string }) {
  return (
    <section className="border border-line bg-paper p-5">
      <h2 className="mb-2.5 text-[17px] font-semibold">{title}</h2>
      {rows.length === 0 && <p className="border-t border-[#ece5d6] py-2.5 text-[14.5px] text-muted">{empty}</p>}
      {rows.map((r, i) => (
        <div
          key={i}
          className={`grid grid-cols-[96px_minmax(0,1fr)_auto] gap-2.5 border-t border-[#ece5d6] py-2.5 text-[14.5px] ${r.struck ? "text-muted line-through" : ""}`}
        >
          <span className="text-muted">{short(r.when)}</span>
          <span className="truncate">{r.what}</span>
          <strong className="tabular-nums">{r.amount}</strong>
        </div>
      ))}
    </section>
  );
}

export default async function MemberProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string; saved?: string }>;
}) {
  const session = await requireStaff(["owner", "desk"]);
  const owner = session.role === "owner";
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const memberId = Number(id);
  if (!Number.isInteger(memberId)) notFound();

  const [member, plans, payments, defaultPolicy] = await Promise.all([
    db.member.findUnique({
      where: { id: memberId },
      include: {
        plan: true,
        bookings: { include: { court: true }, orderBy: { start: "desc" }, take: 12 },
        orders: { include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
        tabs: { orderBy: { openedAt: "desc" }, take: 10 },
        leads: { orderBy: { createdAt: "asc" }, take: 1 },
        changes: { include: { fromPlan: true, toPlan: true, staff: { select: { name: true } }, payment: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.payment.findMany({ where: { source: "membership", refId: memberId }, orderBy: { createdAt: "desc" } }),
    getDefaultPolicy(),
  ]);
  if (!member) notFound();

  const st = memberState(member);
  const benefits = benefitPlan(member);
  const lead = member.leads[0];
  // Money already received for the period that ends on the current expiry date.
  const paidThisPeriod =
    member.changes.filter((c) => c.newEnd?.getTime() === member.endDate.getTime() && c.paymentStatus === "paid").reduce((t, c) => t + c.amount, 0) ||
    (member.changes.length === 0 ? (payments[0]?.amount ?? 0) : 0);

  return (
    <div className="grid content-start gap-5">
      <Link href="/staff/members" className="text-[14.5px] font-semibold text-forest">
        ← All members
      </Link>

      {(sp.welcome || sp.saved) && (
        <p role="status" className="flex items-center gap-2 bg-[#e3efc7] px-4 py-3 text-[15px] text-[#2f4a0a]">
          <CheckCircle2 className="size-5" /> {sp.welcome ? `${member.name} is now a ${member.plan.name} member. Member ID ${member.code}.` : "Profile saved."}
        </p>
      )}

      <header className="flex flex-wrap items-center gap-5 border border-line bg-paper p-5">
        {member.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos are stored inline as data URLs
          <img src={member.photo} alt="" className="size-[88px] shrink-0 rounded-full border border-line object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-[88px] shrink-0 place-items-center rounded-full bg-[#dfe8d4] text-[30px] font-semibold text-forest">
            {member.name
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge state={st.state}>{stateLabel(st.state, st.daysLeft)}</StateBadge>
            <span className="text-[14px] text-muted">{member.code}</span>
          </div>
          <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight text-forest">{member.name}</h1>
          <p className="text-[15px] text-[#3c4a43]">
            <a href={`tel:+91${member.phone}`} className="hover:text-forest">
              {member.phone}
            </a>
            {member.email ? ` · ${member.email}` : ""}
            {member.birthDate ? ` · age ${ageOn(member.birthDate, new Date())}` : ""}
          </p>
          <p className="text-[14px] text-muted">
            Registered {short(member.createdAt)}
            {lead && (
              <>
                {" · "}
                <Link href={`/staff/leads/${lead.id}`} className="text-forest underline underline-offset-4">
                  from a {lead.interest} enquiry
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {owner && (
            <Link href={`/staff/members/${member.id}/edit`} className={btnOutline}>
              <Pencil className="size-4" aria-hidden="true" /> Edit profile
            </Link>
          )}
          <Link href={`/staff/bookings?member=${member.id}`} className={btnPrimary}>
            Book a court
          </Link>
        </div>
      </header>

      {member.suspendedAt && (
        <p role="status" className="border border-line bg-[#ebe5d8] px-4 py-3 text-[15px]">
          <strong>Suspended</strong> since {short(member.suspendedAt)}
          {member.suspendReason ? `: ${member.suspendReason}` : ""}. Member prices and member bookings are off until reactivated.
        </p>
      )}

      <section id="renew" className="grid scroll-mt-6 gap-4 border border-line bg-paper p-5">
        <div className="grid gap-px border border-line bg-line sm:grid-cols-4">
          {[
            ["Plan", member.plan.name, `${inr(member.plan.monthlyFee)} / ${member.plan.durationDays} days`],
            ["Membership start", short(member.startDate), undefined],
            ["Expiry", short(member.endDate), st.state === "expired" ? `${-st.daysLeft} days ago` : `${st.daysLeft} days left`],
            [
              "Benefits now",
              benefits ? `Courts ${benefits.courtRate === 0 ? "free" : `${inr(benefits.courtRate)}/hr`}` : "Walk-in prices",
              benefits ? `Shop ${benefits.shopDiscount}% · Café ${benefits.barDiscount}% off` : st.state === "suspended" ? "While suspended" : "Until renewed",
            ],
          ].map(([k, v, hint]) => (
            <div key={k} className="bg-paper p-4">
              <p className="text-[13px] text-muted">{k}</p>
              <p className={`font-serif text-[22px] leading-tight ${k === "Benefits now" && !benefits ? "text-clay" : "text-forest"}`}>{v}</p>
              {hint && <p className="text-[13px] text-muted">{hint}</p>}
            </div>
          ))}
        </div>
        {owner ? (
          <MembershipActions
            m={{
              id: member.id,
              name: member.name,
              planId: member.planId,
              start: isoDate(member.startDate),
              end: isoDate(member.endDate),
              birth: member.birthDate ? isoDate(member.birthDate) : null,
              suspended: !!member.suspendedAt,
              paidThisPeriod,
            }}
            plans={plans.map(({ id, name, monthlyFee, durationDays, courtRate, shopDiscount, barDiscount }) => ({
              id,
              name,
              monthlyFee,
              durationDays,
              courtRate,
              shopDiscount,
              barDiscount,
            }))}
            defaultPolicy={defaultPolicy}
            today={isoDate(new Date())}
          />
        ) : (
          <p className="text-[14px] text-muted">Plan changes and renewals are done by the owner.</p>
        )}
      </section>

      <section id="history" className="scroll-mt-6 border border-line bg-paper p-5">
        <h2 className="text-[17px] font-semibold">Membership history</h2>
        <ol className="mt-3 grid">
          {member.changes.map((c) => (
            <li key={c.id} className="relative grid gap-1 border-l-2 border-forest/30 pb-4 pl-5 last:pb-0">
              <span aria-hidden="true" className="absolute -left-[7px] top-1 size-3 rounded-full bg-forest" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-[15px]">{CHANGE_KINDS[c.kind] ?? c.kind}</strong>
                {c.kind === "change" || (c.kind === "renewal" && c.fromPlanId !== c.toPlanId) ? (
                  <span className="text-[14.5px]">
                    {c.fromPlan?.name} → {c.toPlan?.name}
                  </span>
                ) : c.toPlan ? (
                  <span className="text-[14.5px]">{c.toPlan.name}</span>
                ) : null}
                <span className="text-[13px] text-muted">
                  {short(c.createdAt)}, {time(c.createdAt)} · by {c.staff.name}
                </span>
              </div>
              <dl className="grid gap-x-6 gap-y-0.5 text-[13.5px] sm:grid-cols-2">
                {c.prevEnd && c.newEnd && c.prevEnd.getTime() !== c.newEnd.getTime() && (
                  <div>
                    <dt className="inline text-muted">Expiry: </dt>
                    <dd className="inline">
                      {short(c.prevEnd)} → {short(c.newEnd)}
                    </dd>
                  </div>
                )}
                {c.kind === "joined" && c.newEnd && (
                  <div>
                    <dt className="inline text-muted">Period: </dt>
                    <dd className="inline">
                      {short(c.newStart ?? c.effectiveDate)} → {short(c.newEnd)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="inline text-muted">Effective: </dt>
                  <dd className="inline">{short(c.effectiveDate)}</dd>
                </div>
                <div>
                  <dt className="inline text-muted">Amount: </dt>
                  <dd className="inline">
                    {c.amount < 0 ? `${inr(-c.amount)} credit` : inr(c.amount)} · {PAYMENT_STATES[c.paymentStatus] ?? c.paymentStatus}
                    {c.payment && ` · ${c.payment.method.toUpperCase()} ref #${c.payment.id}`}
                  </dd>
                </div>
                {c.policy && (
                  <div>
                    <dt className="inline text-muted">Pricing: </dt>
                    <dd className="inline">{CHANGE_POLICIES.find((p) => p.key === c.policy)?.label ?? c.policy}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="inline text-muted">Reason: </dt>
                  <dd className="inline">{c.reason}</dd>
                </div>
              </dl>
              {owner && c.paymentStatus === "pending" && (
                <div className="mt-1">
                  <SettlePayment changeId={c.id} amount={c.amount} />
                </div>
              )}
            </li>
          ))}
          <li className="relative border-l-2 border-forest/30 pl-5">
            <span aria-hidden="true" className="absolute -left-[7px] top-1 size-3 rounded-full border-2 border-forest bg-paper" />
            <span className="text-[14px] text-muted">Registered {short(member.createdAt)}</span>
          </li>
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <HistorySection
          title="Payment history"
          rows={payments.map((p) => ({
            when: p.createdAt,
            what: `${p.note ?? "Membership"} · ${p.method.toUpperCase()} · ref #${p.id}`,
            amount: inr(p.amount),
          }))}
          empty="No membership payments yet."
        />
        <HistorySection
          title="Court bookings"
          rows={member.bookings.map((b) => ({
            when: b.start,
            what: `${b.court.name} · ${time(b.start)}${b.type === "trial" ? " · trial" : ""}`,
            amount: b.price ? inr(b.price) : "Free",
            struck: b.status === "cancelled",
          }))}
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
      {member.notes && <p className="text-[14px] text-muted">Notes: {member.notes}</p>}
    </div>
  );
}
