import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff sign in · The Champions Club" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const admin = as === "admin";

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3 text-forest">
          <Image src="/brand/logo-mark.png" alt="" width={40} height={40} unoptimized />
          <span className="text-[19px] font-extrabold italic text-[#0f2147]">
            CHAMPI<span className="text-[#1f66d8]">O</span>NS CLUB
          </span>
        </Link>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="font-serif text-[44px] font-semibold leading-[1] tracking-[-0.03em] text-forest">{admin ? "Admin sign in" : "Staff sign in"}</h1>
          <p className="mt-3 text-[16px] text-muted">{admin ? "For the club owner: revenue, reports and every module." : "Front desk and bar staff."}</p>
          <LoginForm next={next} admin={admin} />
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-[14px]">
            <Link href={admin ? "/staff/login" : "/staff/login?as=admin"} className="font-semibold text-forest underline underline-offset-4">
              {admin ? "Staff sign in" : "Admin sign in"}
            </Link>
            <Link href="/me/login" className="font-semibold text-forest underline underline-offset-4">
              Member sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image src="/court.webp" alt="" fill unoptimized priority className="object-cover" sizes="50vw" />
      </div>
    </main>
  );
}
