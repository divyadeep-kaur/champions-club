"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ROLES } from "@/lib/constants";
import { DEPARTMENTS, nextStaffCode } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";

export type TeamState = { error?: string; ok?: string; at?: number };

const refresh = () => {
  revalidatePath("/staff/team", "layout");
  revalidatePath("/staff/money", "layout");
};

const deptKeys = DEPARTMENTS.map((d) => d.key) as [string, ...string[]];
const staffRoles = ROLES.filter((r) => r !== "owner") as [string, ...string[]];

const addSchema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be 10 digits"),
  jobTitle: z.string().trim().min(2, "Enter a job title").max(60),
  department: z.enum(deptKeys),
  role: z.enum(staffRoles),
  salary: z.coerce.number().int("Whole rupees only").min(0).max(1_000_000),
  joinedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the joining date"),
});

export async function addStaff(_: TeamState, formData: FormData): Promise<TeamState> {
  await requireStaff(["owner"]);
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  if (await db.staff.findUnique({ where: { email: f.email } })) return { error: "Someone already uses that email" };

  const codes = await db.staff.findMany({ select: { code: true } });
  const code = nextStaffCode(codes.map((c) => c.code));
  const password = randomBytes(6).toString("base64url");
  await db.staff.create({
    data: {
      name: f.name,
      email: f.email,
      phone: f.phone,
      jobTitle: f.jobTitle,
      department: f.department,
      role: f.role,
      monthlySalary: f.salary,
      joinedAt: new Date(`${f.joinedAt}T10:00:00`),
      code,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  refresh();
  return { ok: `${f.name} added as ${code}. First sign-in password: ${password} (share it privately).`, at: Date.now() };
}

const editSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  jobTitle: z.string().trim().min(2).max(60),
  department: z.enum(deptKeys),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone must be 10 digits"),
  salary: z.coerce.number().int().min(0).max(1_000_000),
});

export async function updateStaff(_: TeamState, formData: FormData): Promise<TeamState> {
  await requireStaff(["owner"]);
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  await db.staff.update({ where: { id: f.staffId }, data: { jobTitle: f.jobTitle, department: f.department, phone: f.phone, monthlySalary: f.salary } });
  refresh();
  return { ok: "Saved", at: Date.now() };
}

export async function setActive(formData: FormData) {
  const session = await requireStaff(["owner"]);
  const id = Number(formData.get("staffId"));
  if (id === session.id) return;
  await db.staff.update({ where: { id }, data: { active: formData.get("active") === "1" } });
  refresh();
}
