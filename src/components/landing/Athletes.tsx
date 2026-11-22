import Image from "next/image";
import Link from "next/link";

const pattern = ["g.P.gPPgPgPB", "gPB.PgP..g.B", "PgP......gLP", "BBP......gCg", "..gPPPgCBPgP"];

const photos = [
  { src: "/images/junior-cricket.jpg", w: 1100, h: 733, pos: "object-[45%_30%]", alt: "Junior cricketer" },
  { src: "/images/doubles.jpg", w: 1300, h: 635, pos: "object-[22%_30%]", alt: "Tennis player at the net" },
  { src: "/images/cricket-drive.jpg", w: 1100, h: 733, pos: "object-[48%_40%]", alt: "Batter playing a drive" },
  { src: "/images/shop-balls.jpg", w: 1100, h: 1466, pos: "object-[50%_55%]", alt: "Tennis balls" },
  { src: "/images/doubles.jpg", w: 1300, h: 635, pos: "object-[72%_30%]", alt: "Doubles partner returning a shot" },
  { src: "/images/shop-rackets.jpg", w: 1100, h: 1650, pos: "object-[50%_45%]", alt: "Rackets on clay" },
  { src: "/images/contact-bg.jpg", w: 1800, h: 1199, pos: "object-[40%_60%]", alt: "Players on the cricket ground" },
  { src: "/images/cricket-net.jpg", w: 1100, h: 734, pos: "object-[50%_60%]", alt: "Cricket practice net" },
  { src: "/images/tennis-court.jpg", w: 1200, h: 1600, pos: "object-[50%_60%]", alt: "Floodlit tennis court" },
  { src: "/images/shop-shoes.jpg", w: 814, h: 754, pos: "object-center", alt: "Court shoe" },
];

const shapes = [
  "rounded-2xl",
  "rounded-full",
  "rounded-[50%_50%_50%_14px]",
  "rounded-[14px_50%_50%_50%]",
  "rounded-2xl",
  "rounded-[50%_50%_14px_50%]",
  "rounded-full",
  "rounded-[50%_14px_50%_50%]",
];

const fill: Record<string, string> = { g: "bg-[#ebe6dc]", B: "bg-forest", L: "bg-ball", C: "bg-clay" };

export function Athletes({ members }: { members: number }) {
  let photo = 0;
  return (
    <section aria-labelledby="athletes-title" className="relative overflow-hidden border-t border-line bg-paper">
      <svg
        aria-hidden="true"
        className="absolute left-[6%] top-6 hidden text-[#c9c1b1] sm:block"
        width="70"
        height="80"
        viewBox="0 0 70 80"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M6 4c4 26 18 48 52 62" />
        <path d="M44 66l15 1-6-14" />
      </svg>
      <svg
        aria-hidden="true"
        className="absolute bottom-6 right-[8%] hidden text-[#c9c1b1] sm:block"
        width="70"
        height="120"
        viewBox="0 0 70 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M14 4c22 20 30 44 10 58-12 8-22-4-10-12 16-10 28 14 24 56" />
        <path d="M27 103l11 13 9-15" />
      </svg>

      <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-8 sm:py-24">
        <div className="relative">
          <div className="grid grid-cols-6 gap-3 sm:grid-cols-12 sm:gap-6" aria-hidden="true">
            {pattern.flatMap((row, r) =>
              row.split("").map((ch, c) => {
                const key = `${r}-${c}`;
                const shape = shapes[(r * 5 + c * 3) % shapes.length];
                const cls = `cc-cal-cell aspect-square overflow-hidden ${shape} ${c >= 6 ? "hidden sm:block" : ""}`;
                const style = { animationDelay: `${(r + c) * 35}ms` };
                if (ch === "." || ch === " ") return <div key={key} className={c >= 6 ? "hidden sm:block" : ""} />;
                if (ch === "P") {
                  const p = photos[photo++ % photos.length];
                  return (
                    <div key={key} className={`${cls} bg-[#ebe6dc]`} style={style}>
                      <Image src={p.src} alt="" width={p.w} height={p.h} unoptimized className={`h-full w-full object-cover ${p.pos}`} />
                    </div>
                  );
                }
                return <div key={key} className={`${cls} ${fill[ch]}`} style={style} />;
              }),
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="pointer-events-auto relative w-[min(88%,640px)] rounded-[40px] bg-paper/95 px-6 py-8 text-center shadow-[0_0_80px_50px_rgba(251,248,242,0.95)] sm:px-10 sm:py-10">
              <span className="absolute -top-1 right-[14%] hidden items-start gap-1 font-hand text-[24px] font-bold text-clay sm:flex" aria-hidden="true">
                <svg width="34" height="30" viewBox="0 0 34 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="mt-3">
                  <path d="M32 4C18 2 8 8 6 24" />
                  <path d="M2 18l4 8 7-5" />
                </svg>
                &amp; growing
              </span>
              <h2 id="athletes-title" className="font-hand text-[clamp(44px,7vw,82px)] font-bold leading-[0.95] text-forest-deep">
                Join {members >= 10 ? `${Math.floor(members / 10) * 10}+` : members} emerging athletes
              </h2>
              <p className="mt-3 text-[clamp(17px,2vw,22px)] text-ink">who train, play and grow at The Champions Club</p>
              <Link href="/trial" className="mt-6 inline-block rounded-full bg-forest px-7 py-3.5 text-[16px] font-bold text-cream hover:bg-forest-deep">
                Book a free trial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
