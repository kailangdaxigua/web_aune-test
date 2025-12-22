"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SiteConfig = {
  id: number;
  nav_structure: any;
  footer_structure: any;
  carousel_images: any;
  home_video_url: string | null;
  home_video_enabled: boolean;
  site_title: string | null;
  site_description: string | null;
  hotline: string | null;
  qq_service_link: string | null;
  online_service_url: string | null;
  dealer_apply_link: string | null;
  icp_number: string | null;
  copyright_text: string | null;
};

function safeJsonParse(value: string) {
  try {
    return { ok: true as const, value: JSON.parse(value) };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "JSON 解析失败" };
  }
}

export default function ManageSiteConfigPage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [footerStructureText, setFooterStructureText] = useState("{");
  const [navStructureText, setNavStructureText] = useState("[]");
  const [carouselImagesText, setCarouselImagesText] = useState("[]");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const { data, error } = await supabase
          .from("site_config")
          .select("*")
          .single();

        if (error) throw error;

        if (cancelled) return;

        const cfg = data as SiteConfig;
        setConfig(cfg);
        setFooterStructureText(JSON.stringify(cfg.footer_structure ?? {}, null, 2));
        setNavStructureText(JSON.stringify(cfg.nav_structure ?? [], null, 2));
        setCarouselImagesText(JSON.stringify(cfg.carousel_images ?? [], null, 2));
      } catch (err: any) {
        if (!cancelled) {
          setErrorMessage("加载失败: " + (err?.message || "未知错误"));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function saveConfig() {
    if (!config) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const footerParsed = safeJsonParse(footerStructureText || "{}");
    if (!footerParsed.ok) {
      setIsSaving(false);
      setErrorMessage("footer_structure JSON 格式错误: " + footerParsed.error);
      return;
    }

    const navParsed = safeJsonParse(navStructureText || "[]");
    if (!navParsed.ok) {
      setIsSaving(false);
      setErrorMessage("nav_structure JSON 格式错误: " + navParsed.error);
      return;
    }

    const carouselParsed = safeJsonParse(carouselImagesText || "[]");
    if (!carouselParsed.ok) {
      setIsSaving(false);
      setErrorMessage("carousel_images JSON 格式错误: " + carouselParsed.error);
      return;
    }

    try {
      const updates: any = {
        nav_structure: navParsed.value,
        footer_structure: footerParsed.value,
        carousel_images: carouselParsed.value,
        home_video_url: config.home_video_url,
        home_video_enabled: !!config.home_video_enabled,
        site_title: config.site_title,
        site_description: config.site_description,
        hotline: config.hotline,
        qq_service_link: config.qq_service_link,
        online_service_url: config.online_service_url || config.qq_service_link,
        dealer_apply_link: config.dealer_apply_link,
        icp_number: config.icp_number,
        copyright_text: config.copyright_text,
      };

      const { error } = await supabase
        .from("site_config")
        .update(updates)
        .eq("id", config.id);

      if (error) throw error;

      setSuccessMessage("保存成功");
    } catch (err: any) {
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="site-config">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">站点配置</h1>
        <button
          onClick={saveConfig}
          disabled={isSaving || isLoading || !config}
          className="rounded-lg bg-linear-to-r from-amber-600 to-amber-500 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "保存中..." : "保存配置"}
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-zinc-400">加载中...</div>
      ) : !config ? (
        <div className="py-16 text-center text-zinc-400">未找到站点配置</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">SEO 设置</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  网站标题
                </label>
                <input
                  value={config.site_title || ""}
                  onChange={(e) => updateField("site_title", e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  网站描述
                </label>
                <textarea
                  value={config.site_description || ""}
                  onChange={(e) => updateField("site_description", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">服务支持配置</h3>
              <p className="mt-1 text-sm text-zinc-400">配置在线客服等服务入口</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  在线客服链接（QQ 客服）
                </label>
                <input
                  value={config.qq_service_link || ""}
                  onChange={(e) => updateField("qq_service_link", e.target.value)}
                  placeholder="https://wpa.qq.com/msgrd?..."
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  用于“服务支持”页面的“在线客服”入口
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  服务热线
                </label>
                <input
                  value={config.hotline || ""}
                  onChange={(e) => updateField("hotline", e.target.value)}
                  placeholder="027-85420526"
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">经销商配置</h3>
              <p className="mt-1 text-sm text-zinc-400">配置经销商相关入口链接</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">
                申请成为经销商链接
              </label>
              <input
                value={config.dealer_apply_link || ""}
                onChange={(e) => updateField("dealer_apply_link", e.target.value)}
                placeholder="/page/dealer-apply"
                className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              />
              <p className="mt-1 text-xs text-zinc-500">
                用于“经销商”页面右下角悬浮按钮跳转
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">首页视频</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!config.home_video_enabled}
                  onChange={(e) => updateField("home_video_enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                />
                启用首页视频
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  视频 URL
                </label>
                <input
                  value={config.home_video_url || ""}
                  onChange={(e) => updateField("home_video_url", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">备案信息</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  ICP 备案号
                </label>
                <input
                  value={config.icp_number || ""}
                  onChange={(e) => updateField("icp_number", e.target.value)}
                  placeholder="鄂ICP备XXXXXXXX号"
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  版权声明
                </label>
                <input
                  value={config.copyright_text || ""}
                  onChange={(e) => updateField("copyright_text", e.target.value)}
                  placeholder={`© ${new Date().getFullYear()} Aune Audio. All rights reserved.`}
                  className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
