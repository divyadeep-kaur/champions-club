import Image from "next/image";
import Link from "next/link";

type Coach = { name: string; role: string; quote: string; img: string; w: number; h: number; pos: string };

const small: Coach[] = [
  { name: "Gurpreet Sandhu", role: "Head tennis coach", quote: "Footwork first. The power comes later.", img: "/images/shop-rackets.jpg", w: 1100, h: 1650, pos: "object-[50%_45%]" },
  { name: "Neha Bhatia", role: "Junior programme lead", quote: "Every junior gets a plan, not just a net session.", img: "/images/junior-cricket.jpg", w: 1100, h: 733, pos: "object-[45%_30%]" },
  { name: "Rohit Verma", role: "Friday social host", quote: "Friday nights are for meeting people, not keeping score.", img: "/images/doubles.jpg", w: 1300, h: 635, pos: "object-[30%_35%]" },
];

const big: Coach[] = [
  { name: "Harjot Gill", role: "Head cricket coach", quote: "We film every net session so you can see what we see.", img: "/images/cricket-drive.jpg", w: 1100, h: 733, pos: "object-[48%_40%]" },
  { name: "Simran Kaur", role: "Trial session coach", quote: "Most beginners leave their first hour asking for a second.", img: "/images/tennis-court.jpg", w: 1200, h: 1600, pos: "object-[50%_60%]" },
];

const fade = "[mask-image:linear-gradient(to_right,transparent_0%,black_45%)]";

export function Coaches() {
  return (
    <section id="coaches" aria-labelledby="coaches-title" className="scroll-mt-20 bg-forest-deep text-cream">
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="coaches-title" className="max-w-[760px] text-[clamp(28px,3.2vw,40px)] font-extrabold leading-[1.15] tracking-[-0.02em]">
            Learn from coaches who are <span className="font-serif font-medium italic text-ball">on court every day</span>
          </h2>
          <Link href="/trial" className="rounded-full bg-ball px-5 py-3 text-[15px] font-bold text-forest-deep hover:bg-[#b6dd45]">
            Book a session with a coach
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {small.map((c) => (
            <figure key={c.name} className="relative flex min-h-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#1b4a36]">
              <div className={`absolute inset-y-0 right-0 w-[48%] ${fade}`} aria-hidden="true">
                <Image src={c.img} alt="" width={c.w} height={c.h} unoptimized className={`h-full w-full object-cover ${c.pos}`} />
              </div>
              <div className="relative flex w-[64%] flex-col justify-between gap-5 p-5 sm:p-6">
                <blockquote className="text-[16px] leading-snug sm:text-[17px]">“{c.quote}”</blockquote>
                <figcaption className="text-[13.5px]">
                  <strong className="block">{c.name}</strong>
                  <span className="text-cream/70">{c.role}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {big.map((c) => (
            <figure key={c.name} className="relative flex min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[#1b4a36] sm:min-h-[340px]">
              <div className={`absolute inset-y-0 right-0 w-[55%] ${fade}`} aria-hidden="true">
                <Image src={c.img} alt="" width={c.w} height={c.h} unoptimized className={`h-full w-full object-cover ${c.pos}`} />
              </div>
              <div className="relative flex w-[72%] flex-col justify-between gap-8 p-6 sm:w-[62%] sm:p-8">
                <blockquote className="text-[clamp(24px,2.6vw,34px)] font-bold leading-[1.15] tracking-[-0.01em]">“{c.quote}”</blockquote>
                <figcaption className="flex items-center gap-4">
                  <Link href="/#club-video" aria-label={`Watch the club film with ${c.name}`} className="grid size-12 shrink-0 place-items-center rounded-full bg-cream text-forest-deep transition-transform hover:scale-105">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </Link>
                  <span>
                    <strong className="block text-[20px] font-bold leading-tight sm:text-[22px]">{c.name}</strong>
                    <span className="text-[14px] text-cream/70">{c.role}</span>
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
        <p className="mt-5 text-[13px] text-cream/50">Sample coach profiles for the demo</p>
      </div>
    </section>
  );
}
