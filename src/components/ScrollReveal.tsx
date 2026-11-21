"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const BLOCKS = "h1, h2, h3, p, img, video, figure, li, tr, details, blockquote, [data-reveal]";
const CARD = /\b(rounded|border)\b|\brounded-|\bborder-line\b/;
const SKIP =
  "header, nav, aside[aria-label], dialog, [role='dialog'], [data-no-reveal], .cc-landing > section:first-of-type, .cc-cal-cell, td, th, button, label, option";

function isCard(el: Element) {
  return el.tagName === "ARTICLE" || el.tagName === "SECTION"
    ? false
    : CARD.test(el.getAttribute("class") ?? "") && el.children.length > 0 && el.getBoundingClientRect().height > 60;
}

// React marks each element it has taken over (hydrated) with an internal "__reactFiber" key.
// Sections that stream in later are plain HTML until then, and changing their classes
// early makes React report a hydration mismatch. Those are left for the next scan.
const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));

function candidates(root: Element) {
  const out: HTMLElement[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (child.matches(SKIP) || child.closest(SKIP)) continue;
      if (child.classList.contains("cc-reveal") || child.hasAttribute("data-cc-done")) continue;
      if (!hydrated(child)) continue;
      if (child.matches(BLOCKS) || isCard(child)) {
        out.push(child as HTMLElement);
        continue;
      }
      walk(child);
    }
  };
  walk(root);
  return out.slice(0, 400);
}

export function ScrollReveal() {
  const pathname = usePathname();
  const app = pathname.startsWith("/staff") || pathname.startsWith("/me");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const html = document.documentElement;
    html.classList.add("cc-reveal-on");
    html.classList.toggle("cc-reveal-subtle", app);

    const show = (el: HTMLElement, order: number) => {
      if (el.classList.contains("cc-in")) return;
      el.style.setProperty("--cc-delay", `${Math.min(order, 6) * 70}ms`);
      el.classList.add("cc-in");
      io.unobserve(el);
      setTimeout(() => {
        el.classList.remove("cc-reveal", "cc-reveal-media", "cc-in");
        el.style.removeProperty("--cc-delay");
        el.setAttribute("data-cc-done", "");
      }, 1700);
    };

    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement, i++);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    let frame = 0;
    const check = () => {
      let i = 0;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(".cc-reveal:not(.cc-in)"))) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) show(el, i++);
      }
    };
    const backup = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    const safety = setInterval(() => {
      scan();
      check();
    }, 1000);
    window.addEventListener("scroll", backup, { passive: true });

    function scan() {
      for (const root of Array.from(document.querySelectorAll("main, footer"))) {
        for (const el of candidates(root)) {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.92) {
            el.setAttribute("data-cc-done", "");
            continue;
          }
          el.classList.add("cc-reveal");
          if (el.matches("img, video")) el.classList.add("cc-reveal-media");
          io.observe(el);
        }
      }
    }

    const first = requestAnimationFrame(scan);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 120);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(frame);
      clearInterval(safety);
      window.removeEventListener("scroll", backup);
      clearTimeout(timer);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname, app]);

  if (app) return null;
  return <div aria-hidden="true" className="cc-progress" />;
}
