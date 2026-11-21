import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = pathname === "/staff/login";

  if (!session && !onLogin) {
    const url = new URL("/staff/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session && onLogin) return NextResponse.redirect(new URL("/staff", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/staff/:path*"] };
