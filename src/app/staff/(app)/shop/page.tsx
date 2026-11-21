import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { requireStaff } from "@/lib/session";
import { Badge, ComingNext, PageHeader, Table, Td } from "@/components/staff/ui";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  await requireStaff(["owner", "desk"]);
  const products = await db.product.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const low = products.filter((p) => p.stock <= p.lowStockAt).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Shop" description={`${products.length} products · ${low} low on stock`} />
      <Table head={["SKU", "Product", "Category", "Price", "Stock"]} empty={products.length === 0}>
        {products.map((p) => (
          <tr key={p.id}>
            <Td className="font-mono text-[13px] text-muted">{p.sku}</Td>
            <Td className="font-medium">{p.name}</Td>
            <Td className="capitalize">{p.category}</Td>
            <Td className="tabular-nums">{inr(p.price)}</Td>
            <Td>
              <span className="flex items-center gap-2 tabular-nums">
                {p.stock}
                {p.stock <= p.lowStockAt && <Badge tone="clay">Low</Badge>}
              </span>
            </Td>
          </tr>
        ))}
      </Table>
      <ComingNext items={["Counter sale with automatic member discount", "Online orders for pickup or delivery from the same stock", "Restock and low-stock alerts"]} />
    </div>
  );
}
