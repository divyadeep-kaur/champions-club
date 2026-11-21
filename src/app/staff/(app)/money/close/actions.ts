"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { daySummary } from "@/lib/cashClose";
import { requireStaff } from "@/lib/session";

export type CloseState = { error?: string; ok?: string; at?: number };

const schema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  counted: z.coerce.number({ message: "Enter the cash you counted" }).int("Whole rupees only").min(0, "Cash can’t be negative").max(10_000_000),
  note: z.string().trim().max(300).optional(),
});

export async function closeDay(_: CloseState, formData: FormData): Promise<CloseState> {
  const staff = await requireStaff(["owner"]);
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { day, counted, note } = parsed.data;
  if (new Date(`${day}T00:00:00`) > new Date()) return { error: "You can’t close a day that hasn’t started" };
  const s = await daySummary(day, counted);
  if (s.variance !== 0 && !note) return { error: "The count doesn’t match. Add a note explaining the difference." };
  try {
    await db.cashClose.create({
      data: {
        day,
        expectedCash: s.expectedCash,
        countedCash: counted,
        variance: s.variance ?? 0,
        upi: s.upi,
        card: s.card,
        other: s.other,
        note: note || null,
        staffName: staff.name,
      },
    });
  } catch {
    return { error: "This day is already closed" };
  }
  revalidatePath("/staff/money", "layout");
  return {
    ok:
      s.variance === 0
        ? "Day closed. Cash matches."
        : `Day closed with a ${s.variance! > 0 ? "surplus" : "shortfall"} of ₹${Math.abs(s.variance!).toLocaleString("en-IN")}.`,
    at: Date.now(),
  };
}
