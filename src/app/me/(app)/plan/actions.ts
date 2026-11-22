"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { juniorAgeError } from "@/lib/members";
import { SELF_SERVICE, dayStart, memberState, planChangeQuote, renewalQuote } from "@/lib/membership";
import { MembershipError, applyMembershipEvent, openMembershipItems } from "@/lib/membershipService";
import { requireMember } from "@/lib/memberSession";

const back = (k: "ok" | "error", msg: string) => redirect(`/me/plan?${k}=${encodeURIComponent(msg)}`);
const RENEW_WINDOW_DAYS = 7;

function refresh(memberId: number) {
  for (const p of ["/me", "/me/plan", "/staff/members", `/staff/members/${memberId}`, "/staff"]) revalidatePath(p);
  revalidatePath("/staff/members", "layout");
  revalidatePath("/staff/money", "layout");
}

// History rows need a staff record; app changes are filed under the owner and marked as from the app.
async function ownerId() {
  const owner = await db.staff.findFirst({ where: { role: "owner", active: true }, orderBy: { id: "asc" }, select: { id: true } });
  if (!owner) throw new MembershipError("The club can't take plan changes in the app right now. Please ask at the front desk.");
  return owner.id;
}

async function guard(memberId: number) {
  const open = await openMembershipItems(db, memberId);
  if (open.due > 0) throw new MembershipError(`You have ${inr(open.due)} to pay at the front desk first. After that you can change your plan here.`);
}

// Members switch plans with the same rule the desk uses: the expiry date stays,
// the unused days on the old plan are refunded and the same days on the new plan are charged.
export async function memberChangePlan(formData: FormData) {
  const member = await requireMember();
  const planId = Number(formData.get("planId")) || 0;
  let msg = "";
  try {
    const next = await db.plan.findUnique({ where: { id: planId } });
    if (!next || !next.active) throw new MembershipError("That plan isn't available");
    if (next.id === member.planId) throw new MembershipError("You're already on that plan");
    const { state } = memberState(member);
    if (state === "suspended") throw new MembershipError("Your membership is on hold. Please talk to the front desk.");
    if (state === "expired") throw new MembershipError("Your membership has ended. Renew it below instead.");
    const age = juniorAgeError(next.name, member.birthDate);
    if (age) throw new MembershipError(age);
    await guard(member.id);
    const recent = await db.membershipChange.count({
      where: { memberId: member.id, kind: "change", reason: { startsWith: SELF_SERVICE }, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    });
    if (recent > 0) throw new MembershipError("You changed plan in the app this week already. Ask the front desk if you need another change.");

    const today = dayStart(new Date());
    const q = planChangeQuote({ current: member.plan, next, startDate: member.startDate, endDate: member.endDate, effective: today, timing: "keep", policy: "prorated" });
    if (q.remainingDays <= 0) throw new MembershipError("Your plan ends today. Renew on the new plan instead.");
    const staffId = await ownerId();
    await db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: "change",
        toPlanId: next.id,
        newStart: q.newStart,
        newEnd: q.newEnd,
        effectiveDate: today,
        policy: "prorated",
        amount: q.amount,
        payNow: false,
        reason: `${SELF_SERVICE}${member.plan.name} → ${next.name}, ${q.remainingDays} days left repriced`,
        staffId,
      }),
    );
    msg =
      q.amount > 0
        ? `You're on ${next.name} now. Please pay ${inr(q.amount)} at the front desk.`
        : q.amount < 0
          ? `You're on ${next.name} now. A refund of ${inr(-q.amount)} is on its way to the way you last paid.`
          : `You're on ${next.name} now.`;
  } catch (e) {
    if (e instanceof MembershipError) back("error", e.message);
    throw e;
  }
  refresh(member.id);
  back("ok", msg);
}

export async function memberRenew(formData: FormData) {
  const member = await requireMember();
  const planId = Number(formData.get("planId")) || 0;
  let msg = "";
  try {
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan || (!plan.active && plan.id !== member.planId)) throw new MembershipError("That plan isn't available");
    const { state, daysLeft } = memberState(member);
    if (state === "suspended") throw new MembershipError("Your membership is on hold. Please talk to the front desk.");
    if (daysLeft > RENEW_WINDOW_DAYS) throw new MembershipError(`You can renew in the app from ${RENEW_WINDOW_DAYS} days before your plan ends.`);
    const age = juniorAgeError(plan.name, member.birthDate);
    if (age) throw new MembershipError(age);
    await guard(member.id);

    const today = dayStart(new Date());
    const q = renewalQuote(member.endDate, today, plan, member.plan);
    const staffId = await ownerId();
    await db.$transaction((tx) =>
      applyMembershipEvent(tx, {
        memberId: member.id,
        kind: "renewal",
        toPlanId: plan.id,
        newStart: q.early ? member.startDate : q.newStart,
        newEnd: q.newEnd,
        effectiveDate: q.newStart,
        amount: q.amount,
        payNow: false,
        reason: `${SELF_SERVICE}renewed on ${plan.name}${q.adjustment ? `, ${q.remainingDays} days left repriced` : ""}`,
        staffId,
      }),
    );
    msg =
      q.amount > 0
        ? `Renewed until ${q.newEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. Please pay ${inr(q.amount)} at the front desk.`
        : `Renewed until ${q.newEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`;
  } catch (e) {
    if (e instanceof MembershipError) back("error", e.message);
    throw e;
  }
  refresh(member.id);
  back("ok", msg);
}
