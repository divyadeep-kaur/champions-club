"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clearSession, createSession } from "@/lib/session";
import type { Role } from "@/lib/constants";
import { homeFor } from "@/lib/nav";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
  as: z.enum(["admin", "staff"]).optional(),
});

export type LoginState = { error?: string; email?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const staff = await db.staff.findUnique({ where: { email: parsed.data.email } });
  const ok = staff && (await bcrypt.compare(parsed.data.password, staff.passwordHash));
  if (!ok) return { error: "Email or password is incorrect", email };
  if (!staff.active) return { error: "This staff account is switched off. Ask the owner.", email };
  if (parsed.data.as === "admin" && staff.role !== "owner") return { error: "This account is not an admin. Use Staff sign in instead.", email };

  await createSession({ id: staff.id, name: staff.name, role: staff.role as Role });
  const next = parsed.data.next;
  redirect(next && next.startsWith("/staff") && !next.startsWith("//") ? next : homeFor(staff.role));
}

export async function logout() {
  await clearSession();
  redirect("/staff/login");
}
