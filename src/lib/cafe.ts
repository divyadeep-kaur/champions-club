import { db } from "./db";

export function cafeShift() {
  return db.shift.findFirst({ where: { end: null }, orderBy: { start: "desc" } });
}
