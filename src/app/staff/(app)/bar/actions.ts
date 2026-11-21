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

  if (tabId) {
    const current = await db.tab.findUnique({ where: { id: tabId }, select: { status: true } });
    if (!current || current.status !== "open") return;
  }

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

// Items not yet cooked can be taken off freely. Once the kitchen has started, only the owner
// can remove one, and it is kept as a void line so the value stays on record.
export async function removeItem(formData: FormData) {
  const staff = await requireStaff(["owner", "bar"]);
  const line = await db.tabItem.findUnique({ where: { id: Number(formData.get("itemId")) }, include: { tab: true } });
  if (!line || line.tab.status !== "open" || line.status === "void") return;
  const cooked = line.status !== "new";
  if (cooked && staff.role !== "owner") return;
  await db.$transaction(async (tx) => {
    if (!cooked) {
      if (line.qty > 1) await tx.tabItem.update({ where: { id: line.id }, data: { qty: { decrement: 1 } } });
      else await tx.tabItem.delete({ where: { id: line.id } });
    } else if (line.qty > 1) {
      await tx.tabItem.update({ where: { id: line.id }, data: { qty: { decrement: 1 } } });
      await tx.tabItem.create({
        data: { tabId: line.tabId, menuItemId: line.menuItemId, qty: 1, unitPrice: line.unitPrice, status: "void", createdAt: line.createdAt },
      });
    } else {
      await tx.tabItem.update({ where: { id: line.id }, data: { status: "void" } });
    }
    await recomputeTab(tx, line.tabId);
  });
  refresh();
  revalidatePath("/staff/kitchen");
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
  const settled = await db.$transaction(async (tx) => {
    const fresh = await recomputeTab(tx, tab.id);
    const claimed = await tx.tab.updateMany({
      where: { id: tab.id, status: "open" },
      data: { status: "paid", paymentMethod: method, closedAt: new Date(), shiftId: tab.shiftId ?? shift?.id },
    });
    if (!claimed.count || !fresh) return null;
    await tx.payment.create({
      data: {
        source: "bar",
        refId: tab.id,
        amount: fresh.total,
        method,
        note: `${tab.table ? `${tab.table.label} tab` : "Counter tab"}${tab.member ? ` · ${tab.member.name}` : ""}`,
      },
    });
    return fresh.total;
  });
  if (settled === null) return;
  refresh();
  redirect(`/staff/bar?paid=${encodeURIComponent(`${tab.table?.label ?? "Counter"} paid ${inr(settled)} by ${method.toUpperCase()}`)}`);
}

async function openTab(tabId: number) {
  const tab = await db.tab.findUnique({ where: { id: tabId }, include: { table: true, items: true } });
  return tab && tab.status === "open" ? tab : null;
}

// Puts a different member or a walk-in guest on the tab. Prices are worked out again for the new person.
export async function changeTabPerson(_: TabState, formData: FormData): Promise<TabState> {
  await requireStaff(["owner", "bar"]);
  const tab = await openTab(Number(formData.get("tabId")));
  if (!tab) return { error: "This tab is already closed" };
  const who = String(formData.get("who"));

  if (who === "guest") {
    const guestName =
      String(formData.get("guestName") ?? "")
        .trim()
        .slice(0, 60) || "Guest";
    await db.$transaction(async (tx) => {
      await tx.tab.update({ where: { id: tab.id }, data: { memberId: null, guestName } });
      await recomputeTab(tx, tab.id);
    });
    refresh();
    return { ok: `Now on ${guestName === "Guest" ? "a walk-in guest" : guestName}, walk-in prices` };
  }

  const ref = String(formData.get("member") ?? "").trim();
  const code = ref.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  const digits = ref.replace(/\D/g, "");
  const member = code
    ? await db.member.findUnique({ where: { code } })
    : digits.length === 10
      ? await db.member.findUnique({ where: { phone: digits } })
      : null;
  if (!member) return { error: "No member found. Use their code or 10-digit phone" };
  if (member.id === tab.memberId) return { error: `${member.name} is already on this tab` };
  const other = await db.tab.findFirst({ where: { memberId: member.id, status: "open", id: { not: tab.id } }, include: { table: true } });
  if (other) return { error: `${member.name} already has an open tab at ${other.table?.label ?? "the counter"}` };
  await db.$transaction(async (tx) => {
    await tx.tab.update({ where: { id: tab.id }, data: { memberId: member.id, guestName: null } });
    await recomputeTab(tx, tab.id);
  });
  refresh();
  return { ok: `Now on ${member.name}, member prices applied` };
}

// Moves the whole tab to a free table, or to the counter.
export async function moveTab(_: TabState, formData: FormData): Promise<TabState> {
  await requireStaff(["owner", "bar"]);
  const tab = await openTab(Number(formData.get("tabId")));
  if (!tab) return { error: "This tab is already closed" };
  const to = String(formData.get("tableId") ?? "");
  const tableId = to === "counter" ? null : Number(to) || 0;
  if (tableId === 0) return { error: "Pick where to move it" };
  if (tableId === tab.tableId) return { error: "The tab is already there" };
  if (tableId) {
    const table = await db.barTable.findUnique({ where: { id: tableId } });
    if (!table) return { error: "Table not found" };
    const busy = await db.tab.findFirst({ where: { tableId, status: "open" } });
    if (busy) return { error: `${table.label} already has an open tab` };
  }
  await db.tab.update({ where: { id: tab.id }, data: { tableId } });
  refresh();
  redirect(`/staff/bar?tab=${tab.id}`);
}

// Clears the table without taking payment: the tab is voided and kept on record, nothing is charged.
export async function voidTab(_: TabState, formData: FormData): Promise<TabState> {
  const staff = await requireStaff(["owner", "bar"]);
  const tab = await openTab(Number(formData.get("tabId")));
  if (!tab) return { error: "This tab is already closed" };
  const served = tab.items.some((i) => i.status !== "new");
  if (served && staff.role !== "owner") return { error: "Food is already made or served. Ask the owner to clear this tab, or take payment." };
  const done = await db.tab.updateMany({ where: { id: tab.id, status: "open" }, data: { status: "void", closedAt: new Date(), paymentMethod: null } });
  if (!done.count) return { error: "This tab is already closed" };
  refresh();
  revalidatePath("/staff/kitchen");
  redirect(`/staff/bar?paid=${encodeURIComponent(`${tab.table?.label ?? "Counter"} cleared, nothing charged`)}`);
}
