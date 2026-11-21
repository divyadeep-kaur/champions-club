import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { btnPrimary } from "@/components/staff/ui";
import { MembersTabs } from "./MembersTabs";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff(["owner", "desk"]);
  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Member Management</h1>
          <p className="mt-1.5 text-muted">Members, their plans, renewals and expiry.</p>
        </div>
        {session.role === "owner" ? (
          <Link href="/staff/members/new" className={btnPrimary}>
            Sign up a member
          </Link>
        ) : (
          <span className="border border-line bg-paper px-3 py-2 text-[14px] text-muted">View only · the owner changes plans and renewals</span>
        )}
      </div>
      <MembersTabs />
      {children}
    </div>
  );
}
