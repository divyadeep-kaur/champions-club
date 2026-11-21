const DAY = 24 * 60 * 60 * 1000;

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysFrom = (a: Date, b: Date) => Math.round((dayStart(b).getTime() - dayStart(a).getTime()) / DAY);

export type MembershipStatus = "active" | "ending" | "expired";

export function membershipStatus(endDate: Date, today = new Date()): { status: MembershipStatus; daysLeft: number } {
  const daysLeft = daysFrom(today, endDate);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 7) return { status: "ending", daysLeft };
  return { status: "active", daysLeft };
}

export function renewalPeriod(currentEnd: Date, today: Date, durationDays: number) {
  const start = dayStart(currentEnd) > dayStart(today) ? dayStart(currentEnd) : dayStart(today);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return { start, end };
}

export function ageOn(birthDate: Date, on: Date) {
  let age = on.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = on.getMonth() < birthDate.getMonth() || (on.getMonth() === birthDate.getMonth() && on.getDate() < birthDate.getDate());
  if (beforeBirthday) age--;
  return age;
}

export function juniorAgeError(planName: string, birthDate: Date | null, today = new Date()) {
  if (planName !== "Junior") return null;
  if (!birthDate) return "Junior plan needs a date of birth";
  if (ageOn(birthDate, today) >= 18) return "Junior plan is only for players under 18";
  return null;
}

export function nextMemberCode(lastCode: string | null) {
  const n = lastCode ? Number(lastCode.replace(/\D/g, "")) + 1 : 1;
  return `CC-${String(n).padStart(4, "0")}`;
}

export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}
