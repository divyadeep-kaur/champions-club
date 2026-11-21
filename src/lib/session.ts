import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { redirect } from "next/navigation";
import type { Role } from "./constants";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Session } from "./jwt";

export async function createSession(session: Session) {
  (await cookies()).set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

// The person's current record. Role and name always come from here, never from the
// cookie alone, so a stale or reused token can't act with a role the person doesn't have.
const staffRecord = cache((id: number) => db.staff.findFirst({ where: { id, active: true }, select: { id: true, name: true, role: true } }));

export async function requireStaff(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  const staff = await staffRecord(session.id);
  if (!staff || staff.role !== session.role) redirect("/staff/signout");
  const current = { ...session, name: staff.name, role: staff.role as Role };
  if (roles && !roles.includes(current.role)) redirect("/staff");
  return current;
}
