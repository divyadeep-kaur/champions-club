import { describe, expect, it } from "vitest";
import { benefitPlan, extensionQuote, memberState, paymentStateFor, photoError, planChangeQuote, prorationBreakdown, refundCap, renewalQuote } from "./membership";

const d = (m: number, day: number) => new Date(2026, m - 1, day);
const gold = { monthlyFee: 3999, durationDays: 30 };
const silver = { monthlyFee: 2499, durationDays: 30 };

describe("member state and benefits", () => {
  const plan = { name: "Gold" };
  it("gives plan benefits only to current, unsuspended members", () => {
    expect(benefitPlan({ endDate: d(12, 1), suspendedAt: null, plan }, d(11, 21))).toBe(plan);
    expect(benefitPlan({ endDate: d(11, 20), suspendedAt: null, plan }, d(11, 21))).toBeNull();
    expect(benefitPlan({ endDate: d(12, 1), suspendedAt: d(11, 10), plan }, d(11, 21))).toBeNull();
    expect(benefitPlan(null)).toBeNull();
  });
  it("reports suspended ahead of expiry", () => {
    expect(memberState({ endDate: d(11, 1), suspendedAt: d(10, 1) }, d(11, 21)).state).toBe("suspended");
    expect(memberState({ endDate: d(11, 25), suspendedAt: null }, d(11, 21)).state).toBe("ending");
    expect(memberState({ endDate: d(11, 20), suspendedAt: null }, d(11, 21)).state).toBe("expired");
  });
});

describe("plan change", () => {
  const base = { startDate: d(11, 11), endDate: d(12, 11), effective: d(11, 21) };
  it("upgrade keeping the expiry charges the prorated difference for the days left", () => {
    const q = planChangeQuote({ ...base, current: silver, next: gold, timing: "keep", policy: "prorated" });
    expect(q.remainingDays).toBe(20);
    expect(q.amount).toBe(1000);
    expect(q.newEnd).toEqual(d(12, 11));
    expect(q.newStart).toEqual(d(11, 11));
  });
  it("downgrade keeping the expiry gives a credit, never resetting the dates", () => {
    const q = planChangeQuote({ ...base, current: gold, next: silver, timing: "keep", policy: "prorated" });
    expect(q.amount).toBe(-1000);
    expect(q.newEnd).toEqual(d(12, 11));
  });
  it("no-adjustment and custom policies use the owner's choice", () => {
    expect(planChangeQuote({ ...base, current: silver, next: gold, timing: "keep", policy: "none" }).amount).toBe(0);
    expect(planChangeQuote({ ...base, current: silver, next: gold, timing: "keep", policy: "custom", customAmount: 750 }).amount).toBe(750);
  });
  it("restart starts a new period and credits the unused days", () => {
    const q = planChangeQuote({ ...base, current: silver, next: gold, timing: "restart", policy: "prorated" });
    expect(q.newStart).toEqual(d(11, 21));
    expect(q.newEnd).toEqual(d(12, 21));
    expect(q.amount).toBe(3999 - Math.round((2499 / 30) * 20));
  });
  it("an expired membership always restarts at the full new price", () => {
    const q = planChangeQuote({ ...base, endDate: d(11, 1), current: silver, next: gold, timing: "keep", policy: "prorated" });
    expect(q.expired).toBe(true);
    expect(q.timing).toBe("restart");
    expect(q.amount).toBe(3999);
    expect(q.newStart).toEqual(d(11, 21));
  });
});

describe("renewal and extension", () => {
  it("renewing early continues from the current expiry", () => {
    const q = renewalQuote(d(12, 1), d(11, 21), gold);
    expect(q.newStart).toEqual(d(12, 1));
    expect(q.newEnd).toEqual(d(12, 31));
    expect(q.amount).toBe(3999);
    expect(q.early).toBe(true);
  });
  it("renewing after expiry starts on the renewal date", () => {
    const q = renewalQuote(d(11, 1), d(11, 21), silver);
    expect(q.newStart).toEqual(d(11, 21));
    expect(q.early).toBe(false);
  });
  it("extends from the expiry, or from today once expired", () => {
    expect(extensionQuote(d(12, 1), 7, d(11, 21)).newEnd).toEqual(d(12, 8));
    expect(extensionQuote(d(11, 1), 7, d(11, 21)).newEnd).toEqual(d(11, 28));
  });
});

describe("payments", () => {
  it("never assumes a payment was made", () => {
    expect(paymentStateFor(500, false)).toBe("pending");
    expect(paymentStateFor(500, true)).toBe("paid");
    expect(paymentStateFor(0, true)).toBe("none");
    expect(paymentStateFor(-200, true)).toBe("refunded");
    expect(paymentStateFor(-200, false)).toBe("credit");
  });
  it("checks photos", () => {
    expect(photoError({ type: "image/png", size: 10 })).toBeNull();
    expect(photoError({ type: "image/gif", size: 10 })).toMatch(/JPG/);
  });
});

describe("prorated refunds and top-ups", () => {
  const base = { startDate: d(11, 11), endDate: d(12, 11), effective: d(11, 21) };
  const junior = { monthlyFee: 1499, durationDays: 30 };

  it("downgrade Gold to Silver refunds only the days not yet used", () => {
    // 10 days used on Gold, 20 left: (2499 - 3999) / 30 × 20 = -1000
    const q = planChangeQuote({ ...base, current: gold, next: silver, timing: "keep", policy: "prorated" });
    expect(q.remainingDays).toBe(20);
    expect(q.amount).toBe(-1000);
    expect(paymentStateFor(q.amount, false)).toBe("credit");
  });

  it("upgrade Junior to Silver charges the difference for the days left", () => {
    // (2499 - 1499) / 30 × 20 = 666.67 → 667
    const q = planChangeQuote({ ...base, current: junior, next: silver, timing: "keep", policy: "prorated" });
    expect(q.amount).toBe(667);
    expect(paymentStateFor(q.amount, false)).toBe("pending");
  });

  it("breakdown shows what comes back and what is charged", () => {
    const b = prorationBreakdown({ ...gold, name: "Gold" }, { ...silver, name: "Silver" }, 20);
    expect(b.unused).toBe(2666);
    expect(b.newCost).toBe(1666);
    expect(b.lines[0]).toContain("Gold");
  });

  it("early renewal onto a cheaper plan reprices the days left", () => {
    const q = renewalQuote(d(12, 1), d(11, 21), silver, gold);
    expect(q.remainingDays).toBe(10);
    expect(q.adjustment).toBe(-500);
    expect(q.amount).toBe(2499 - 500);
    expect(q.newStart).toEqual(d(12, 1));
  });

  it("renewing on the same plan, or after expiry, has no adjustment", () => {
    expect(renewalQuote(d(12, 1), d(11, 21), gold, gold).adjustment).toBe(0);
    expect(renewalQuote(d(11, 1), d(11, 21), silver, gold).adjustment).toBe(0);
  });

  it("never refunds more than was received", () => {
    expect(refundCap(1000, 4000)).toBe(1000);
    expect(refundCap(1000, 600)).toBe(600);
    expect(refundCap(1000, -50)).toBe(0);
  });
});
