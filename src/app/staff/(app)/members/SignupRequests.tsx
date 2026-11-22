import type { Member } from "@prisma/client";
import { UserPlus } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/constants";
import { btnOutline, btnPrimary } from "@/components/staff/ui";
import { decideSignup } from "./actions";

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export function SignupRequests({ signups }: { signups: Member[] }) {
  return (
    <section className="grid gap-3 border border-ball/60 bg-[#f4f8e6] p-4" aria-labelledby="signups-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="signups-title" className="flex items-center gap-2 text-[17px] font-bold text-forest">
          <UserPlus className="size-5" /> New sign-ups waiting for approval ({signups.length})
        </h2>
        <p className="text-[13px] text-muted">Approving starts a free {TRIAL_DAYS}-day trial. No payment is taken until they buy a plan.</p>
      </div>
      <ul className="grid gap-2">
        {signups.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-paper p-3">
            <div className="grid min-w-0 gap-0.5">
              <p className="font-semibold text-ink">
                {m.name} <span className="ml-1 font-mono text-[13.5px] text-forest">{m.code}</span>
              </p>
              <p className="text-[13.5px] text-muted">
                {m.phone}
                {m.email ? ` · ${m.email}` : ""} · signed up {when(m.createdAt)}
              </p>
            </div>
            <form action={decideSignup} className="flex gap-2">
              <input type="hidden" name="memberId" value={m.id} />
              <button name="decision" value="approve" className={btnPrimary}>
                Approve
              </button>
              <button name="decision" value="decline" className={btnOutline}>
                Decline
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
