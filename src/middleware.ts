import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { MEMBER_COOKIE, verifyMember } from "@/lib/memberAuth";
import { homeFor } from "@/lib/nav";

function guard(req: NextRequest, signedIn: boolean, loginPath: string, homePath: string) {
  const onLogin = req.nextUrl.pathname === loginPath;
  if (!signedIn && !onLogin) {
    const url = new URL(loginPath, req.url);
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if (signedIn && onLogin) return NextResponse.redirect(new URL(homePath, req.url));
  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/me/signout" || req.nextUrl.pathname === "/staff/signout") return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/me")) {
    const member = await verifyMember(req.cookies.get(MEMBER_COOKIE)?.value);
    return guard(req, !!member, "/me/login", "/me");
  }
  const staff = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (staff && req.nextUrl.pathname === "/staff/login" && req.nextUrl.searchParams.get("as") === "admin" && staff.role !== "owner") return NextResponse.next();
  return guard(req, !!staff, "/staff/login", staff ? homeFor(staff.role) : "/staff");
}

export const config = { matcher: ["/staff/:path*", "/me/:path*"] };
