"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroCarouselItem = {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  mobile_image_url?: string | null;
  link_url?: string | null;
  link_target?: string | null;
};

interface HeroCarouselClientProps {
  items: HeroCarouselItem[];
}

export default function HeroCarouselClient({ items }: HeroCarouselClientProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!items.length || items.length === 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  const current = items[index];

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <div className="group relative h-full w-full">
      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.image_url || ""}
        alt={current.title || "AUNE"}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0" />

      {/* Text overlay */}
      {(current.title || current.subtitle) && (
        <div className="absolute bottom-24 left-0 right-0 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h1 className="mb-4 text-3xl font-bold text-white sm:text-5xl md:text-6xl">
              {current.title}
            </h1>
            {current.subtitle && (
              <p className="max-w-xl text-sm text-zinc-300 sm:text-lg">
                {current.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Clickable area */}
      {current.link_url && (
        <Link
          href={current.link_url}
          target={current.link_target || "_self"}
          className="absolute inset-0"
        />
      )}

      {/* Left / Right controls - circular buttons, show on hover */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 lg:px-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={goPrev}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-black/30 text-white transition hover:bg-white hover:text-black"
        >
          <span className="sr-only">Previous</span>
          <span className="text-3xl">&#8249;</span>
        </button>
        <button
          type="button"
          onClick={goNext}
          className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-black/30 text-white transition hover:bg-white hover:text-black"
        >
          <span className="sr-only">Next</span>
          <span className="text-3xl">&#8250;</span>
        </button>
      </div>

      {/* Bottom pagination dots */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center">
        <div className="flex gap-3">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`pointer-events-auto h-2.5 w-2.5 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/40"
              }`}
            >
              <span className="sr-only">Go to slide {i + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
