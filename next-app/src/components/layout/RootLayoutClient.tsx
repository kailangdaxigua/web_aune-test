"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function RootLayoutClient({ children }: PropsWithChildren) {
  const pathname = usePathname();

  // 后台管理路由以 /Manage 开头，单独使用自己的布局，不需要站点 Header/Footer
  const isManageRoute = pathname?.startsWith("/Manage");

  if (isManageRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050509]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
