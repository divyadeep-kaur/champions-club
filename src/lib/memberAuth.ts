import { SignJWT, jwtVerify } from "jose";

export const MEMBER_COOKIE = "cc_member";
export const MEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export type MemberSession = { memberId: number; name: string };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signMember(session: MemberSession) {
  return new SignJWT({ ...session, kind: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MEMBER_MAX_AGE}s`)
    .sign(key());
}

export async function verifyMember(token: string | undefined): Promise<MemberSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.kind !== "member") return null;
    return { memberId: payload.memberId as number, name: payload.name as string };
  } catch {
    return null;
  }
}
