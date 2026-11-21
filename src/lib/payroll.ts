export const DEPARTMENTS = [
  { key: "management", label: "Management" },
  { key: "coaching", label: "Coaching" },
  { key: "front", label: "Front desk" },
  { key: "cafe", label: "Café & kitchen" },
  { key: "shop", label: "Pro shop" },
  { key: "housekeeping", label: "Housekeeping" },
  { key: "security", label: "Security" },
  { key: "grounds", label: "Grounds & courts" },
] as const;

export type Department = (typeof DEPARTMENTS)[number]["key"];
export const deptLabel = (key: string) => DEPARTMENTS.find((d) => d.key === key)?.label ?? key;

export const QUERY_TOPICS = [
  { key: "pay", label: "Salary or payslip" },
  { key: "advance", label: "Salary advance" },
  { key: "claim", label: "Expense claim" },
  { key: "leave", label: "Leave balance" },
  { key: "schedule", label: "Shift or schedule" },
  { key: "other", label: "Something else" },
] as const;

export type QueryTopic = (typeof QUERY_TOPICS)[number]["key"];
export const topicLabel = (key: string) => QUERY_TOPICS.find((t) => t.key === key)?.label ?? key;
export const MONEY_TOPICS: string[] = ["advance", "claim"];

export const PF_WAGE_CAP = 15000;
export const ESI_GROSS_LIMIT = 21000;
export const PT_MONTHLY = 200;
export const PT_YEARLY_THRESHOLD = 250000;

export type Slip = {
  gross: number;
  basic: number;
  hra: number;
  allowance: number;
  pf: number;
  esi: number;
  pt: number;
  advance: number;
  deductions: number;
  net: number;
  employerPf: number;
  employerEsi: number;
  ctc: number;
};

export function payslip(gross: number, advance = 0): Slip {
  const basic = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.2);
  const allowance = gross - basic - hra;
  const pf = Math.round(Math.min(basic, PF_WAGE_CAP) * 0.12);
  const esiApplies = gross > 0 && gross <= ESI_GROSS_LIMIT;
  const esi = esiApplies ? Math.ceil(gross * 0.0075) : 0;
  const pt = gross * 12 > PT_YEARLY_THRESHOLD ? PT_MONTHLY : 0;
  const recover = Math.max(0, Math.min(advance, gross - pf - esi - pt));
  const deductions = pf + esi + pt + recover;
  const employerPf = pf;
  const employerEsi = esiApplies ? Math.ceil(gross * 0.0325) : 0;
  return {
    gross,
    basic,
    hra,
    allowance,
    pf,
    esi,
    pt,
    advance: recover,
    deductions,
    net: gross - deductions,
    employerPf,
    employerEsi,
    ctc: gross + employerPf + employerEsi,
  };
}

export function statutoryDue(slips: Pick<Slip, "pf" | "esi" | "pt" | "employerPf" | "employerEsi">[]) {
  const pf = slips.reduce((s, x) => s + x.pf + x.employerPf, 0);
  const esi = slips.reduce((s, x) => s + x.esi + x.employerEsi, 0);
  const pt = slips.reduce((s, x) => s + x.pt, 0);
  return { pf, esi, pt, total: pf + esi + pt };
}

export function nextStaffCode(codes: (string | null)[]) {
  const max = codes.reduce((m, c) => Math.max(m, Number(c?.match(/^STF-(\d+)$/)?.[1] ?? 0)), 0);
  return `STF-${String(max + 1).padStart(3, "0")}`;
}

export function byDepartment(staff: { department: string; monthlySalary: number }[]) {
  return DEPARTMENTS.map((d) => {
    const people = staff.filter((s) => s.department === d.key);
    const gross = people.reduce((s, p) => s + p.monthlySalary, 0);
    const ctc = people.reduce((s, p) => s + payslip(p.monthlySalary).ctc, 0);
    return { ...d, headcount: people.length, gross, ctc };
  }).filter((d) => d.headcount > 0);
}
