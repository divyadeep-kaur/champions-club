import { describe, expect, it } from "vitest";
import { ageOn, juniorAgeError, membershipStatus, nextMemberCode, normalizePhone, renewalPeriod } from "./members";

const d = (s: string) => new Date(`${s}T00:00:00`);

describe("membershipStatus", () => {
  const today = d("2026-11-21");
  it("is active with more than 7 days left", () => {
    expect(membershipStatus(d("2026-12-10"), today)).toEqual({ status: "active", daysLeft: 19 });
  });
  it("is ending within 7 days, including the last day", () => {
    expect(membershipStatus(d("2026-11-28"), today)).toEqual({ status: "ending", daysLeft: 7 });
    expect(membershipStatus(d("2026-11-21"), today)).toEqual({ status: "ending", daysLeft: 0 });
  });
  it("is expired once the end date has passed", () => {
    expect(membershipStatus(d("2026-11-20"), today)).toEqual({ status: "expired", daysLeft: -1 });
  });
});

describe("renewalPeriod", () => {
  it("extends from the current end date when still active", () => {
    const { start, end } = renewalPeriod(d("2026-11-25"), d("2026-11-21"), 30);
    expect(start).toEqual(d("2026-11-25"));
    expect(end).toEqual(d("2026-12-25"));
  });
  it("starts from today when already expired", () => {
    const { start, end } = renewalPeriod(d("2026-10-01"), d("2026-11-21"), 30);
    expect(start).toEqual(d("2026-11-21"));
    expect(end).toEqual(d("2026-12-21"));
  });
});

describe("ageOn and juniorAgeError", () => {
  it("counts birthdays correctly", () => {
    expect(ageOn(d("2008-11-22"), d("2026-11-21"))).toBe(17);
    expect(ageOn(d("2008-11-21"), d("2026-11-21"))).toBe(18);
  });
  it("only lets under-18s join Junior", () => {
    expect(juniorAgeError("Junior", d("2010-05-01"), d("2026-11-21"))).toBeNull();
    expect(juniorAgeError("Junior", d("2000-05-01"), d("2026-11-21"))).toMatch(/under 18/);
    expect(juniorAgeError("Junior", null, d("2026-11-21"))).toMatch(/date of birth/);
    expect(juniorAgeError("Gold", null, d("2026-11-21"))).toBeNull();
  });
});

describe("nextMemberCode", () => {
  it("increments the last code", () => {
    expect(nextMemberCode("CC-0012")).toBe("CC-0013");
    expect(nextMemberCode("CC-0999")).toBe("CC-1000");
  });
  it("starts at CC-0001", () => {
    expect(nextMemberCode(null)).toBe("CC-0001");
  });
});

describe("normalizePhone", () => {
  it("accepts Indian mobile numbers in common formats", () => {
    expect(normalizePhone("98765 43210")).toBe("9876543210");
    expect(normalizePhone("+91-98765-43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });
  it("rejects anything else", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("5876543210")).toBeNull();
  });
});
