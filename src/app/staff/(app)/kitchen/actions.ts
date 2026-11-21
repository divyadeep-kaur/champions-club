"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

const refresh = () => {
  revalidatePath("/staff/kitchen");
  revalidatePath("/staff/bar");
};

export async function markItems(formData: FormData) {
  await requireStaff(["owner", "bar"]);
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter(Boolean);
  const to = String(formData.get("to"));
  if (!ids.length || !["ready", "served"].includes(to)) return;
  await db.tabItem.updateMany({
    where: { id: { in: ids }, status: to === "ready" ? "new" : "ready" },
    data: { status: to, ...(to === "ready" ? { readyAt: new Date() } : {}) },
  });
  refresh();
}
