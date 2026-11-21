import { describe, expect, it } from "vitest";
import { benefitPlan, extensionQuote, memberState, paymentStateFor, photoError, planChangeQuote, renewalQuote } from "./membership";

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
    expect(paymentStateFor(-200, true)).toBe("credit");
  });
  it("checks photos", () => {
    expect(photoError({ type: "image/png", size: 10 })).toBeNull();
    expect(photoError({ type: "image/gif", size: 10 })).toMatch(/JPG/);
  });
});
