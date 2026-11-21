"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

export function ClubVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting)
          v.play()
            .then(() => setPlaying(true))
            .catch(() => setPlaying(false));
        else {
          v.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused)
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const btn = "grid size-11 place-items-center rounded-full border border-white/40 bg-forest-deep/45 text-white backdrop-blur-md hover:bg-forest-deep/70";

  return (
    <section id="club-video" aria-label="Club video" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 pt-20 sm:px-8 sm:pt-24">
      <div className="relative overflow-hidden rounded-3xl bg-forest-deep">
        <video
          ref={ref}
          className="block aspect-[2/1] w-full object-cover"
          src="/videos/club-tour.mp4"
          poster="/videos/club-tour-poster.jpg"
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="A short film about running the club: bookings, gear, analytics and keeping players coming back"
        />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause video" : "Play video"} className={btn}>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
          <button type="button" onClick={toggleSound} aria-label={muted ? "Turn sound on" : "Turn sound off"} className={btn}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}
