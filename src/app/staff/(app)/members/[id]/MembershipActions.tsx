"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarPlus, PauseCircle, PlayCircle, RefreshCw, Repeat, X } from "lucide-react";
import { inr } from "@/lib/constants";
import { juniorAgeError } from "@/lib/members";
import { CHANGE_POLICIES, extensionQuote, paymentStateFor, planChangeQuote, renewalQuote, type ChangePolicy, type ChangeTiming } from "@/lib/membership";
import { changePlan, extendMembership, renewMembership, setSuspension, type ActionState } from "../membershipActions";

export type PlanOption = { id: number; name: string; monthlyFee: number; durationDays: number; courtRate: number; shopDiscount: number; barDiscount: number };
export type MemberInfo = {
  id: number;
  name: string;
  planId: number;
  start: string;
  end: string;
  birth: string | null;
  suspended: boolean;
  paidThisPeriod: number;
};

const toDate = (s: string) => new Date(`${s}T00:00:00`);
const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const input = "min-h-11 w-full border border-[#b5aa98] bg-white px-3 text-[15px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "grid gap-1.5 text-[14px] font-semibold";
const money = (n: number) => (n < 0 ? `${inr(-n)} credit to member` : inr(n));

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-auto w-[min(640px,calc(100vw-24px))] border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-forest-deep/50"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-[19px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center text-muted hover:text-ink">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}

function Summary({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)] gap-3 border-t border-line px-3.5 py-2.5 text-[14.5px] first:border-t-0">
          <dt className="text-muted">{k}</dt>
          <dd className="font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function PaymentFields({ amount, payNow, setPayNow }: { amount: number; payNow: boolean; setPayNow: (v: boolean) => void }) {
  if (amount <= 0) return <input type="hidden" name="payNow" value="no" />;
  return (
    <fieldset className="grid gap-2 border border-line p-3.5">
      <legend className="px-1 text-[14px] font-semibold">Payment of {inr(amount)}</legend>
      <label className="flex items-center gap-2 text-[14.5px]">
        <input type="radio" name="payNow" value="no" checked={!payNow} onChange={() => setPayNow(false)} /> Not paid yet. Record it as pending
      </label>
      <label className="flex items-center gap-2 text-[14.5px]">
        <input type="radio" name="payNow" value="yes" checked={payNow} onChange={() => setPayNow(true)} /> Paid now
      </label>
      {payNow && (
        <label className={lbl}>
          Paid by
          <select name="method" defaultValue="" required className={input}>
            <option value="" disabled>
              Choose
            </option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}

function Feedback({ state }: { state: ActionState }) {
  return (
    <p role="alert" aria-live="polite" className="min-h-5 text-[14px] font-semibold text-clay">
      {state.error}
    </p>
  );
}

function ChangePlan({
  m,
  plans,
  defaultPolicy,
  today,
  onDone,
}: {
  m: MemberInfo;
  plans: PlanOption[];
  defaultPolicy: ChangePolicy | null;
  today: string;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePlan, {});
  const current = plans.find((p) => p.id === m.planId)!;
  const [planId, setPlanId] = useState("");
  const [timing, setTiming] = useState<ChangeTiming>("keep");
  const [policy, setPolicy] = useState<string>(defaultPolicy ?? "");
  const [custom, setCustom] = useState("");
  const [effective, setEffective] = useState(today);
  const [reason, setReason] = useState("");
  const [payNow, setPayNow] = useState(false);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (state.ok) onDone();
    if (state.error) setReview(false);
  }, [state, onDone]);

  const next = plans.find((p) => String(p.id) === planId);
  const ineligible = next ? juniorAgeError(next.name, m.birth ? toDate(m.birth) : null, toDate(effective)) : null;
  const q = useMemo(
    () =>
      next && policy
        ? planChangeQuote({
            current,
            next,
            startDate: toDate(m.start),
            endDate: toDate(m.end),
            effective: toDate(effective),
            timing,
            policy: policy as ChangePolicy,
            customAmount: Number(custom) || 0,
          })
        : null,
    [next, policy, current, m.start, m.end, effective, timing, custom],
  );
  const ready = !!(next && q && !ineligible && reason.trim().length >= 3 && (policy !== "custom" || custom !== ""));
  const ps = q ? paymentStateFor(q.amount, payNow) : "none";

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="memberId" value={m.id} />
      <div className={review ? "hidden" : "grid gap-4"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={lbl}>
            Current plan
            <p className="flex min-h-11 items-center border border-line bg-cream px-3 font-normal">
              {current.name} · {inr(current.monthlyFee)} / {current.durationDays} days
            </p>
          </div>
          <label className={lbl}>
            New plan
            <select name="planId" value={planId} onChange={(e) => setPlanId(e.target.value)} required className={input}>
              <option value="">Choose a plan</option>
              {plans
                .filter((p) => p.id !== m.planId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {inr(p.monthlyFee)} / {p.durationDays} days
                  </option>
                ))}
            </select>
          </label>
        </div>
        {ineligible && <p className="text-[14px] font-semibold text-clay">{ineligible}</p>}
        {next && (
          <p className="text-[13.5px] text-muted">
            {next.name} benefits: courts {next.courtRate === 0 ? "free" : `${inr(next.courtRate)}/hr`}, shop {next.shopDiscount}% off, café & bar{" "}
            {next.barDiscount}% off.
          </p>
        )}
        <label className={lbl}>
          Effective date
          <input type="date" name="effective" value={effective} onChange={(e) => setEffective(e.target.value)} className={input} />
        </label>
        {q?.expired ? (
          <>
            <input type="hidden" name="timing" value="restart" />
            <p className="border border-line bg-cream px-3.5 py-2.5 text-[14px]">
              This membership has expired, so the new plan starts a fresh {next?.durationDays}-day period from the effective date.
            </p>
          </>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[14px] font-semibold">Validity</legend>
            <label className="flex items-start gap-2 text-[14.5px]">
              <input type="radio" name="timing" value="keep" checked={timing === "keep"} onChange={() => setTiming("keep")} className="mt-1" />
              <span>
                Keep the current expiry ({fmt(toDate(m.end))})
                <span className="block text-[13px] text-muted">The new plan's benefits apply from the effective date.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-[14.5px]">
              <input type="radio" name="timing" value="restart" checked={timing === "restart"} onChange={() => setTiming("restart")} className="mt-1" />
              <span>
                Start a new {next?.durationDays ?? ""}-day period from the effective date
                <span className="block text-[13px] text-muted">Unused days on the current plan are credited.</span>
              </span>
            </label>
          </fieldset>
        )}
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[14px] font-semibold">Price adjustment</legend>
          {CHANGE_POLICIES.map((p) => (
            <label key={p.key} className="flex items-start gap-2 text-[14.5px]">
              <input type="radio" name="policy" value={p.key} checked={policy === p.key} onChange={() => setPolicy(p.key)} className="mt-1" />
              <span>
                {p.label}
                {defaultPolicy === p.key && <span className="ml-1.5 text-[12px] font-semibold text-muted">(club default)</span>}
                <span className="block text-[13px] text-muted">{p.hint}</span>
              </span>
            </label>
          ))}
          {policy === "custom" && (
            <label className={lbl}>
              Custom amount (₹, negative for a credit)
              <input name="customAmount" type="number" value={custom} onChange={(e) => setCustom(e.target.value)} className={input} />
            </label>
          )}
        </fieldset>
        <label className={lbl}>
          Reason for the change
          <textarea name="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} required className={`${input} py-2`} />
        </label>
        {q && <PaymentFields amount={q.amount} payNow={payNow} setPayNow={setPayNow} />}
        <button
          type="button"
          disabled={!ready}
          onClick={() => setReview(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep disabled:opacity-50"
        >
          Review changes <ArrowRight className="size-4" />
        </button>
      </div>

      {review && next && q && (
        <div className="grid gap-4">
          <p className="text-[14.5px]">Check the changes below. Nothing is saved until you confirm.</p>
          <Summary
            rows={[
              ["Current plan", `${current.name} · ${inr(current.monthlyFee)}`],
              ["New plan", `${next.name} · ${inr(next.monthlyFee)} / ${next.durationDays} days`],
              ["Current expiry", fmt(toDate(m.end))],
              ["Effective from", fmt(toDate(effective))],
              ["New period", `${fmt(q.newStart)} → ${fmt(q.newEnd)}`],
              ["Days left on current plan", String(q.remainingDays)],
              ["Already paid this period", m.paidThisPeriod ? inr(m.paidThisPeriod) : "—"],
              ["Price adjustment", `${CHANGE_POLICIES.find((p) => p.key === policy)?.label}${policy === "prorated" ? ` (${money(q.prorated)})` : ""}`],
              ["Amount", money(q.amount)],
              [
                "Payment",
                ps === "paid"
                  ? "Paid now"
                  : ps === "pending"
                    ? "Pending, to collect later"
                    : ps === "credit"
                      ? "Credit noted, not refunded automatically"
                      : "Nothing to pay",
              ],
              ["Reason", reason],
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-60">
              {pending ? "Saving…" : "Confirm change"}
            </button>
            <button type="button" onClick={() => setReview(false)} className="min-h-11 border-[1.5px] border-forest px-4 font-semibold text-forest">
              Back
            </button>
          </div>
        </div>
      )}
      <Feedback state={state} />
    </form>
  );
}

function Renew({ m, plans, today, onDone }: { m: MemberInfo; plans: PlanOption[]; today: string; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(renewMembership, {});
  const [planId, setPlanId] = useState(String(m.planId));
  const [date, setDate] = useState(today);
  const [payNow, setPayNow] = useState(true);
  const [review, setReview] = useState(false);
  useEffect(() => {
    if (state.ok) onDone();
    if (state.error) setReview(false);
  }, [state, onDone]);
  const plan = plans.find((p) => String(p.id) === planId)!;
  const q = renewalQuote(toDate(m.end), toDate(date), plan);
  const ineligible = juniorAgeError(plan.name, m.birth ? toDate(m.birth) : null, toDate(date));

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="memberId" value={m.id} />
      <div className={review ? "hidden" : "grid gap-4"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={lbl}>
            Plan
            <select name="planId" value={planId} onChange={(e) => setPlanId(e.target.value)} className={input}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {inr(p.monthlyFee)} / {p.durationDays} days{p.id === m.planId ? " (current)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={lbl}>
            Renewal date
            <input type="date" name="renewalDate" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
        </div>
        {ineligible && <p className="text-[14px] font-semibold text-clay">{ineligible}</p>}
        <p className="border border-line bg-cream px-3.5 py-2.5 text-[14px]">
          {q.early
            ? `Renewing early: the new period starts when the current one ends (${fmt(toDate(m.end))}), so no days are lost.`
            : `The new period starts on the renewal date.`}{" "}
          New expiry <strong>{fmt(q.newEnd)}</strong>.
        </p>
        <PaymentFields amount={q.amount} payNow={payNow} setPayNow={setPayNow} />
        <label className={lbl}>
          Note (optional)
          <input name="reason" maxLength={300} className={input} />
        </label>
        <button
          type="button"
          disabled={!!ineligible}
          onClick={() => setReview(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-4 font-semibold text-cream hover:bg-forest-deep disabled:opacity-50"
        >
          Review renewal <ArrowRight className="size-4" />
        </button>
      </div>
      {review && (
        <div className="grid gap-4">
          <Summary
            rows={[
              ["Plan", plan.id === m.planId ? `${plan.name} (same plan)` : `${plans.find((p) => p.id === m.planId)?.name} → ${plan.name}`],
              ["Current expiry", fmt(toDate(m.end))],
              ["New period", `${fmt(q.newStart)} → ${fmt(q.newEnd)}`],
              ["Amount", inr(q.amount)],
              ["Payment", payNow ? "Paid now" : "Pending, to collect later"],
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="min-h-11 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-60">
              {pending ? "Saving…" : "Confirm renewal"}
            </button>
            <button type="button" onClick={() => setReview(false)} className="min-h-11 border-[1.5px] border-forest px-4 font-semibold text-forest">
              Back
            </button>
          </div>
        </div>
      )}
      <Feedback state={state} />
    </form>
  );
}

function Extend({ m, onDone }: { m: MemberInfo; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(extendMembership, {});
  const [days, setDays] = useState("7");
  const [amount, setAmount] = useState("0");
  const [payNow, setPayNow] = useState(true);
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  const newEnd = extensionQuote(toDate(m.end), Math.max(0, Number(days) || 0)).newEnd;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="memberId" value={m.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={lbl}>
          Extra days
          <input name="days" type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className={input} />
        </label>
        <label className={lbl}>
          Charge (₹, 0 for free)
          <input name="amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
        </label>
      </div>
      <p className="text-[14.5px]">
        Expiry moves from <strong>{fmt(toDate(m.end))}</strong> to <strong>{fmt(newEnd)}</strong>.
      </p>
      <PaymentFields amount={Number(amount) || 0} payNow={payNow} setPayNow={setPayNow} />
      <label className={lbl}>
        Reason
        <input name="reason" required minLength={3} maxLength={300} placeholder="e.g. Court 2 closed for a week" className={input} />
      </label>
      <button type="submit" disabled={pending} className="min-h-11 bg-forest px-5 font-semibold text-cream hover:bg-forest-deep disabled:opacity-60">
        {pending ? "Saving…" : "Extend validity"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

function Suspension({ m, onDone }: { m: MemberInfo; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setSuspension, {});
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="memberId" value={m.id} />
      <input type="hidden" name="action" value={m.suspended ? "reactivate" : "suspend"} />
      <p className="text-[14.5px]">
        {m.suspended
          ? "Reactivating restores member prices and member bookings. The expiry date is unchanged."
          : "While suspended, they pay walk-in court rates, get no shop or café discount and can't book as a member. The expiry date is unchanged."}
      </p>
      <label className={lbl}>
        Reason
        <input name="reason" required minLength={3} maxLength={300} className={input} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={`min-h-11 px-5 font-semibold disabled:opacity-60 ${m.suspended ? "bg-forest text-cream hover:bg-forest-deep" : "border-[1.5px] border-clay text-clay hover:bg-clay-soft"}`}
      >
        {pending ? "Saving…" : m.suspended ? "Reactivate membership" : "Suspend membership"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function MembershipActions({
  m,
  plans,
  defaultPolicy,
  today,
}: {
  m: MemberInfo;
  plans: PlanOption[];
  defaultPolicy: ChangePolicy | null;
  today: string;
}) {
  const [open, setOpen] = useState<null | "change" | "renew" | "extend" | "suspend">(null);
  const [round, setRound] = useState(0);
  const close = useCallback(() => {
    setOpen(null);
    setRound((r) => r + 1);
  }, []);
  const done = close;
  const btn = "inline-flex min-h-11 items-center gap-2 border-[1.5px] border-forest px-4 font-semibold text-forest hover:bg-forest/5";

  useEffect(() => {
    if (window.location.hash === "#renew") setOpen("renew");
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen("change")} className={`${btn} bg-forest text-cream hover:bg-forest-deep`}>
        <Repeat className="size-4" aria-hidden="true" /> Change Membership Plan
      </button>
      <button type="button" onClick={() => setOpen("renew")} className={btn} disabled={m.suspended} title={m.suspended ? "Reactivate first" : undefined}>
        <RefreshCw className="size-4" aria-hidden="true" /> Renew Membership
      </button>
      <button type="button" onClick={() => setOpen("extend")} className={btn}>
        <CalendarPlus className="size-4" aria-hidden="true" /> Extend validity
      </button>
      <button type="button" onClick={() => setOpen("suspend")} className={btn}>
        {m.suspended ? <PlayCircle className="size-4" aria-hidden="true" /> : <PauseCircle className="size-4" aria-hidden="true" />}
        {m.suspended ? "Reactivate" : "Suspend"}
      </button>

      <Modal open={open === "change"} onClose={close} title={`Change ${m.name}'s plan`}>
        <ChangePlan key={`c${round}`} m={m} plans={plans} defaultPolicy={defaultPolicy} today={today} onDone={done} />
      </Modal>
      <Modal open={open === "renew"} onClose={close} title={`Renew ${m.name}'s membership`}>
        <Renew key={`r${round}`} m={m} plans={plans} today={today} onDone={done} />
      </Modal>
      <Modal open={open === "extend"} onClose={close} title="Extend validity">
        <Extend key={`e${round}`} m={m} onDone={done} />
      </Modal>
      <Modal open={open === "suspend"} onClose={close} title={m.suspended ? "Reactivate membership" : "Suspend membership"}>
        <Suspension key={`s${round}`} m={m} onDone={done} />
      </Modal>
    </div>
  );
}
