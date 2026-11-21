import { describe, expect, it } from "vitest";
import { byDepartment, nextStaffCode, payslip, statutoryDue } from "./payroll";

describe("payslip", () => {
  it("splits a low salary and applies PF, ESI and no professional tax", () => {
    const s = payslip(15000);
    expect(s).toMatchObject({ basic: 7500, hra: 3000, allowance: 4500, pf: 900, esi: 113, pt: 0, net: 13987, employerPf: 900, employerEsi: 488 });
    expect(s.ctc).toBe(15000 + 900 + 488);
  });

  it("caps PF at the wage ceiling and drops ESI above the limit", () => {
    const s = payslip(65000);
    expect(s.pf).toBe(1800);
    expect(s.esi).toBe(0);
    expect(s.employerEsi).toBe(0);
    expect(s.pt).toBe(200);
    expect(s.net).toBe(65000 - 1800 - 200);
  });

  it("recovers an advance but never takes pay below zero", () => {
    expect(payslip(20000, 5000).advance).toBe(5000);
    const big = payslip(13000, 50000);
    expect(big.net).toBe(0);
    expect(big.advance).toBe(13000 - big.pf - big.esi - big.pt);
  });

  it("returns zeros for an unpaid owner", () => {
    expect(payslip(0)).toMatchObject({ net: 0, ctc: 0, esi: 0, pt: 0 });
  });
});

describe("statutoryDue", () => {
  it("adds employee and employer shares", () => {
    const d = statutoryDue([payslip(15000), payslip(65000)]);
    expect(d.pf).toBe(900 * 2 + 1800 * 2);
    expect(d.esi).toBe(113 + 488);
    expect(d.pt).toBe(200);
    expect(d.total).toBe(d.pf + d.esi + d.pt);
  });
});

describe("nextStaffCode", () => {
  it("continues from the highest code", () => {
    expect(nextStaffCode([])).toBe("STF-001");
    expect(nextStaffCode(["STF-002", null, "STF-010", "X-99"])).toBe("STF-011");
  });
});

describe("byDepartment", () => {
  it("groups headcount and cost and hides empty departments", () => {
    const rows = byDepartment([
      { department: "security", monthlySalary: 16000 },
      { department: "security", monthlySalary: 15000 },
      { department: "coaching", monthlySalary: 50000 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["coaching", "security"]);
    expect(rows[1]).toMatchObject({ headcount: 2, gross: 31000 });
  });
});
