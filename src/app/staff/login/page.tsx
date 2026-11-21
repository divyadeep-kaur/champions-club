import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Staff sign in · The Champions Club" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-3 text-forest">
          <span className="grid size-9 place-items-center rounded-full bg-forest text-cream">
            <Trophy className="size-[17px]" strokeWidth={1.8} />
          </span>
          <span className="font-serif text-[20px] font-medium">The Champions Club</span>
        </Link>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="font-serif text-[44px] font-semibold leading-[1] tracking-[-0.03em] text-forest">Staff sign in</h1>
          <p className="mt-3 text-[16px] text-muted">Front desk, bar and management.</p>
          <LoginForm next={next} />
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image src="/court.webp" alt="" fill unoptimized priority className="object-cover" sizes="50vw" />
      </div>
    </main>
  );
}
