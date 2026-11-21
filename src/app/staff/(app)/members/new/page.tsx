import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader } from "@/components/staff/ui";
import { NewMemberForm } from "./NewMemberForm";

export const dynamic = "force-dynamic";

export default async function NewMemberPage() {
  await requireStaff(["owner", "desk"]);
  const [plans, court, balls, drink] = await Promise.all([
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.court.findFirst({ where: { sport: "tennis" }, orderBy: { walkInRate: "asc" } }),
    db.product.findFirst({ where: { category: "balls" }, orderBy: { price: "asc" } }),
    db.menuItem.findFirst({ where: { category: "drinks", active: true }, orderBy: { price: "desc" }, skip: 1 }),
  ]);
  const visit = {
    walkInRate: court?.walkInRate ?? 0,
    shopItem: balls?.price ?? 0,
    barItem: drink?.price ?? 0,
    labels: { court: "1 hour of tennis", shop: balls?.name ?? "Shop item", bar: drink?.name ?? "A drink" },
  };

  return (
    <div className="max-w-[860px] space-y-6">
      <Link href="/staff/members" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest">
        <ArrowLeft className="size-4" /> All members
      </Link>
      <PageHeader title="New member" description="Sign up at the front desk. The first period's fee is recorded as paid." />
      <NewMemberForm plans={plans} visit={visit} />
    </div>
  );
}
