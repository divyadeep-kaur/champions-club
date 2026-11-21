const DAY = 24 * 60 * 60 * 1000;

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
export const startOfWeek = (d = new Date()) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
export const daysBetween = (a: Date, b: Date) => Math.ceil((b.getTime() - a.getTime()) / DAY);

export const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
