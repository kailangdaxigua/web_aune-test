"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Category, NavProduct } from "./Header";

const MAIN_NAV: { label: string; href: string; external?: boolean }[] = [
  { label: "耳机音箱", href: "/products/all" },
  { label: "桌面", href: "/products/all" },
  { label: "便携", href: "/products/all" },
  { label: "配件", href: "/products/all" },
  { label: "服务支持", href: "/support" },
  { label: "荣誉墙", href: "/page/honors" },
  { label: "经销商", href: "/dealers" },
  { label: "商城", href: "#", external: true },
];

interface HeaderClientProps {
  categoryGroups: { category: Category; products: NavProduct[] }[];
}

export default function HeaderClient({ categoryGroups }: HeaderClientProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinkBase =
    "px-3 py-1.5 text-sm sm:text-[14px] font-medium transition-colors";
  const navLinkColor = scrolled
    ? "text-zinc-900 hover:text-black"
    : "text-white hover:text-zinc-200/60";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? "border-zinc-200/80 bg-white text-zinc-900 backdrop-blur-md"
          : "border-transparent bg-transparent text-white backdrop-blur-0"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="flex h-14 sm:h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scrolled ? "/aune.black.png" : "/aune.white.png"}
              alt="AUNE Logo"
              className="h-6 w-auto object-contain"
            />
          </Link>

          {/* Desktop navigation (centered between logo and Language) */}
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <nav className="flex items-center gap-4">
              {MAIN_NAV.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`${navLinkBase} ${navLinkColor}`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${navLinkBase} ${navLinkColor}`}
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </div>

          {/* Language on the far right (desktop) */}
          <div className="hidden items-center lg:flex">
            <button
              type="button"
              className={`${navLinkBase} ${navLinkColor} ml-6`}
            >
              Language
            </button>
          </div>

          {/* Mobile simple link */}
          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <Link
              href="/products/all"
              className={
                scrolled
                  ? "text-sm font-medium text-zinc-900 hover:text-black"
                  : "text-sm font-medium text-zinc-200 hover:text-white"
              }
            >
              产品
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
