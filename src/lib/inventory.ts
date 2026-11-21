// Product codes look like ACC-003: a three-letter category prefix and a running number.
const PREFIX: Record<string, string> = { rackets: "RKT", balls: "BAL", shoes: "SHO", accessories: "ACC", apparel: "APP" };

export function skuPrefix(category: string) {
  const known = PREFIX[category.trim().toLowerCase()];
  if (known) return known;
  const letters = category.replace(/[^a-z]/gi, "").toUpperCase();
  return (letters + "XXX").slice(0, 3);
}

export function nextSku(category: string, existing: string[]) {
  const prefix = skuPrefix(category);
  const used = existing.filter((s) => s.startsWith(`${prefix}-`)).map((s) => Number(s.slice(prefix.length + 1)) || 0);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}
