import Image from "next/image";
import Link from "next/link";
import { inr } from "@/lib/constants";
import type { CourtRow } from "@/lib/publicData";
import { ContactForm } from "./ContactForm";
import { TodaysCourts } from "./TodaysCourts";

const serif = "font-serif italic font-medium";
const h2 = "text-center text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest";
const eyebrow = "text-[13px] font-extrabold uppercase tracking-[0.12em] text-clay";
const featureH = "mt-3 text-[38px] font-extrabold leading-[1.1] tracking-[-0.03em] text-forest sm:text-[44px]";
const glass = "backdrop-blur-[14px] border border-white/25";

function Ticks({ items, color = "text-[#4d7a12]" }: { items: string[]; color?: string }) {
  return (
    <ul className="mt-[22px] grid gap-3 text-[17px]">
      {items.map((i) => (
        <li key={i} className="flex gap-2.5">
          <span className={`font-extrabold ${color}`} aria-hidden="true">
            ✓
          </span>
          {i}
        </li>
      ))}
    </ul>
  );
}

export function HomeHero({ courts }: { courts: { rows: CourtRow[]; isToday: boolean } }) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-14 text-center sm:px-8 sm:pt-20">
      <p className="inline-block rounded-full border border-forest px-3.5 py-1.5 text-[13.5px] font-bold text-forest">Introducing The Champions Club</p>
      <h1 className="mx-auto mt-6 max-w-[980px] text-[clamp(44px,7vw,88px)] font-extrabold leading-none tracking-[-0.035em] text-forest">
        Your sports club, <span className={serif}>all in one place</span>
      </h1>
      <p className="mx-auto mt-6 max-w-[640px] text-[18px] leading-[1.55] text-[#3c4a43] sm:text-[20px]">
        Courts, memberships, a pro shop and a café, run from one desk. Find a free slot, pick a plan and come play.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <Link href="/trial" className="rounded-full bg-forest px-7 py-4 text-[17px] font-bold text-cream hover:bg-forest-deep">
          Book a free trial
        </Link>
        <Link href="/courts" className="px-5 py-4 text-[17px] font-bold text-forest">
          See free slots →
        </Link>
      </div>
      <div className="relative mt-14">
        <Image
          src="/images/hero-serve.webp"
          alt="A player serving on a clay tennis court"
          width={986}
          height={803}
          priority
          unoptimized
          className="block h-[420px] w-full rounded-t-[20px] object-cover object-[50%_0%] sm:h-[560px]"
        />
        <div className="relative mx-auto -mt-24 w-[min(360px,92%)] sm:absolute sm:bottom-8 sm:right-8 sm:mt-0">
          <TodaysCourts rows={courts.rows} isToday={courts.isToday} />
        </div>
      </div>
    </section>
  );
}

export function PerksStrip({ perks }: { perks: string[] }) {
  return (
    <section aria-label="Member benefits" className="overflow-hidden bg-forest text-cream">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-10 gap-y-3.5 px-4 py-7 sm:px-8">
        <span className="text-[15px] font-bold text-ball">Why players join</span>
        {perks.map((p) => (
          <span key={p} className="text-[15.5px] font-semibold opacity-90">
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

export function FeatureQuote() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-20 sm:px-8 sm:py-24">
      <div className="grid overflow-hidden rounded-[20px] border border-line bg-paper md:grid-cols-2">
        <Image
          src="/images/cricket-drive.jpg"
          alt="Batter playing a drive on a red-earth pitch"
          width={1100}
          height={733}
          unoptimized
          className="block h-full min-h-[300px] w-full object-cover object-[48%_40%] sm:min-h-[360px]"
        />
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
          <svg width="36" height="28" viewBox="0 0 36 28" fill="#c4572f" aria-hidden="true">
            <path d="M0 28V16C0 6 5 1 14 0v6c-4 1-6 4-6 8h6v14H0zm22 0V16c0-10 5-15 14-16v6c-4 1-6 4-6 8h6v14H22z" />
          </svg>
          <p className="font-serif text-[26px] leading-[1.3] text-forest sm:text-[30px]">
            I book my net on the way to work, pay at the desk, and my Gold discount is already on the bill at the café.
          </p>
          <div className="text-[15px]">
            <strong>Arjun M.</strong>
            <br />
            <span className="text-muted">Gold member · sample review</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const sports = [
  {
    name: "Tennis",
    img: "/images/tennis-court.jpg",
    w: 1200,
    h: 1600,
    pos: "object-[50%_62%]",
    alt: "Hard tennis court with umpire chair under floodlights",
    href: "/courts",
  },
  {
    name: "Cricket",
    img: "/images/cricket-net.jpg",
    w: 1100,
    h: 734,
    pos: "object-[50%_60%]",
    alt: "Turf cricket practice net with stumps",
    href: "/courts?sport=cricket",
  },
  { name: "Social play", img: "/images/doubles.jpg", w: 1300, h: 635, pos: "object-[35%_40%]", alt: "Friends playing a doubles rally", href: "/#faq" },
  {
    name: "Juniors",
    img: "/images/junior-cricket.jpg",
    w: 1100,
    h: 733,
    pos: "object-[45%_35%]",
    alt: "Junior cricketer playing a big shot",
    href: "/#memberships",
  },
];

export function Sports({ text }: { text: Record<string, string> }) {
  return (
    <section id="sports" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pb-20 sm:px-8 sm:pb-24">
      <h2 className={h2}>For every player</h2>
      <p className="mx-auto mt-3.5 max-w-[560px] text-center text-[18px] text-muted">
        Whether you play to win or play for fun, there’s a court and a session for you.
      </p>
      <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
        {sports.map((s) => (
          <Link
            key={s.name}
            href={s.href}
            className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper text-ink transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(11,42,29,0.4)]"
          >
            <div className="relative h-[240px] overflow-hidden">
              <Image src={s.img} alt={s.alt} width={s.w} height={s.h} unoptimized className={`block h-full w-full object-cover ${s.pos}`} />
              <span
                className={`absolute bottom-3.5 left-3.5 rounded-xl bg-forest-deep/35 px-4 py-2 text-[22px] font-extrabold text-white ${glass} border-white/35`}
              >
                {s.name}
              </span>
            </div>
            <div className="grid gap-2.5 p-[18px]">
              <span className="text-[15.5px] leading-normal text-[#3c4a43]">{text[s.name]}</span>
              <span className="font-bold text-forest">Learn more →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function OneClub() {
  const panels = [
    {
      img: "/images/tennis-court.jpg",
      pos: "object-[50%_55%]",
      bg: "bg-forest-deep/55",
      tag: "Play",
      tagColor: "text-ball",
      title: "Courts, nets and social play",
      text: "Six courts and nets, 1-hour sessions every 30 minutes, member rates and Friday social nights.",
      chips: ["Bookings", "Free slots", "Social play", "Coaching"],
    },
    {
      img: "/images/doubles.jpg",
      pos: "object-[40%_35%]",
      bg: "bg-[rgba(122,47,20,0.55)]",
      tag: "Club life",
      tagColor: "text-[#ffd9c7]",
      title: "Memberships, shop and café",
      text: "One membership that follows you everywhere: your discount is applied at the shop counter and the bar.",
      chips: ["Memberships", "Pro shop", "Online orders", "Café & bar"],
    },
  ];
  return (
    <section className="border-y border-line bg-paper">
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-8 sm:py-24">
        <h2 className={h2}>
          One club, <span className={serif}>connect it all</span>
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {panels.map((p) => (
            <div key={p.title} className="relative flex min-h-[420px] items-end overflow-hidden rounded-[20px] p-5">
              <Image src={p.img} alt="" aria-hidden="true" fill unoptimized sizes="(min-width: 1024px) 50vw, 100vw" className={`object-cover ${p.pos}`} />
              <div className={`relative grid gap-4 rounded-2xl p-7 text-white ${p.bg} ${glass}`}>
                <span className={`text-[13px] font-extrabold uppercase tracking-[0.12em] ${p.tagColor}`}>{p.tag}</span>
                <h3 className="text-[28px] font-extrabold sm:text-[32px]">{p.title}</h3>
                <p className="text-[17px] leading-relaxed opacity-90">{p.text}</p>
                <div className="flex flex-wrap gap-2">
                  {p.chips.map((c) => (
                    <span key={c} className="rounded-full border border-cream/40 px-3 py-1.5 text-[14px]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Plan = { id: number; name: string; monthlyFee: number; courtRate: number; shopDiscount: number; barDiscount: number };
type Product = { sku: string; name: string; category: string; price: number; stock: number; lowStockAt: number };
type WeekRow = { day: string; am: string; pm: string; eve: string };

const productImg: Record<string, { img: string; w: number; h: number; tag: string; white?: boolean; pos: string }> = {
  "RKT-001": { img: "/images/shop-rackets.jpg", w: 1100, h: 1650, tag: "Rackets", pos: "object-[50%_45%]" },
  "BAL-001": { img: "/images/shop-balls.jpg", w: 1100, h: 1466, tag: "Balls", pos: "object-[50%_55%]" },
  "SHO-002": { img: "/images/shop-shoes.jpg", w: 814, h: 754, tag: "Shoes", white: true, pos: "object-contain" },
  "APP-001": { img: "/images/shop-polo.jpg", w: 624, h: 834, tag: "Apparel", white: true, pos: "object-[50%_20%]" },
};

export function Features({
  week,
  plans,
  products,
  cafe,
}: {
  week: WeekRow[];
  plans: Plan[];
  products: Product[];
  cafe: { lines: { name: string; price: number }[]; plan: string; discountPct: number; discount: number; total: number };
}) {
  const tags: Record<string, string> = { Junior: "Under 18", Silver: "Most popular", Gold: "Unlimited" };
  return (
    <section className="mx-auto grid max-w-[1280px] gap-24 px-4 py-20 sm:px-8 sm:py-24 lg:gap-28">
      <div id="play" className="grid scroll-mt-20 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className={eyebrow}>Courts</span>
          <h2 className={featureH}>Find a court in seconds</h2>
          <Ticks
            items={[
              "Live free slots for the whole week",
              "1-hour sessions starting every 30 minutes",
              "Members pay member rates, walk-ins welcome",
              "Friday evening social play on a shared court",
            ]}
          />
          <Link href="/courts" className="mt-6 inline-block font-bold text-forest">
            See all courts this week →
          </Link>
        </div>
        <div className="rounded-[20px] border border-line bg-paper p-6 shadow-[0_20px_50px_rgba(11,42,29,0.08)]">
          <div className="mb-3.5 flex items-center justify-between">
            <strong className="text-[17px] text-forest">Free slots this week · Tennis</strong>
            <span className="text-[13px] text-muted">Updated live</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-[14.5px]">
              <thead>
                <tr className="text-left text-muted">
                  {["Day", "Morning", "Afternoon", "Evening"].map((h) => (
                    <th key={h} scope="col" className="px-1.5 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.map((d) => (
                  <tr key={d.day} className="border-t border-line">
                    <td className="px-1.5 py-2.5 font-bold">{d.day}</td>
                    {[d.am, d.pm, d.eve].map((v, i) => (
                      <td
                        key={i}
                        className={`px-1.5 py-2.5 tabular-nums ${v === "Full" ? "text-muted" : v === "Social play" ? "font-semibold text-clay" : ""}`}
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="memberships" className="grid scroll-mt-20 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 grid gap-3.5 lg:order-1">
          {[...plans]
            .sort((a, b) => a.monthlyFee - b.monthlyFee)
            .map((p) => {
              const dark = p.name === "Gold";
              return (
                <Link
                  key={p.id}
                  href={`/trial?${new URLSearchParams({ interest: "membership", plan: p.name })}`}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl border border-line p-[22px] transition-transform hover:-translate-y-0.5 ${dark ? "bg-forest text-cream" : "bg-paper text-forest"}`}
                >
                  <div>
                    <span className="text-[22px] font-extrabold">{p.name}</span>{" "}
                    <span className="text-[13px] font-bold opacity-85">· {tags[p.name] ?? ""}</span>
                  </div>
                  <div className="text-[26px] font-extrabold tabular-nums">
                    {inr(p.monthlyFee)}
                    <span className="text-[14px] font-medium"> /mo</span>
                  </div>
                  <div className="col-span-2 text-[14.5px] opacity-90">
                    Courts {p.courtRate === 0 ? "free" : `${inr(p.courtRate)}/hr`} · Shop {p.shopDiscount}% off · Bar {p.barDiscount}% off
                  </div>
                </Link>
              );
            })}
        </div>
        <div className="order-1 lg:order-2">
          <span className={eyebrow}>Memberships</span>
          <h2 className={featureH}>A plan for every player</h2>
          <Ticks
            items={[
              "Gold, Silver and Junior monthly plans",
              "Discounts applied automatically everywhere",
              "Book courts and order food from your phone",
              "Pay by cash, card or UPI at the desk",
            ]}
          />
          <Link href="/trial?interest=membership" className="mt-6 inline-block font-bold text-forest">
            Ask about memberships →
          </Link>
        </div>
      </div>

      <div id="shop" className="grid scroll-mt-20 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className={eyebrow}>Pro shop</span>
          <h2 className={featureH}>Gear right by the courts</h2>
          <Ticks items={["Rackets, balls, shoes and club apparel", "Racket restringing while you wait", "Member prices at the counter"]} />
          <Link href="/trial" className="mt-6 inline-block font-bold text-forest">
            Try our rackets on a free trial →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {products.map((p) => {
            const meta = productImg[p.sku];
            const low = p.stock <= p.lowStockAt;
            return (
              <div key={p.sku} className="rounded-2xl border border-line bg-paper p-3.5">
                <div className={`relative h-[140px] overflow-hidden rounded-[10px] sm:h-[170px] ${meta?.white ? "bg-white" : ""}`}>
                  {meta && (
                    <Image
                      src={meta.img}
                      alt={p.name}
                      width={meta.w}
                      height={meta.h}
                      unoptimized
                      className={`block h-full w-full ${meta.pos === "object-contain" ? "object-contain" : `object-cover ${meta.pos}`}`}
                    />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[12.5px] font-bold text-white backdrop-blur ${meta?.white ? "bg-forest/75" : "border border-white/50 bg-white/30"}`}
                  >
                    {meta?.tag ?? p.category}
                  </span>
                </div>
                <div className="mt-3 font-bold">{p.name}</div>
                <div className="mt-1 flex justify-between gap-2 text-[14.5px]">
                  <span className="tabular-nums">{inr(p.price)}</span>
                  {p.stock <= 0 ? (
                    <span className="text-muted">Sold out</span>
                  ) : low ? (
                    <span className="font-semibold text-[#a8411f]">Only {p.stock} left</span>
                  ) : (
                    <span className="text-muted">{p.stock} in stock</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div id="cafe" className="grid scroll-mt-20 items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative flex min-h-[460px] items-end overflow-hidden rounded-[20px] p-5 sm:min-h-[520px]">
          <Image
            src="/images/cafe-bowl.jpg"
            alt="Rice bowl with avocado, black beans and salad"
            fill
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[50%_40%]"
          />
          <div className="absolute right-5 top-5 aspect-[2/1] w-[42%] overflow-hidden rounded-[14px] border-[3px] border-white/85 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
            <Image
              src="/images/cafe-wrap.jpg"
              alt="Grilled wrap with salad"
              width={1014}
              height={530}
              unoptimized
              className="block h-full w-full object-cover"
            />
          </div>
          <div className={`relative w-full rounded-2xl bg-forest-deep/55 p-6 text-white ${glass}`}>
            <div className="text-[18px] font-extrabold text-ball">Table 4 · {cafe.plan} member</div>
            {cafe.lines.map((l) => (
              <div key={l.name} className="flex justify-between border-b border-cream/20 py-3 text-[16px]">
                <span>{l.name}</span>
                <span className="tabular-nums">{inr(l.price)}</span>
              </div>
            ))}
            <div className="flex justify-between py-3 text-[16px] text-ball">
              <span>Member discount {cafe.discountPct}%</span>
              <span className="tabular-nums">− {inr(cafe.discount)}</span>
            </div>
            <div className="flex justify-between text-[22px] font-extrabold">
              <span>Paid by UPI</span>
              <span className="tabular-nums">{inr(cafe.total)}</span>
            </div>
          </div>
        </div>
        <div>
          <span className={eyebrow}>Café &amp; bar</span>
          <h2 className={featureH}>Stay after the match</h2>
          <Ticks
            items={[
              "Wraps, bowls, fresh lime soda and cold coffee",
              "Run a tab at your table, order from your phone",
              "Gold saves 20%, Silver 10%, automatically",
            ]}
          />
          <Link href="/me/cafe" className="mt-6 inline-block font-bold text-forest">
            Order from your table →
          </Link>
        </div>
      </div>
    </section>
  );
}

const reviews = [
  {
    initial: "A",
    name: "Arjun M.",
    role: "Gold member",
    bg: "bg-forest",
    text: "Booking a court takes me ten seconds now, and the desk already knows my plan when I walk in.",
  },
  {
    initial: "P",
    name: "Priya S.",
    role: "Gold member",
    bg: "bg-clay",
    text: "Friday social nights are the best part of my week. I come alone and always get a game.",
  },
  {
    initial: "K",
    name: "Kabir S.",
    role: "Silver member",
    bg: "bg-[#8a6d3b]",
    text: "The member price at the shop paid for my membership the month I bought new shoes.",
  },
  {
    initial: "D",
    name: "Diya P.",
    role: "Junior member",
    bg: "bg-[#4d7a12]",
    text: "Junior coaching days are great and the courts are cheap enough to play every evening.",
  },
];

export function Reviews() {
  return (
    <section id="reviews" className="scroll-mt-20 border-y border-line bg-paper">
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-8 sm:py-24">
        <h2 className={h2}>What our members say</h2>
        <p className="mt-3 text-center text-[14px] text-muted">Sample reviews for the demo</p>
        <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {reviews.map((r) => (
            <figure key={r.name} className="grid content-between gap-[18px] rounded-2xl border border-line bg-cream p-6">
              <blockquote className="text-[16.5px] leading-[1.55]">“{r.text}”</blockquote>
              <figcaption className="flex items-center gap-3">
                <span className={`grid size-11 place-items-center rounded-full font-extrabold text-paper ${r.bg}`}>{r.initial}</span>
                <span className="text-[14.5px]">
                  <strong>{r.name}</strong>
                  <br />
                  <span className="text-muted">{r.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section id="faq" className="mx-auto max-w-[900px] scroll-mt-20 px-4 py-20 sm:px-8 sm:py-24">
      <h2 className={`${h2} mb-8 text-[clamp(36px,4.5vw,52px)]`}>Frequently asked questions</h2>
      {items.map((f) => (
        <details key={f.q} className="group border-t border-line py-[22px]">
          <summary className="cursor-pointer text-[19px] font-bold text-forest">{f.q}</summary>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pb-20 sm:px-8 sm:pb-24">
      <div className="relative grid gap-12 overflow-hidden rounded-3xl p-7 text-white sm:p-14 lg:grid-cols-2">
        <Image src="/images/contact-bg.jpg" alt="" aria-hidden="true" fill unoptimized sizes="100vw" className="object-cover object-[50%_45%]" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,42,29,0.88)_0%,rgba(11,42,29,0.55)_55%,rgba(11,42,29,0.25)_100%)]"
        />
        <div className="relative">
          <h2 className="text-[clamp(36px,4.5vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Let’s get you <span className={`${serif} text-ball`}>on court</span>
          </h2>
          <Ticks
            color="text-ball"
            items={[
              "A free 1-hour trial with equipment",
              "A call back from the desk within a day",
              "Help choosing the right plan",
              "Corporate and family quotes on request",
            ]}
          />
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
