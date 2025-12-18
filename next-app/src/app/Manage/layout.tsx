import type { ReactNode } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/manage/AuthGuard";

const NAV_ITEMS: { name: string; path: string; iconPath: string }[] = [
  {
    name: "数据看板",
    path: "/Manage",
    iconPath:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    name: "产品管理",
    path: "/Manage/products",
    iconPath:
      "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    name: "下载资源",
    path: "/Manage/downloads",
    iconPath:
      "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10",
  },
  {
    name: "新闻管理",
    path: "/Manage/news",
    iconPath:
      "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
  },
  {
    name: "页面管理",
    path: "/Manage/pages",
    iconPath:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    name: "经销商管理",
    path: "/Manage/dealers",
    iconPath:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    name: "FAQ 管理",
    path: "/Manage/faqs",
    iconPath:
      "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    name: "轮播图管理",
    path: "/Manage/carousel",
    iconPath:
      "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    name: "首页视频",
    path: "/Manage/videos",
    iconPath:
      "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    name: "页脚链接",
    path: "/Manage/footer-links",
    iconPath:
      "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
  {
    name: "站点配置",
    path: "/Manage/config",
    iconPath:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    name: "个人设置",
    path: "/Manage/profile",
    iconPath:
      "M5.121 17.804A9 9 0 1118.88 4.196 9 9 0 015.12 17.804z M15 11a3 3 0 11-6 0 3 3 0 016 0z M7.5 17.5A5.5 5.5 0 0112 15a5.5 5.5 0 014.5 2.5",
  },
];

export default function ManageLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#050509] text-white">
        {/* Sidebar */}
        <aside className="flex w-64 flex-col border-r border-zinc-800 bg-[#0b0b11]">
          <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
            <Link href="/Manage" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/aune.black.png"
                alt="AUNE Logo"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xs text-zinc-400">Admin</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-2 py-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <svg
                  className="h-5 w-5 flex-shrink-0 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={item.iconPath}
                  />
                </svg>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-zinc-800 p-4 text-xs text-zinc-500">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              访问网站
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-[#0b0b11] px-6">
            <h1 className="text-lg font-semibold text-white">管理后台</h1>
          </header>
          <main className="flex-1 overflow-auto bg-[#050509] p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
