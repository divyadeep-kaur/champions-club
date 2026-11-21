import { requireMember } from "@/lib/memberSession";
import { MemberTabs } from "./MemberTabs";
import { MemberTopBar } from "./MemberTopBar";

export const metadata = { title: "My club · The Champions Club" };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <div className="min-h-[100svh] bg-cream">
      <MemberTopBar name={member.name} plan={member.plan.name} code={member.code} />
      <div className="mx-auto max-w-[560px] pb-[72px] lg:max-w-[1200px] lg:px-8 lg:pb-12">{children}</div>
      <MemberTabs />
    </div>
  );
}
