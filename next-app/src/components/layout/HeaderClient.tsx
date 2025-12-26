"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Category, NavProduct } from "./Header";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

// 顶部主导航配置（文本、链接、是否外链）
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

// 从服务端 Header 组件传入的导航分类数据（当前文件暂未使用，可用于后续扩展）
interface HeaderClientProps {
  categoryGroups: { category: Category; products: NavProduct[] }[];
}

export default function HeaderClient({ categoryGroups }: HeaderClientProps) {
  // 是否已经滚动到一定距离，用于控制头部样式（背景、边框、文字颜色等）
  const [scrolled, setScrolled] = useState(false);
  // 简单语言状态：仅用于展示当前选择（默认 Language）
  const [language, setLanguage] = useState<"Language" | "简体中文" | "English">(
    "Language",
  );

  // 监听滚动事件，超过 80px 认为头部进入「已滚动」状态
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 导航文字的基础内边距和字号
  const navLinkBase = "px-3 py-1.5 text-sm sm:text-[14px]";
  // 导航文字颜色：
  // 未下滑：白色 -> 浅灰；
  // 下滑后：黑色 -> 深灰；
  // 点击后保持与悬浮时一致
  const navLinkColor = scrolled
    ? "text-black hover:text-zinc-600 focus:text-zinc-600"
    : "text-white hover:text-zinc-300 focus:text-zinc-300";

  return (
    // 顶部固定头部，包含 Logo + 导航 + 语言切换
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${scrolled
          ? "border-zinc-200/80 bg-white text-zinc-900 backdrop-blur-md"
          : "border-transparent bg-transparent text-white backdrop-blur-0"
        }`}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        {/* 头部主容器：控制整体高度和左右布局 */}
        <div className="flex h-12 sm:h-14 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scrolled ? "/aune.black.png" : "/aune.white.png"}
              alt="AUNE Logo"
              className="h-6 w-auto object-contain"
            />
          </Link>

          {/* 桌面导航：居中显示在 Logo 和 Language 按钮之间 */}
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <NavigationMenu viewport={false} className="flex-1 justify-center">
              <NavigationMenuList className="gap-4">
                {/* 遍历主导航配置，前四个为下拉，后面为普通链接 */}
                {MAIN_NAV.map((item, index) => {
                  const isDropdown = index < 4 && !item.external;

                  // 外链导航项（例如 商城），使用原生 <a> 打开新窗口
                  if (item.external) {
                    // 商城：使用与前四个相同的悬浮下拉结构
                    if (item.label === "商城") {
                      return (
                        <NavigationMenuItem key={item.label}>
                          <NavigationMenuTrigger
                            className={`${navLinkBase} ${
                              scrolled
                                ? "text-black hover:text-zinc-600! focus:text-zinc-600!"
                                : "text-white hover:text-zinc-300! focus:text-zinc-300!"
                            } bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent [&_svg]:hidden`}
                          >
                            {item.label}
                          </NavigationMenuTrigger>
                          <NavigationMenuContent
                            className={
                              scrolled
                                ? "bg-white text-zinc-900 w-auto px-0 flex justify-center rounded-2xl left-1/2 -translate-x-1/2"
                                : "bg-zinc-900/95 text-zinc-50 w-auto px-0 flex justify-center rounded-2xl left-1/2 -translate-x-1/2"
                            }
                            style={{ marginTop: 10 }}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-0.5 text-center">
                              <a
                                href="https://www.jd.com"
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-[13px] whitespace-nowrap text-center"
                              >
                                京东旗舰店
                              </a>
                              <a
                                href="https://www.tmall.com"
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-[13px] whitespace-nowrap text-center"
                              >
                                天猫旗舰店
                              </a>
                            </div>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    // 其他外链导航项
                    return (
                      <NavigationMenuItem key={item.label}>
                        <NavigationMenuLink asChild>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className={`${navLinkBase} ${navLinkColor} bg-transparent hover:bg-transparent focus:bg-transparent`}
                          >
                            {item.label}
                          </a>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  }

                  // 前四个为下拉菜单入口
                  if (isDropdown) {
                    return (
                      <NavigationMenuItem key={item.label}>
                        <NavigationMenuTrigger
                          className={`${navLinkBase} ${
                            scrolled
                              ? "text-black hover:text-zinc-600! focus:text-zinc-600!"
                              : "text-white hover:text-zinc-300! focus:text-zinc-300!"
                          } bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent [&_svg]:hidden`}
                        >
                          {item.label}
                        </NavigationMenuTrigger>
                        {/* 下拉内容区域：样式与“商城”下拉保持一致，后续可按需扩展内容 */}
                        <NavigationMenuContent
                          className={
                            scrolled
                              ? "bg-white text-zinc-900 w-auto px-0 flex justify-center rounded-2xl left-1/2 -translate-x-1/2"
                              : "bg-zinc-900/95 text-zinc-50 w-auto px-0 flex justify-center rounded-2xl left-1/2 -translate-x-1/2"
                          }
                          style={{ marginTop: 10 }}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 px-1.5 py-0.5 text-center">
                            <Link
                              href={item.href}
                              className="px-2.5 py-1 text-[13px] whitespace-nowrap text-center"
                            >
                              test1
                            </Link>
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  }

                  return (
                    <NavigationMenuItem key={item.label}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className={`${navLinkBase} ${navLinkColor} bg-transparent hover:bg-transparent focus:bg-transparent`}
                        >
                          {item.label}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* 右侧 Language 下拉（仅桌面显示，悬浮选择） */}
          <div className="relative hidden items-center lg:flex">
            <button
              type="button"
              className={`${navLinkBase} ${navLinkColor} ml-6 relative group inline-flex w-[96px] justify-center`}
            >
              {language}
              {/* 悬浮语言选择菜单 */}
              <div
                className="pointer-events-none absolute left-1/2 top-full z-50  min-w-[140px] -translate-x-1/2 transform rounded-lg bg-transparent px-3 py-2 text-sm opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
              >
                <div
                  className={
                    scrolled
                      ? "cursor-pointer py-1 text-center text-zinc-500 hover:text-zinc-700"
                      : "cursor-pointer py-1 text-center text-zinc-300 hover:text-zinc-100"
                  }
                  onClick={() => setLanguage("简体中文")}
                >
                  简体中文
                </div>
                <div
                  className={
                    scrolled
                      ? "cursor-pointer py-1 text-center text-zinc-500 hover:text-zinc-700"
                      : "cursor-pointer py-1 text-center text-zinc-300 hover:text-zinc-100"
                  }
                  onClick={() => setLanguage("English")}
                >
                  English
                </div>
              </div>
            </button>
          </div>

          {/* 移动端：只保留一个简单入口到产品列表 */}
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
