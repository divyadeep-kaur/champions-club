import { requireMember } from "@/lib/memberSession";
import { MemberSidebar } from "./MemberSidebar";
import { MemberTabs } from "./MemberTabs";

export const metadata = { title: "My club · The Champions Club" };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <div className="min-h-[100svh] bg-cream lg:flex">
      <MemberSidebar name={member.name} plan={member.plan.name} code={member.code} />
      <div className="mx-auto w-full min-w-0 max-w-[560px] pb-[72px] lg:max-w-[1200px] lg:flex-1 lg:px-8 lg:pb-12">{children}</div>
      <MemberTabs />
    </div>
  );
}
