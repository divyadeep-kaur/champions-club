import { membershipStatus, renewalPeriod } from "./members";

const DAY = 24 * 60 * 60 * 1000;
export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = dayStart(d);
  x.setDate(x.getDate() + n);
  return x;
};
const daysBetween = (a: Date, b: Date) => Math.round((dayStart(b).getTime() - dayStart(a).getTime()) / DAY);

// Status

export type MemberState = "active" | "ending" | "expired" | "suspended";

export function memberState(m: { endDate: Date; suspendedAt: Date | null }, today = new Date()): { state: MemberState; daysLeft: number } {
  const s = membershipStatus(m.endDate, today);
  if (m.suspendedAt) return { state: "suspended", daysLeft: s.daysLeft };
  return { state: s.status, daysLeft: s.daysLeft };
}

export const stateLabel = (s: MemberState, daysLeft: number) =>
  s === "suspended" ? "Suspended" : s === "expired" ? "Expired" : s === "ending" ? (daysLeft === 0 ? "Ends today" : `Ends in ${daysLeft} d`) : "Active";

// The one rule for member prices everywhere: only a current, unsuspended membership
// gets its plan's court rate and shop and bar discounts. Everyone else pays walk-in prices.
export function benefitPlan<P>(m: { endDate: Date; suspendedAt: Date | null; plan: P } | null | undefined, today = new Date()): P | null {
  if (!m) return null;
  const { state } = memberState(m, today);
  return state === "expired" || state === "suspended" ? null : m.plan;
}

// History

export const CHANGE_KINDS: Record<string, string> = {
  joined: "Joined",
  renewal: "Renewed",
  change: "Plan changed",
  extension: "Validity extended",
  suspension: "Suspended",
  reactivation: "Reactivated",
};

export const PAYMENT_STATES: Record<string, string> = { paid: "Paid", pending: "Payment pending", none: "No charge", credit: "Credit owed" };

// Mid-cycle plan changes. The club has no fixed rule, so the owner picks one;
// the default is a setting, and each change can override it.
export const CHANGE_POLICIES = [
  { key: "prorated", label: "Prorated difference", hint: "Charge or credit the price difference for the days left" },
  { key: "none", label: "No adjustment", hint: "Switch plans with no extra charge or credit" },
  { key: "custom", label: "Custom amount", hint: "Enter the amount yourself" },
] as const;
export type ChangePolicy = (typeof CHANGE_POLICIES)[number]["key"];
export const isPolicy = (p: string): p is ChangePolicy => CHANGE_POLICIES.some((x) => x.key === p);
export const POLICY_SETTING = "membership.changePolicy";

export type ChangeTiming = "keep" | "restart";

type PlanPrice = { monthlyFee: number; durationDays: number };

// Works out a plan change without touching the database.
// keep: the new plan applies now and the expiry date stays the same.
// restart: a fresh period of the new plan starts on the effective date, with credit for unused days.
// An expired membership always restarts, because there is no period left to keep.
export function planChangeQuote(input: {
  current: PlanPrice;
  next: PlanPrice;
  startDate: Date;
  endDate: Date;
  effective: Date;
  timing: ChangeTiming;
  policy: ChangePolicy;
  customAmount?: number;
}) {
  const effective = dayStart(input.effective);
  const expired = dayStart(input.endDate) < effective;
  const timing: ChangeTiming = expired ? "restart" : input.timing;
  const remainingDays = expired ? 0 : Math.max(0, daysBetween(effective, input.endDate));
  const perDay = (p: PlanPrice) => p.monthlyFee / p.durationDays;

  let newStart: Date, newEnd: Date, prorated: number;
  if (timing === "keep") {
    newStart = dayStart(input.startDate);
    newEnd = dayStart(input.endDate);
    prorated = Math.round((perDay(input.next) - perDay(input.current)) * remainingDays);
  } else {
    newStart = effective;
    newEnd = addDays(effective, input.next.durationDays);
    prorated = input.next.monthlyFee - Math.round(perDay(input.current) * remainingDays);
  }

  const amount = input.policy === "prorated" ? prorated : input.policy === "none" ? 0 : Math.round(input.customAmount ?? 0);
  return { expired, timing, remainingDays, newStart, newEnd, prorated, amount };
}

// Renewal follows the club's existing rule: the new period starts when the current one ends,
// or on the renewal date if it has already ended, so no paid days are lost.
export function renewalQuote(endDate: Date, renewalDate: Date, plan: PlanPrice) {
  const { start, end } = renewalPeriod(endDate, renewalDate, plan.durationDays);
  return { newStart: start, newEnd: end, amount: plan.monthlyFee, early: dayStart(endDate) > dayStart(renewalDate) };
}

// Extra days on top of the current expiry, or from today if it has already passed.
export function extensionQuote(endDate: Date, days: number, today = new Date()) {
  const from = dayStart(endDate) > dayStart(today) ? dayStart(endDate) : dayStart(today);
  return { newEnd: addDays(from, days) };
}

// What a membership event means for money: something to collect, nothing, or a credit to the member.
export function paymentStateFor(amount: number, payNow: boolean) {
  if (amount < 0) return "credit";
  if (amount === 0) return "none";
  return payNow ? "paid" : "pending";
}

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function photoError(file: { type: string; size: number }) {
  if (!PHOTO_TYPES.includes(file.type)) return "Photo must be a JPG, PNG or WebP image";
  if (file.size > 1_000_000) return "Photo must be 1 MB or smaller";
  return null;
}
