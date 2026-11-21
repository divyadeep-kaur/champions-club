import { db } from "./db";
import { DEFAULT_SHIPPING, FREE_OVER_KEY, SHIPPING_FEE_KEY, type ShippingRule } from "./delivery";

export async function getShippingRule(): Promise<ShippingRule> {
  const rows = await db.clubSetting.findMany({ where: { key: { in: [SHIPPING_FEE_KEY, FREE_OVER_KEY] } } });
  const num = (key: string, fallback: number) => {
    const v = Number(rows.find((r) => r.key === key)?.value);
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  return { fee: num(SHIPPING_FEE_KEY, DEFAULT_SHIPPING.fee), freeOver: num(FREE_OVER_KEY, DEFAULT_SHIPPING.freeOver) };
}
