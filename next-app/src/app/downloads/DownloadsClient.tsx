"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DownloadItem = {
  id: number;
  title: string;
  file_type: string;
  download_category: "desktop" | "portable" | "history" | string;
  version?: string | null;
  file_size?: number | null;
  original_filename?: string | null;
  file_url: string;
  download_count?: number | null;
  created_at?: string | null;
  product?: {
    id: number;
    name: string;
    model?: string | null;
  } | null;
  description_html?: string | null;
};

const categories = [
  { value: "all", label: "全部产品", icon: "grid" },
  { value: "desktop", label: "桌面系列", icon: "desktop" },
  { value: "portable", label: "便携系列", icon: "portable" },
  { value: "history", label: "历史产品", icon: "history" },
] as const;

const fileTypes = [
  { value: "all", label: "全部类型" },
  { value: "firmware", label: "固件" },
  { value: "driver", label: "驱动程序" },
  { value: "manual", label: "使用说明" },
  { value: "software", label: "软件工具" },
  { value: "other", label: "其他" },
] as const;

function formatSize(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTypeBadgeClass(type: string) {
  const classes: Record<string, string> = {
    firmware: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    driver: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    manual: "bg-green-500/20 text-green-400 border-green-500/30",
    software: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return classes[type] || classes.other;
}

function getTypeLabel(type: string) {
  const match = fileTypes.find((t) => t.value === type);
  return match?.label || type;
}

function getCategoryIcon(value: string) {
  const icons: Record<string, string> = {
    grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    desktop:
      "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    portable:
      "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
    history:
      "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  return icons[value] || icons.grid;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DownloadsClient({ initialDownloads }: { initialDownloads: DownloadItem[] }) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialDownloads.length };
    categories.forEach((cat) => {
      if (cat.value !== "all") {
        counts[cat.value] = initialDownloads.filter(
          (d) => d.download_category === cat.value
        ).length;
      }
    });
    return counts;
  }, [initialDownloads]);

  const filteredDownloads = useMemo(() => {
    let result = initialDownloads;

    if (filterCategory !== "all") {
      result = result.filter((d) => d.download_category === filterCategory);
    }

    if (filterType !== "all") {
      result = result.filter((d) => d.file_type === filterType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        return (
          d.title.toLowerCase().includes(q) ||
          (d.version && d.version.toLowerCase().includes(q)) ||
          (d.original_filename && d.original_filename.toLowerCase().includes(q)) ||
          (d.product?.name && d.product.name.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [initialDownloads, filterCategory, filterType, searchQuery]);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDownload(download: DownloadItem) {
    try {
      await supabase.rpc("increment_download_count", { download_id: download.id });
    } catch (e) {
      console.warn("Failed to increment download count", e);
    }

    try {
      if (download.original_filename) {
        const response = await fetch(download.file_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = download.original_filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        window.open(download.file_url, "_blank");
      }
    } catch (e) {
      console.error("Download failed", e);
    }
  }

  return (
    <div className="downloads-page min-h-screen bg-[#050509] pt-20 text-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
              下载中心
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-400 sm:text-lg">
              获取最新固件、驱动程序和使用说明
            </p>
          </div>
        </div>
      </section>

      {/* Main body */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Left nav */}
            <aside className="flex-shrink-0 lg:w-64">
              <div className="sticky top-28 rounded-2xl border border-zinc-800 bg-[#11111a]/80 p-4">
                <h3 className="mb-4 px-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
                  产品分类
                </h3>
                <nav className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFilterCategory(cat.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                        filterCategory === cat.value
                          ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                          : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
                      }`}
                    >
                      <svg
                        className="h-5 w-5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d={getCategoryIcon(cat.icon)}
                        />
                      </svg>
                      <span className="flex-1">{cat.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          filterCategory === cat.value
                            ? "bg-amber-500/30 text-amber-200"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {categoryCounts[cat.value] || 0}
                      </span>
                    </button>
                  ))}
                </nav>

                {/* File type filter */}
                <div className="mt-6 border-t border-zinc-800 pt-6">
                  <h3 className="mb-3 px-2 text-sm font-medium uppercase tracking-wider text-zinc-400">
                    文件类型
                  </h3>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-[#050509] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
                  >
                    {fileTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </aside>

            {/* Right content */}
            <main className="min-w-0 flex-1">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    type="text"
                    placeholder="搜索资源名称、版本号..."
                    className="w-full rounded-xl border border-zinc-700 bg-[#11111a] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
                  />
                  <svg
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {/* Empty state / list */}
              {filteredDownloads.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-[#11111a] py-16 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
                    <svg
                      className="h-10 w-10 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-medium text-white sm:text-lg">
                    暂无下载资源
                  </h3>
                  <p className="text-sm text-zinc-500 sm:text-base">
                    请尝试调整筛选条件
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {filteredDownloads.map((download) => (
                      <div
                        key={download.id}
                        className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a] transition-colors hover:border-zinc-600"
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(download.id)}
                          className="flex w-full items-center gap-4 p-4 text-left"
                        >
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                            <svg
                              className="h-7 w-7 text-amber-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-3">
                              <h3 className="text-sm font-medium text-white sm:text-base">
                                {download.title}
                              </h3>
                              <span
                                className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${getTypeBadgeClass(
                                  download.file_type
                                )}`}
                              >
                                {getTypeLabel(download.file_type)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 sm:text-sm">
                              {download.version && (
                                <span className="flex items-center gap-1">
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
                                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                  </svg>
                                  v{download.version}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
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
                                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                                  />
                                </svg>
                                {formatSize(download.file_size)}
                              </span>
                              {download.product && (
                                <span className="flex items-center gap-1">
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
                                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                                    />
                                  </svg>
                                  {download.product.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
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
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                                {formatDate(download.created_at)}
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform ${
                              expandedId === download.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>

                        {expandedId === download.id && (
                          <div className="border-t border-zinc-800 bg-[#0b0b11]">
                            <div className="px-4 pb-4 pt-3">
                              {download.original_filename && (
                                <div className="mb-4 rounded-lg bg-[#11111a] p-3 text-xs text-zinc-300 sm:text-sm">
                                  <span className="text-zinc-400">文件名：</span>
                                  <span className="font-mono">{download.original_filename}</span>
                                </div>
                              )}

                              {download.description_html ? (
                                <div
                                  className="prose prose-sm prose-invert max-w-none text-zinc-200"
                                  dangerouslySetInnerHTML={{
                                    __html: download.description_html,
                                  }}
                                />
                              ) : (
                                <p className="mb-4 text-sm text-zinc-500">暂无详细说明</p>
                              )}

                              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                                <span className="text-xs text-zinc-400 sm:text-sm">
                                  已下载 {download.download_count || 0} 次
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(download);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-400"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4-4 4m0 0-4-4m4 4V4"
                                    />
                                  </svg>
                                  下载文件
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 text-center text-xs text-zinc-500 sm:text-sm">
                    共 {filteredDownloads.length} 个资源
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
