import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { CHANGE_KINDS, POLICY_SETTING, isPolicy, paymentStateFor, refundCap, type ChangePolicy } from "./membership";
import { refundMethod } from "./ledger";
import { inr } from "./constants";

type Tx = Prisma.TransactionClient;

export class MembershipError extends Error {}

// All membership money received from a member, after any refunds already paid.
export async function netReceived(tx: Tx, memberId: number) {
  const r = await tx.payment.aggregate({ where: { source: "membership", refId: memberId }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

// Pays a membership refund out by the given method, or the way they last paid.
// Never more than the club has received from them.
async function payRefund(tx: Tx, memberId: number, credit: number, method: string | null | undefined, note: string) {
  const received = await netReceived(tx, memberId);
  const amount = refundCap(credit, received);
  if (amount < credit)
    throw new MembershipError(
      received > 0
        ? `Only ${inr(received)} has been received from this member, so that is the most that can be refunded. Save it as a refund due, or use a custom amount.`
        : "Nothing has been received from this member yet, so there is nothing to refund. Save it as a refund due, or use No adjustment.",
    );
  const how = method || (await refundMethod(tx, "membership", memberId));
  return tx.payment.create({ data: { source: "membership", refId: memberId, amount: -amount, method: how, note } });
}

// What a member still owes the club, and what the club still owes them.
export async function openMembershipItems(tx: Tx, memberId: number) {
  const rows = await tx.membershipChange.findMany({ where: { memberId, paymentStatus: { in: ["pending", "credit"] } }, select: { amount: true, paymentStatus: true } });
  return {
    due: rows.filter((r) => r.paymentStatus === "pending").reduce((t, r) => t + r.amount, 0),
    refundDue: rows.filter((r) => r.paymentStatus === "credit").reduce((t, r) => t - r.amount, 0),
  };
}

export async function getDefaultPolicy(): Promise<ChangePolicy | null> {
  const s = await db.clubSetting.findUnique({ where: { key: POLICY_SETTING } });
  return s && isPolicy(s.value) ? s.value : null;
}

// Applies one membership event in a single transaction:
// updates the member, records any money taken as a Payment, and adds a history row.
// Nothing is charged unless the admin says it was paid; otherwise it stays pending.
export async function applyMembershipEvent(
  tx: Tx,
  e: {
    memberId: number;
    kind: keyof typeof CHANGE_KINDS;
    toPlanId?: number;
    newStart?: Date;
    newEnd?: Date;
    effectiveDate: Date;
    policy?: string | null;
    amount: number;
    payNow: boolean;
    method?: string | null;
    reason: string;
    staffId: number;
    suspend?: { at: Date; reason: string } | "lift";
  },
) {
  const member = await tx.member.findUnique({ where: { id: e.memberId }, include: { plan: true } });
  if (!member) throw new MembershipError("Member not found");
  const toPlan = e.toPlanId ? await tx.plan.findUnique({ where: { id: e.toPlanId } }) : member.plan;
  if (!toPlan) throw new MembershipError("Plan not found");

  const paymentStatus = paymentStateFor(e.amount, e.payNow);
  if (paymentStatus === "paid" && !e.method) throw new MembershipError("Choose how they paid");

  const label = CHANGE_KINDS[e.kind];
  const what = e.kind === "change" ? `plan change ${member.plan.name} → ${toPlan.name}` : e.kind === "renewal" ? `early renewal ${member.plan.name} → ${toPlan.name}` : label.toLowerCase();
  const payment =
    paymentStatus === "refunded"
      ? await payRefund(tx, member.id, -e.amount, e.method, `Refund for ${what}`)
      : paymentStatus === "paid"
      ? await tx.payment.create({
          data: {
            source: "membership",
            refId: member.id,
            amount: e.amount,
            method: e.method!,
            note:
              e.kind === "change"
                ? `Plan change ${member.plan.name} → ${toPlan.name}`
                : e.kind === "renewal"
                  ? `Renewed ${toPlan.name}`
                  : `${label} (${toPlan.name})`,
          },
        })
      : null;

  const change = await tx.membershipChange.create({
    data: {
      memberId: member.id,
      kind: e.kind,
      fromPlanId: member.planId,
      toPlanId: toPlan.id,
      prevStart: member.startDate,
      prevEnd: member.endDate,
      newStart: e.newStart ?? member.startDate,
      newEnd: e.newEnd ?? member.endDate,
      effectiveDate: e.effectiveDate,
      policy: e.policy ?? null,
      amount: e.amount,
      paymentStatus,
      paymentId: payment?.id ?? null,
      method: payment ? payment.method : null,
      reason: e.reason,
      staffId: e.staffId,
    },
  });

  await tx.member.update({
    where: { id: member.id },
    data: {
      planId: toPlan.id,
      ...(e.newStart ? { startDate: e.newStart } : {}),
      ...(e.newEnd ? { endDate: e.newEnd } : {}),
      ...(e.suspend === "lift" ? { suspendedAt: null, suspendReason: null } : e.suspend ? { suspendedAt: e.suspend.at, suspendReason: e.suspend.reason } : {}),
    },
  });
  return change;
}

// Collects a payment that was left pending. The original history row keeps its
// details; it just gains the link to the new Payment.
export async function settlePendingPayment(tx: Tx, input: { changeId: number; method: string }) {
  const change = await tx.membershipChange.findUnique({ where: { id: input.changeId }, include: { toPlan: true, fromPlan: true } });
  if (!change) throw new MembershipError("Record not found");
  if (change.paymentStatus === "credit") {
    const what = change.kind === "change" && change.fromPlan && change.toPlan ? `plan change ${change.fromPlan.name} → ${change.toPlan.name}` : (CHANGE_KINDS[change.kind] ?? "membership").toLowerCase();
    const refund = await payRefund(tx, change.memberId, -change.amount, input.method, `Refund for ${what}`);
    const { count } = await tx.membershipChange.updateMany({
      where: { id: change.id, paymentStatus: "credit" },
      data: { paymentStatus: "refunded", paymentId: refund.id, method: refund.method },
    });
    if (!count) throw new MembershipError("This refund has already been paid");
    return refund;
  }
  if (change.paymentStatus !== "pending") throw new MembershipError("This has already been paid");
  const payment = await tx.payment.create({
    data: {
      source: "membership",
      refId: change.memberId,
      amount: change.amount,
      method: input.method,
      note: `${CHANGE_KINDS[change.kind] ?? "Membership"} payment${change.toPlan ? ` (${change.toPlan.name})` : ""}`,
    },
  });
  // Only a still-pending row is updated, so two clicks can't take the money twice.
  const { count } = await tx.membershipChange.updateMany({
    where: { id: change.id, paymentStatus: "pending" },
    data: { paymentStatus: "paid", paymentId: payment.id, method: input.method },
  });
  if (!count) throw new MembershipError("This has already been paid");
  return payment;
}
