import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { PageHeader } from "@/components/staff/ui";
import { NewMemberForm } from "./NewMemberForm";

export const dynamic = "force-dynamic";

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  await requireStaff(["owner"]);
  const { lead: leadId } = await searchParams;
  const lead = leadId ? await db.lead.findUnique({ where: { id: Number(leadId) || 0 } }) : null;
  const [plans, court, balls, drink] = await Promise.all([
    db.plan.findMany({ where: { active: true }, orderBy: { monthlyFee: "desc" } }),
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
      <PageHeader
        title={lead ? `Sign up ${lead.name}` : "New member"}
        description={
          lead
            ? `From their enquiry on ${lead.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}${lead.quoteAmount ? `. Quoted ${lead.plan} at ₹${lead.quoteAmount.toLocaleString("en-IN")}` : ""}. Their trial moves into their member history.`
            : "Sign up at the front desk. The first period's fee is recorded as paid."
        }
      />
      <NewMemberForm
        plans={plans}
        visit={visit}
        defaults={
          lead
            ? {
                leadId: String(lead.id),
                name: lead.name,
                phone: lead.phone,
                email: lead.email ?? "",
                planId: String(plans.find((p) => p.name === lead.plan)?.id ?? ""),
              }
            : undefined
        }
      />
    </div>
  );
}
