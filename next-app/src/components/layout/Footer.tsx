import type { ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type FooterLink = {
  id: number;
  label: string;
  url: string | null;
  link_group: string;
  is_external?: boolean | null;
  icon_class?: string | null;
  page?: { slug: string } | null;
};

type SiteConfig = {
  hotline?: string | null;
  copyright_text?: string | null;
  icp_number?: string | null;
};

const SOCIAL_ICONS: Record<string, ReactNode> = {
  "icon-weibo": (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.443zm-1.771-1.697c1.921-.371 2.793-1.912 2.01-3.489-.756-1.533-2.776-2.239-4.576-1.564-1.809.667-2.582 2.412-1.678 3.876.883 1.48 2.498 1.582 4.244 1.177zm1.678-1.533c-.319-.628-1.13-.883-1.797-.539-.675.341-.91 1.085-.535 1.652.367.567 1.153.852 1.788.531.666-.302.836-1.038.544-1.644zm.578-1.114c-.128-.241-.441-.361-.694-.258-.253.107-.349.391-.215.627.133.237.441.346.693.239.25-.102.348-.38.216-.608zM20.5 3.5L16 8H8V2h12.5zM16.003 5H10v1.5h6.003V5z" />
    </svg>
  ),
  "icon-wechat": (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.95-6.609 1.12-1.022 2.96-1.88 5.002-2.081-.476-2.937-3.66-5.942-7.753-5.942zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.006-.032zM13.023 12.61c.533 0 .963.44.963.98a.972.972 0 01-.963.98.972.972 0 01-.966-.98c0-.54.433-.98.966-.98zm4.822 0c.533 0 .966.44.966.98a.972.972 0 01-.966.98.972.972 0 01-.963-.98c0-.54.43-.98.963-.98z" />
    </svg>
  ),
  "icon-tieba": (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13H9v8h2V7zm4 0h-2v8h2V7z" />
    </svg>
  ),
  "icon-qq": (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.212 0 6.29.256 6.29-.43 0-.687-1.77-1.182-1.77-1.182 2.085-1.77 1.905-3.967 1.905-3.967.845 1.588 1.634 2.072 1.746 2.072.111 0 .283-.36.283-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.29 3.364 14.268 2 12.003 2z" />
    </svg>
  ),
};

function resolveUrl(link: FooterLink): string {
  if (link.is_external) {
    return link.url || "#";
  }

  if (link.page?.slug) {
    return `/page/${link.page.slug}`;
  }

  return link.url || "#";
}

function groupFooterLinks(links: FooterLink[]) {
  const groups: Record<string, FooterLink[]> = {};
  for (const link of links) {
    const key = link.link_group || "other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(link);
  }
  return groups;
}

export default async function Footer() {
  const [{ data: footerLinksData }, { data: configData }] = await Promise.all([
    (supabase
      .from("footer_links")
      .select("id, label, url, link_group, is_external, icon_class, page:pages(slug)")
      .eq("is_active", true)
      .order("sort_order") as any),
    supabase
      .from("site_config")
      .select("hotline, copyright_text, icp_number")
      .single<SiteConfig>(),
  ]);

  const groups = groupFooterLinks((footerLinksData || []) as FooterLink[]);

  const hotline = configData?.hotline || "";
  const copyrightText =
    configData?.copyright_text ||
    `© ${new Date().getFullYear()} Aune Audio. All rights reserved.`;
  const icpNumber = configData?.icp_number || "";

  const purchaseChannels = groups["purchase_channels"] || [];
  const aboutAune = groups["about_aune"] || [];
  const serviceSupport = groups["service_support"] || [];
  const officialPlatforms = groups["official_platforms"] || [];

  return (
    <footer className="border-t border-zinc-800 bg-[#050509]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Purchase Channels */}
          <div>
            <h3 className="mb-4 font-semibold text-white">购买渠道</h3>
            <ul className="space-y-3">
              {purchaseChannels.map((link) => (
                <li key={link.id}>
                  {link.is_external ? (
                    <a
                      href={resolveUrl(link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={resolveUrl(link)}
                      className="text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* About Aune */}
          <div>
            <h3 className="mb-4 font-semibold text-white">关于aune</h3>
            <ul className="space-y-3">
              {aboutAune.map((link) => (
                <li key={link.id}>
                  {link.is_external ? (
                    <a
                      href={resolveUrl(link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-300 transition-colors hover:text-amber-400"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={resolveUrl(link)}
                      className="text-sm text-zinc-300 transition-colors hover:text-amber-400"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Service Support */}
          <div>
            <h3 className="mb-4 font-semibold text-white">服务支持</h3>
            <ul className="space-y-3">
              {serviceSupport.map((link) => (
                <li key={link.id}>
                  {link.is_external ? (
                    <a
                      href={resolveUrl(link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={resolveUrl(link)}
                      className="text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Official Platforms */}
          <div>
            <h3 className="mb-4 font-semibold text-white">官方平台</h3>
            <ul className="space-y-3">
              {officialPlatforms.map((link) => (
                <li key={link.id}>
                  <a
                    href={resolveUrl(link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
                  >
                    {link.icon_class && (
                      <span className="text-amber-500">
                        {SOCIAL_ICONS[link.icon_class] || null}
                      </span>
                    )}
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Hotline & Copyright */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Logo & Copyright */}
            <div className="flex flex-col items-center gap-4 md:flex-row">
              <span className="text-xl font-display font-bold text-white">
                AUNE<span className="text-amber-500">.</span>
              </span>
              <span className="text-sm text-zinc-400">{copyrightText}</span>
              {icpNumber && (
                <span className="text-sm text-zinc-400">{icpNumber}</span>
              )}
            </div>

            {/* Service Hotline */}
            {hotline && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-sm text-zinc-300">官方服务热线：</span>
                <a
                  href={`tel:${hotline}`}
                  className="text-sm font-semibold text-white transition-colors hover:text-zinc-200"
                >
                  {hotline}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
