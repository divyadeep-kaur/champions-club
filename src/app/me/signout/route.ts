import { NextResponse } from "next/server";
import { MEMBER_COOKIE } from "@/lib/memberAuth";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/me/login", req.url));
  res.cookies.delete(MEMBER_COOKIE);
  return res;
}
