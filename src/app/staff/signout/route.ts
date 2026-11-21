import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/staff/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
