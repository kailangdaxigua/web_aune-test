import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RootLayoutClient from "@/components/layout/RootLayoutClient";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase:
    typeof window === "undefined"
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com")
      : undefined,
  title: {
    default: "AUNE Audio - 官方网站",
    template: "%s - AUNE Audio",
  },
  description:
    "AUNE Audio 官方网站，提供 HiFi 解码耳放、音频播放设备的产品信息、固件下载、新闻资讯和服务支持。",
  keywords: [
    "AUNE",
    "AUNE Audio",
    "音频设备",
    "HiFi",
    "耳机放大器",
    "解码器",
  ],
  openGraph: {
    title: "AUNE Audio - 官方网站",
    description:
      "AUNE Audio 官方网站，了解最新 HiFi 产品、固件下载和品牌动态。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AUNE Audio - 官方网站",
    description:
      "AUNE Audio 官方网站，了解最新 HiFi 产品、固件下载和品牌动态。",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
