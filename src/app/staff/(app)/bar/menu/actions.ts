"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { photoError } from "@/lib/membership";
import { menuPhoto } from "@/lib/menuPhotos";
import { requireStaff } from "@/lib/session";

export type MenuState = { error?: string; ok?: string; at?: number; fields?: Record<string, string> };

const refresh = () => {
  revalidatePath("/staff/bar", "layout");
  revalidatePath("/me/cafe");
  revalidatePath("/");
};

async function readPhoto(formData: FormData): Promise<{ photo?: string; error?: string }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return {};
  const problem = photoError(file);
  if (problem) return { error: problem };
  return { photo: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}` };
}

const itemSchema = z.object({
  name: z.string().trim().min(2, "Enter the item name").max(60),
  category: z.string().trim().max(30).optional().default(""),
  newCategory: z.string().trim().max(30).optional().default(""),
  price: z.coerce.number({ message: "Enter the price" }).int("Whole rupees only").min(1, "Enter the price").max(100_000),
});

// Adds a new café or bar item. It shows on the counter and in the member app straight away.
export async function addMenuItem(_: MenuState, formData: FormData): Promise<MenuState> {
  await requireStaff(["owner", "bar"]);
  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = itemSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const category = (parsed.data.newCategory || parsed.data.category).toLowerCase();
  if (category.length < 2) return { error: "Pick a category or type a new one", fields };
  const existing = await db.menuItem.findMany({ select: { name: true } });
  if (existing.some((m) => m.name.toLowerCase() === parsed.data.name.toLowerCase())) return { error: "An item with that name is already on the menu", fields };
  const { photo, error } = await readPhoto(formData);
  if (error) return { error, fields };
  try {
    await db.menuItem.create({ data: { name: parsed.data.name, category, price: parsed.data.price, photo: photo ?? null } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "An item with that name is already on the menu", fields };
    throw e;
  }
  refresh();
  return { ok: `${parsed.data.name} added to the menu`, at: Date.now() };
}

const updateSchema = z.object({
  id: z.coerce.number().int().positive(),
  price: z.coerce.number({ message: "Enter the price" }).int("Whole rupees only").min(1, "Enter the price").max(100_000),
  active: z.enum(["yes", "no"]),
});

// Price changes apply to new orders; items already on a tab keep the price they were added at.
export async function updateMenuItem(_: MenuState, formData: FormData): Promise<MenuState> {
  await requireStaff(["owner", "bar"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { photo, error } = await readPhoto(formData);
  if (error) return { error };
  await db.menuItem.update({
    where: { id: parsed.data.id },
    data: { price: parsed.data.price, active: parsed.data.active === "yes", ...(photo ? { photo } : {}) },
  });
  refresh();
  return { ok: "Saved", at: Date.now() };
}

const editSchema = itemSchema.extend({ id: z.coerce.number().int().positive(), active: z.enum(["yes", "no"]) });

// Edits everything about an item. Items already on a tab or bill keep the price they were added at.
export async function editMenuItem(_: MenuState, formData: FormData): Promise<MenuState> {
  await requireStaff(["owner", "bar"]);
  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = editSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;
  const category = (f.newCategory || f.category).toLowerCase();
  if (category.length < 2) return { error: "Pick a category or type a new one", fields };
  const item = await db.menuItem.findUnique({ where: { id: f.id } });
  if (!item) return { error: "Item not found", fields };
  const others = await db.menuItem.findMany({ where: { id: { not: item.id } }, select: { name: true } });
  if (others.some((m) => m.name.toLowerCase() === f.name.toLowerCase())) return { error: "Another item already has that name", fields };
  const { photo, error } = await readPhoto(formData);
  if (error) return { error, fields };
  // Built-in photos are matched by name, so keep the old one when an original item is renamed.
  const kept = !photo && !item.photo && f.name !== item.name ? menuPhoto(item) : null;
  try {
    await db.menuItem.update({
      where: { id: item.id },
      data: { name: f.name, category, price: f.price, active: f.active === "yes", ...(photo || kept ? { photo: photo ?? kept } : {}) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Another item already has that name", fields };
    throw e;
  }
  refresh();
  return { ok: `${f.name} saved`, at: Date.now() };
}
