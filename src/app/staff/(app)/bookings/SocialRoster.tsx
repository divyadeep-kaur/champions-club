import { inr } from "@/lib/constants";
import { Badge } from "@/components/staff/ui";
import type { MemberOption } from "./NewBookingForm";
import { JoinSocialForm } from "./JoinSocialForm";
import { answerOffer, leaveSocial } from "./social";
import { CollectForm } from "./CollectForm";

type Player = { id: number; name: string; status: string; price: number; paidAt: Date | null; member: { code: string } | null };

export function SocialRoster({
  booking,
  members,
}: {
  booking: { id: number; capacity: number; status: string; end: Date; players: Player[] };
  members: MemberOption[];
}) {
  const playing = booking.players.filter((p) => p.status === "confirmed");
  const offered = booking.players.filter((p) => p.status === "offered");
  const waitlist = booking.players.filter((p) => p.status === "waitlist");
  const open = booking.status === "booked" && booking.end > new Date();
  const fill = Math.min(100, ((playing.length + offered.length) / booking.capacity) * 100);

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-[22px] font-semibold text-forest">
            {playing.length} of {booking.capacity} players
          </p>
          {waitlist.length > 0 && <span className="text-[13.5px] text-muted">{waitlist.length} waiting</span>}
        </div>
        <div
          className="mt-2 h-1.5 bg-cream"
          role="progressbar"
          aria-valuenow={playing.length}
          aria-valuemin={0}
          aria-valuemax={booking.capacity}
          aria-label="Places filled"
        >
          <div className="h-full bg-ball" style={{ width: `${fill}%` }} />
        </div>
      </div>

      <ul className="divide-y divide-line border border-line">
        {playing.length === 0 && offered.length === 0 && <li className="px-3 py-3 text-[14px] text-muted">No one has joined yet.</li>}
        {[...playing, ...offered].map((p, i) => (
          <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[14.5px]">
            <span className="min-w-0">
              <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
              {p.name}
              {p.member && <span className="ml-1.5 font-mono text-[12px] text-muted">{p.member.code}</span>}
              {p.status === "offered" && (
                <span className="ml-2">
                  <Badge tone="gold">Place offered</Badge>
                </span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {p.status === "offered" ? (
                <>
                  <form action={answerOffer}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <input type="hidden" name="answer" value="accept" />
                    <button className="bg-forest px-2.5 py-1 text-[12.5px] font-semibold text-cream">Accept{p.price ? ` ${inr(p.price)}` : ""}</button>
                  </form>
                  <form action={answerOffer}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <input type="hidden" name="answer" value="decline" />
                    <button className="px-2 py-1 text-[12.5px] font-semibold text-muted hover:text-clay">Decline</button>
                  </form>
                </>
              ) : (
                <>
                  <span className="text-[13px] tabular-nums text-muted">
                    {p.price ? inr(p.price) : "Free"}
                    {p.price > 0 && (p.paidAt ? " · paid" : "")}
                  </span>
                  {p.price > 0 && !p.paidAt && booking.status === "booked" && <CollectForm playerId={p.id} amount={p.price} compact />}
                  {open && (
                    <form action={leaveSocial}>
                      <input type="hidden" name="playerId" value={p.id} />
                      <button aria-label={`Remove ${p.name}`} className="px-2 py-1 text-[12.5px] font-semibold text-muted hover:text-clay">
                        Drop out
                      </button>
                    </form>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {waitlist.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Waitlist</p>
          <ol className="mt-1.5 space-y-1 text-[14.5px]">
            {waitlist.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                  {p.name}
                </span>
                {open && (
                  <form action={leaveSocial}>
                    <input type="hidden" name="playerId" value={p.id} />
                    <button className="text-[12.5px] font-semibold text-muted hover:text-clay">Remove</button>
                  </form>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {open && <JoinSocialForm bookingId={booking.id} members={members} full={playing.length + offered.length >= booking.capacity} />}
      <p className="text-[12.5px] text-muted">
        Each player pays a quarter of their court rate. When someone drops out, the first person waiting is offered the place.
      </p>
    </div>
  );
}
