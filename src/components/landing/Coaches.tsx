import Image from "next/image";
import Link from "next/link";

const coaches = [
  { name: "Arvid Lund", role: "Head tennis coach", sport: "Tennis", bio: "Technique and match play for adults, from first serve to league level.", img: "/images/coaches/tennis-head.jpg", pos: "object-[50%_20%]" },
  { name: "Sara Haddad", role: "Tennis coach", sport: "Tennis", bio: "Beginner clinics and ladies' mornings. Patient, practical and fun.", img: "/images/coaches/tennis-women.jpg", pos: "object-[60%_30%]" },
  { name: "Rohan Mehra", role: "Head cricket coach", sport: "Cricket", bio: "Batting in the nets, shot selection and game plans for club cricketers.", img: "/images/coaches/cricket-head.jpg", pos: "object-[50%_15%]" },
  { name: "Imran Qureshi", role: "Junior cricket coach", sport: "Cricket", bio: "Runs the under-18 coaching days: bowling actions, fielding and fitness.", img: "/images/coaches/cricket-nets.jpg", pos: "object-[60%_20%]" },
  { name: "Diego Ramos", role: "Social play host", sport: "Social play", bio: "Hosts Friday social nights and matches new players with the right partners.", img: "/images/coaches/social.jpg", pos: "object-[50%_20%]" },
];

export function Coaches() {
  return (
    <section id="coaches" aria-labelledby="coaches-title" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-20 sm:px-8 sm:py-24">
      <p className="text-center text-[13px] font-extrabold uppercase tracking-[0.12em] text-clay">Coaching</p>
      <h2 id="coaches-title" className="mt-3 text-center text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Meet the <span className="font-serif font-medium italic">coaches</span>
      </h2>
      <p className="mx-auto mt-3.5 max-w-[560px] text-center text-[18px] text-muted">Book a session with any of them from the front desk, or start with a free trial.</p>
      <ul className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
        {coaches.map((c) => (
          <li key={c.name} className="group overflow-hidden rounded-2xl border border-line bg-forest-deep">
            <div className="relative aspect-[4/5] min-h-[300px] overflow-hidden">
              <Image src={c.img} alt={`${c.name}, ${c.role.toLowerCase()}`} fill unoptimized sizes="(min-width: 1024px) 20vw, 50vw" className={`object-cover ${c.pos} transition-transform duration-700 group-hover:scale-105`} />
              <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-forest-deep/40 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-md">{c.sport}</span>
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-white/25 bg-forest-deep/45 px-3.5 py-3 text-white backdrop-blur-[14px]">
                <p className="text-[15.5px] font-extrabold leading-tight">{c.name}</p>
                <p className="text-[12.5px] text-[#cfe6a0]">{c.role}</p>
                <p className="mt-2 text-[13px] leading-snug text-white/90">{c.bio}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[13.5px] text-muted">Sample coaches for the demo.</p>
      <div className="mt-6 text-center">
        <Link href="/trial" className="inline-block rounded-full bg-forest px-7 py-4 text-[17px] font-bold text-cream hover:bg-forest-deep">
          Book a free trial session
        </Link>
      </div>
    </section>
  );
}
