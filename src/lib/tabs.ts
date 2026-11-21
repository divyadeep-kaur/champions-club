import type { Prisma } from "@prisma/client";
import { cartTotals } from "./checkout";
import { benefitPlan } from "./membership";

type Tx = Prisma.TransactionClient;

export async function recomputeTab(tx: Tx, tabId: number) {
  const tab = await tx.tab.findUnique({ where: { id: tabId }, include: { items: true, member: { include: { plan: true } } } });
  if (!tab) return null;
  const plan = benefitPlan(tab.member);
  const t = cartTotals(tab.items, plan, "bar");
  return tx.tab.update({ where: { id: tabId }, data: { subtotal: t.subtotal, discount: t.discount, total: t.total } });
}
