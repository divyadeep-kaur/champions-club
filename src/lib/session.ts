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

const staffExists = cache(async (id: number) => !!(await db.staff.findUnique({ where: { id }, select: { id: true } })));

export async function requireStaff(roles?: Role[]) {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (!(await staffExists(session.id))) redirect("/staff/signout");
  if (roles && !roles.includes(session.role)) redirect("/staff");
  return session;
}
