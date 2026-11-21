"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/members";

export type TrialState = { error?: string; done?: { name: string; when?: string }; fields?: Record<string, string> };

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(1, "Enter your mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  interest: z.enum(["trial", "membership", "other"]),
  date: z.string().optional(),
  time: z.string().optional(),
  courtId: z.string().optional(),
  plan: z.string().optional(),
  message: z.string().trim().max(500).optional(),
  website: z.string().max(0).optional(),
});

export async function submitTrial(_: TrialState, formData: FormData): Promise<TrialState> {
  const fields = Object.fromEntries(formData) as Record<string, string>;
  if (fields.website) return { done: { name: "there" } };
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;

  const phone = normalizePhone(f.phone);
  if (!phone) return { error: "Enter a 10-digit Indian mobile number", fields };

  let preferredAt: Date | null = null;
  if (f.date && f.time && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^\d{2}:\d{2}$/.test(f.time)) {
    preferredAt = new Date(`${f.date}T${f.time}:00`);
    if (preferredAt < new Date()) return { error: "Pick a time later than now", fields };
  }

  const court = f.courtId ? await db.court.findUnique({ where: { id: Number(f.courtId) || 0 } }) : null;
  const details = [court && `Court: ${court.name}`, f.plan && `Plan: ${f.plan}`, f.message].filter(Boolean).join(" · ");

  await db.lead.create({
    data: { name: f.name, phone, email: f.email || null, interest: f.interest, preferredAt, message: details || null, status: "new" },
  });
  revalidatePath("/staff/leads");
  revalidatePath("/staff");

  return {
    done: {
      name: f.name.split(" ")[0],
      when: preferredAt
        ? preferredAt.toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
        : undefined,
    },
  };
}
