import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { juniorAgeError } from "@/lib/members";
import { PAYMENT_STATES, dayStart, memberState, planChangeQuote, prorationBreakdown, renewalQuote } from "@/lib/membership";
import { netReceived, openMembershipItems } from "@/lib/membershipService";
import { requireMember } from "@/lib/memberSession";
import { ConfirmSubmit } from "@/components/staff/ConfirmSubmit";
import { memberChangePlan, memberRenew } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const DAY = 86_400_000;

export default async function MyPlanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const member = await requireMember();
  const sp = await searchParams;
  const today = dayStart(new Date());
  const [plans, open, received, history] = await Promise.all([
    db.plan.findMany({ where: { OR: [{ active: true }, { id: member.planId }] }, orderBy: { monthlyFee: "desc" } }),
    openMembershipItems(db, member.id),
    netReceived(db, member.id),
    db.membershipChange.findMany({ where: { memberId: member.id }, include: { fromPlan: true, toPlan: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const { state, daysLeft } = memberState(member);
  const totalDays = Math.max(1, Math.round((dayStart(member.endDate).getTime() - dayStart(member.startDate).getTime()) / DAY));
  const used = Math.min(totalDays, Math.max(0, Math.round((today.getTime() - dayStart(member.startDate).getTime()) / DAY)));
  const canChange = state === "active" || state === "ending";
  const canRenew = state !== "suspended" && daysLeft <= 7;
  const blockedByDue = open.due > 0;
  const others = plans.filter((p) => p.id !== member.planId && p.active);

  const card = "rounded-[18px] border border-line bg-paper p-5";
  const btn = "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-forest px-4 text-[15px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-60";

  return (
    <main className="grid content-start gap-5 p-5 lg:px-0 lg:py-8">
      <h1 className="font-serif text-[30px] font-semibold text-forest">My plan</h1>

      {sp.ok && (
        <p role="status" className="rounded-xl bg-[#e3efc7] p-3 text-[14.5px] text-[#2f4a0a]">
          {sp.ok}
        </p>
      )}
      {sp.error && (
        <p role="alert" className="rounded-xl bg-clay-soft p-3 text-[14.5px] text-[#7a2f14]">
          {sp.error}
        </p>
      )}

      <section className={`${card} grid gap-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[13px] uppercase tracking-[0.1em] text-muted">Current plan</p>
            <p className="text-[24px] font-extrabold text-forest">{member.plan.name}</p>
            <p className="text-[14.5px] text-muted">
              {inr(member.plan.monthlyFee)} for {member.plan.durationDays} days · {inr(Math.round(member.plan.monthlyFee / member.plan.durationDays))} a day
            </p>
          </div>
          <div className="text-right text-[14.5px]">
            <p>
              {fmt(member.startDate)} → {fmt(member.endDate)}
            </p>
            <p className="font-semibold">{state === "expired" ? "Ended" : state === "suspended" ? "On hold" : `${Math.max(0, daysLeft)} days left`}</p>
          </div>
        </div>
        <div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#ece5d6]" aria-hidden>
            <div className="h-full bg-forest" style={{ width: `${Math.round((used / totalDays) * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {used} of {totalDays} days used
          </p>
        </div>
        {(open.due > 0 || open.refundDue > 0) && (
          <div className="grid gap-1 rounded-xl bg-cream p-3 text-[14px]">
            {open.due > 0 && (
              <p>
                <strong className="text-clay">{inr(open.due)} to pay</strong> at the front desk.
              </p>
            )}
            {open.refundDue > 0 && (
              <p>
                <strong className="text-[#4d7a12]">{inr(open.refundDue)} refund</strong> is being sent back to you the way you last paid.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="text-[19px] font-bold">Change plan</h2>
          <p className="text-[14px] text-muted">
            Your end date stays the same. Days you have already used stay on {member.plan.name}; only the days left are repriced, so a cheaper plan gives money back
            and a dearer one costs the difference.
          </p>
        </div>
        {!canChange && (
          <p className="rounded-xl bg-cream p-3 text-[14px]">
            {state === "suspended" ? "Your membership is on hold, so plan changes go through the front desk." : "Your plan has ended. Renew below to pick a plan."}
          </p>
        )}
        {canChange && blockedByDue && <p className="rounded-xl bg-clay-soft p-3 text-[14px] text-[#7a2f14]">Pay the {inr(open.due)} at the desk first, then you can switch here.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((p) => {
            const q = planChangeQuote({
              current: member.plan,
              next: p,
              startDate: member.startDate,
              endDate: member.endDate,
              effective: today,
              timing: "keep",
              policy: "prorated",
            });
            const b = prorationBreakdown(member.plan, p, q.remainingDays);
            const age = juniorAgeError(p.name, member.birthDate);
            const refund = q.amount < 0;
            const overPaid = refund && -q.amount > received;
            const disabled = !canChange || blockedByDue || !!age || q.remainingDays <= 0;
            return (
              <article key={p.id} className={`${card} grid content-start gap-3`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[19px] font-extrabold text-forest">{p.name}</h3>
                  <span className="text-[14px] text-muted">
                    {inr(p.monthlyFee)} / {p.durationDays} days
                  </span>
                </div>
                <p className="text-[13.5px] text-muted">
                  Courts {p.courtRate === 0 ? "free" : `${inr(p.courtRate)}/hr`} · shop {p.shopDiscount}% off · café {p.barDiscount}% off
                </p>
                {canChange && q.remainingDays > 0 && (
                  <div className="grid gap-1 rounded-xl bg-cream p-3 text-[13.5px]">
                    {b.lines.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                    <strong className={`mt-1 text-[15px] ${refund ? "text-[#4d7a12]" : q.amount > 0 ? "text-clay" : ""}`}>
                      {refund ? `You get ${inr(-q.amount)} back` : q.amount > 0 ? `You pay ${inr(q.amount)} at the desk` : "No change in price"}
                    </strong>
                    {overPaid && <span className="text-muted">The desk refunds up to what you have paid so far.</span>}
                  </div>
                )}
                {age && <p className="text-[13.5px] font-semibold text-clay">{age}</p>}
                <form action={memberChangePlan}>
                  <input type="hidden" name="planId" value={p.id} />
                  <ConfirmSubmit
                    disabled={disabled}
                    confirmLabel={refund ? `Tap again: switch and get ${inr(-q.amount)} back` : q.amount > 0 ? `Tap again: switch and owe ${inr(q.amount)}` : "Tap again to switch"}
                    className={btn}
                  >
                    Switch to {p.name}
                  </ConfirmSubmit>
                </form>
              </article>
            );
          })}
        </div>
      </section>

      {canRenew && (
        <section className="grid gap-3">
          <div>
            <h2 className="text-[19px] font-bold">Renew</h2>
            <p className="text-[14px] text-muted">
              {state === "expired"
                ? "Your new period starts today."
                : `Your new period starts when this one ends (${fmt(member.endDate)}), so you lose no days. Pay at the front desk.`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {plans
              .filter((p) => p.active || p.id === member.planId)
              .map((p) => {
                const q = renewalQuote(member.endDate, today, p, member.plan);
                const age = juniorAgeError(p.name, member.birthDate);
                return (
                  <form key={p.id} action={memberRenew} className={`${card} grid content-start gap-2`}>
                    <input type="hidden" name="planId" value={p.id} />
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[18px] font-extrabold text-forest">
                        {p.name}
                        {p.id === member.planId && <span className="ml-1.5 text-[13px] font-semibold text-muted">current</span>}
                      </h3>
                      <span className="font-semibold">{q.amount < 0 ? `${inr(-q.amount)} back` : inr(q.amount)}</span>
                    </div>
                    <p className="text-[13.5px] text-muted">Until {fmt(q.newEnd)}</p>
                    {q.adjustment !== 0 && (
                      <p className="text-[13px] text-muted">
                        {inr(q.fee)} plan fee {q.adjustment > 0 ? "+" : "−"} {inr(Math.abs(q.adjustment))} because your {q.remainingDays} days left switch to {p.name} now.
                      </p>
                    )}
                    {age && <p className="text-[13.5px] font-semibold text-clay">{age}</p>}
                    <ConfirmSubmit disabled={blockedByDue || !!age} confirmLabel="Tap again to renew" className={btn}>
                      Renew on {p.name}
                    </ConfirmSubmit>
                  </form>
                );
              })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className={`${card} grid gap-2`}>
          <h2 className="text-[17px] font-bold">Recent changes</h2>
          {history.map((c) => (
            <div key={c.id} className="flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-[14px]">
              <span>
                {c.fromPlan && c.toPlan && c.fromPlanId !== c.toPlanId ? `${c.fromPlan.name} → ${c.toPlan.name}` : (c.toPlan?.name ?? "")} · {fmt(c.createdAt)}
              </span>
              <span className="tabular-nums text-muted">
                {c.amount < 0 ? `${inr(-c.amount)} back` : c.amount > 0 ? inr(c.amount) : "—"} · {PAYMENT_STATES[c.paymentStatus] ?? c.paymentStatus}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
