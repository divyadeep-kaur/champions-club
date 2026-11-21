"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { TodaysCourts } from "./TodaysCourts";

const ease = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.1, duration: 0.8, ease } }),
};

const facts = [
  { value: "6", label: "tennis & cricket courts" },
  { value: "6am–11pm", label: "open every day" },
  { value: "Shop + café", label: "right by the courts" },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-12">
      <div>
        <motion.h1
          custom={0}
          variants={rise}
          initial="hidden"
          animate="show"
          className="font-serif text-[64px] font-semibold leading-[0.92] tracking-[-0.035em] text-forest [font-variation-settings:'opsz'_144] sm:text-[92px] lg:text-[100px] xl:text-[116px]"
        >
          Meet you
          <br />
          <em className="font-medium italic [font-variation-settings:'opsz'_144,'SOFT'_100]">on court.</em>
        </motion.h1>

        <motion.p
          custom={1}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mt-7 max-w-[440px] text-[19px] leading-[1.55] text-ink sm:text-[21px]"
        >
          Find an open court, book a trial session and get to know the club, all before you walk in.
        </motion.p>

        <motion.div custom={2} variants={rise} initial="hidden" animate="show" className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5">
          <a
            href="#"
            className="group inline-flex items-center gap-2.5 bg-forest px-7 py-4 text-[17px] font-semibold text-cream transition-colors duration-300 hover:bg-forest-deep active:translate-y-px"
          >
            Book a trial
            <ArrowUpRight className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <a
            href="#"
            className="text-[17px] font-semibold text-forest underline decoration-forest/35 decoration-[1.5px] underline-offset-[7px] transition-colors hover:decoration-forest"
          >
            View memberships
          </a>
        </motion.div>

        <motion.dl
          custom={3}
          variants={rise}
          initial="hidden"
          animate="show"
          className="mt-14 grid max-w-[520px] grid-cols-3 border-t border-line pt-5"
        >
          {facts.map(({ value, label }, i) => (
            <div key={label} className={i > 0 ? "border-l border-line pl-4 sm:pl-5" : "pr-4"}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-serif text-[22px] font-medium leading-tight tracking-[-0.01em] text-forest sm:text-[26px]">{value}</dd>
              <dd className="mt-1 text-[13px] leading-snug text-muted sm:text-[14px]">{label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <figure className="relative sm:mb-40">
        <motion.div
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 1.1, ease, delay: 0.15 }}
          className="relative aspect-[986/520] overflow-hidden sm:aspect-[986/803]"
        >
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.08 }}
            animate={{ scale: reduce ? 1 : [1.08, 1.0] }}
            transition={{ duration: 2.4, ease }}
          >
            <Image
              src="/court.webp"
              alt="A player serving on a clay tennis court at The Champions Club, seen from above"
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-top"
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.8, ease }}
          className="relative z-10 mx-3 -mt-10 sm:absolute sm:left-[21%] sm:right-[3%] sm:top-[61%] sm:mx-0 sm:mt-0"
        >
          <TodaysCourts />
        </motion.div>
      </figure>
    </section>
  );
}
