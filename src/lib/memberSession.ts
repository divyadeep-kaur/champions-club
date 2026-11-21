import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { MEMBER_COOKIE, MEMBER_MAX_AGE, signMember, verifyMember, type MemberSession } from "./memberAuth";

export async function createMemberSession(session: MemberSession) {
  (await cookies()).set(MEMBER_COOKIE, await signMember(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MEMBER_MAX_AGE,
  });
}

export async function clearMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function requireMember() {
  const session = await verifyMember((await cookies()).get(MEMBER_COOKIE)?.value);
  if (!session) redirect("/me/login");
  const member = await db.member.findUnique({ where: { id: session.memberId }, include: { plan: true } });
  if (!member) redirect("/me/signout");
  return member;
}
