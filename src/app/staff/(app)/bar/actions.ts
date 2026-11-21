"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { recomputeTab } from "@/lib/tabs";
import { requireStaff } from "@/lib/session";

export type TabState = { error?: string; ok?: string };

const refresh = () => {
  revalidatePath("/staff/bar");
  revalidatePath("/staff");
  revalidatePath("/me");
  revalidatePath("/me/cafe");
};

async function openShift(staffId: number) {
  return db.shift.findFirst({ where: { staffId, end: null }, orderBy: { start: "desc" } });
}

export async function startShift() {
  const staff = await requireStaff(["owner", "bar"]);
  if (!(await openShift(staff.id))) await db.shift.create({ data: { staffId: staff.id } });
  refresh();
}

export async function closeShift() {
  const staff = await requireStaff(["owner", "bar"]);
  const shift = await openShift(staff.id);
  if (shift) await db.shift.update({ where: { id: shift.id }, data: { end: new Date() } });
  refresh();
  redirect("/staff/bar?closed=1");
}

export async function addItem(formData: FormData) {
  const staff = await requireStaff(["owner", "bar"]);
  const menuItemId = Number(formData.get("menuItemId"));
  const tableId = Number(formData.get("tableId")) || null;
  let tabId = Number(formData.get("tabId")) || null;

  const item = await db.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item || !item.active) return;

  await db.$transaction(async (tx) => {
    if (!tabId) {
      const existing = tableId ? await tx.tab.findFirst({ where: { tableId, status: "open" }, orderBy: { openedAt: "asc" } }) : null;
      if (existing) tabId = existing.id;
      else {
        const shift = await tx.shift.findFirst({ where: { staffId: staff.id, end: null } });
        tabId = (await tx.tab.create({ data: { tableId, guestName: "Guest", shiftId: shift?.id } })).id;
      }
    }
    const line = await tx.tabItem.findFirst({ where: { tabId, menuItemId, status: "new", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
    if (line) await tx.tabItem.update({ where: { id: line.id }, data: { qty: { increment: 1 } } });
    else await tx.tabItem.create({ data: { tabId, menuItemId, qty: 1, unitPrice: item.price } });
    await recomputeTab(tx, tabId);
  });
  refresh();
  redirect(`/staff/bar?tab=${tabId}`);
}

export async function removeItem(formData: FormData) {
  await requireStaff(["owner", "bar"]);
  const line = await db.tabItem.findUnique({ where: { id: Number(formData.get("itemId")) }, include: { tab: true } });
  if (!line || line.tab.status !== "open") return;
  await db.$transaction(async (tx) => {
    if (line.qty > 1) await tx.tabItem.update({ where: { id: line.id }, data: { qty: { decrement: 1 } } });
    else await tx.tabItem.delete({ where: { id: line.id } });
    await recomputeTab(tx, line.tabId);
  });
  refresh();
}

export async function attachMember(_: TabState, formData: FormData): Promise<TabState> {
  await requireStaff(["owner", "bar"]);
  const tabId = Number(formData.get("tabId"));
  const ref = String(formData.get("member") ?? "").trim();
  const code = ref.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  const digits = ref.replace(/\D/g, "");
  const member = code
    ? await db.member.findUnique({ where: { code } })
    : digits.length === 10
      ? await db.member.findUnique({ where: { phone: digits } })
      : null;
  if (!member) return { error: "No member found. Use their code or 10-digit phone" };
  await db.$transaction(async (tx) => {
    await tx.tab.update({ where: { id: tabId }, data: { memberId: member.id, guestName: null } });
    await recomputeTab(tx, tabId);
  });
  refresh();
  return { ok: `${member.name} added, discount applied` };
}

export async function settleTab(formData: FormData) {
  const staff = await requireStaff(["owner", "bar"]);
  const tabId = Number(formData.get("tabId"));
  const method = String(formData.get("method"));
  if (!["cash", "card", "upi"].includes(method)) return;
  const tab = await db.tab.findUnique({ where: { id: tabId }, include: { table: true, member: true, items: true } });
  if (!tab || tab.status !== "open" || tab.items.length === 0) return;
  const shift = await openShift(staff.id);
  await db.$transaction([
    db.tab.update({ where: { id: tab.id }, data: { status: "paid", paymentMethod: method, closedAt: new Date(), shiftId: tab.shiftId ?? shift?.id } }),
    db.payment.create({
      data: {
        source: "bar",
        refId: tab.id,
        amount: tab.total,
        method,
        note: `${tab.table ? `${tab.table.label} tab` : "Counter tab"}${tab.member ? ` · ${tab.member.name}` : ""}`,
      },
    }),
  ]);
  refresh();
  redirect(`/staff/bar?paid=${encodeURIComponent(`${tab.table?.label ?? "Counter"} paid ${inr(tab.total)} by ${method.toUpperCase()}`)}`);
}
