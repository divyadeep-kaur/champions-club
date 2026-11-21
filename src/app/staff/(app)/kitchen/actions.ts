"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

const refresh = () => {
  revalidatePath("/staff/kitchen");
  revalidatePath("/staff/bar", "layout");
  revalidatePath("/me/cafe");
};

// Each move only applies to items still in the stage it comes from, so two people
// tapping at once can't push an order two steps.
const FROM: Record<string, string[]> = {
  preparing: ["new"],
  ready: ["new", "preparing"],
  served: ["ready"],
  back: ["ready"],
};

export async function markItems(formData: FormData) {
  await requireStaff(["owner", "bar"]);
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter(Boolean);
  const to = String(formData.get("to"));
  if (!ids.length || !FROM[to]) return;
  await db.tabItem.updateMany({
    where: { id: { in: ids }, status: { in: FROM[to] }, tab: { status: "open" } },
    data: to === "back" ? { status: "preparing", readyAt: null } : { status: to, ...(to === "ready" ? { readyAt: new Date() } : {}) },
  });
  refresh();
}

// Marks a dish sold out (hidden from the counter and the member app) or puts it back on.
export async function setAvailable(formData: FormData) {
  await requireStaff(["owner", "bar"]);
  const id = Number(formData.get("id"));
  const active = formData.get("active") === "yes";
  if (!id) return;
  await db.menuItem.updateMany({ where: { id }, data: { active } });
  refresh();
  revalidatePath("/");
}
