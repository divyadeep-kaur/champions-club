import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./constants";

export const SESSION_COOKIE = "cc_session";
export const SESSION_MAX_AGE = 60 * 60 * 12;

export type Session = { id: number; name: string; role: Role };

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function signSession(session: Session) {
  return new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${SESSION_MAX_AGE}s`).sign(key());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { id: payload.id as number, name: payload.name as string, role: payload.role as Role };
  } catch {
    return null;
  }
}
