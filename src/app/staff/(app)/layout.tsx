import { StaffNav } from "@/components/staff/StaffNav";
import { db } from "@/lib/db";
import { navFor } from "@/lib/nav";
import { requireStaff } from "@/lib/session";
import { AWAITING_APPROVAL } from "@/lib/constants";
import { logout } from "../login/actions";

export const metadata = { title: "Staff · The Champions Club" };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();
  const nav = navFor(session.role);
  const newLeads = nav.some((i) => i.href === "/staff/leads")
    ? await db.lead.count({
        where: {
          OR: [
            { status: "new", interest: { not: "trial" } },
            { interest: "trial", status: { in: ["new", "trial", "contacted", "quoted"] }, activities: { none: { kind: { in: ["approved", "declined"] } } } },
          ],
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
        },
      })
    : 0;
  const openQueries = session.role === "owner" ? await db.staffQuery.count({ where: { status: "open" } }) : 0;
  const signups = nav.some((i) => i.href === "/staff/members") ? await db.member.count({ where: { suspendReason: AWAITING_APPROVAL } }) : 0;
  const items = nav.map(({ href, label, icon }) => ({
    href,
    label,
    icon,
    badge: href === "/staff/leads" ? newLeads : href === "/staff/queries" ? openQueries : href === "/staff/members" ? signups : undefined,
  }));

  return (
    <div className="min-h-screen bg-cream lg:flex print:bg-white">
      <StaffNav items={items} name={session.name} role={session.role} logout={logout} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-9 print:p-0">{children}</main>
    </div>
  );
}
