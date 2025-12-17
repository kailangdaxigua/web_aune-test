"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const pageTypes = [
  { value: "static", label: "静态页面" },
  { value: "service", label: "服务支持" },
  { value: "about", label: "关于我们" },
] as const;

type PageItem = {
  id: number;
  title: string;
  slug: string;
  page_type: string | null;
  content_html: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPageTypeLabel(value?: string | null) {
  if (!value) return "-";
  return pageTypes.find((t) => t.value === value)?.label || value;
}

function parseStorageUrl(url: string) {
  if (!url) return null;

  try {
    // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
      return {
        bucket: match[1],
        path: decodeURIComponent(match[2]),
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function deleteStorageFiles(urls: string[]) {
  const byBucket: Record<string, string[]> = {};

  for (const url of urls) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    if (!byBucket[parsed.bucket]) byBucket[parsed.bucket] = [];
    byBucket[parsed.bucket].push(parsed.path);
  }

  for (const [bucket, paths] of Object.entries(byBucket)) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

function extractSupabaseStorageUrlsFromHtml(html: string) {
  // 与 Vue 端 useDeleteWithStorage.js 的逻辑对齐：抓取 src="...supabase.../storage/..."
  const urls: string[] = [];
  const imgRegex = /src="([^"]*supabase[^"]*\/storage\/[^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

export default function ManagePagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    page_type: "static",
    content_html: "",
    is_published: true,
    meta_title: "",
    meta_description: "",
  });

  async function fetchPages() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPages((data || []) as PageItem[]);
    } catch (err: any) {
      console.error("Failed to fetch pages:", err);
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPages();
  }, []);

  const filteredPages = useMemo(() => {
    let result = [...pages];

    if (filterType !== "all") {
      result = result.filter((p) => (p.page_type || "static") === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const title = p.title?.toLowerCase?.() || "";
        const slug = p.slug?.toLowerCase?.() || "";
        return title.includes(q) || slug.includes(q);
      });
    }

    return result;
  }, [pages, filterType, searchQuery]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      page_type: "static",
      content_html: "",
      is_published: true,
      meta_title: "",
      meta_description: "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(page: PageItem) {
    setEditingId(page.id);
    setForm({
      title: page.title || "",
      slug: page.slug || "",
      page_type: page.page_type || "static",
      content_html: page.content_html || "",
      is_published: page.is_published,
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function savePage() {
    if (!form.title.trim()) {
      setErrorMessage("请输入页面标题");
      return;
    }

    if (!form.slug.trim()) {
      setErrorMessage("请输入页面 Slug");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        title: form.title.trim(),
        slug: form.slug.trim().toLowerCase(),
        page_type: form.page_type,
        content_html: form.content_html || null,
        is_published: form.is_published,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("pages")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pages").insert(payload);
        if (error) throw error;
      }

      await fetchPages();
      closeModal();
    } catch (err: any) {
      console.error("Failed to save page:", err);
      if (String(err?.code) === "23505") {
        setErrorMessage("Slug 已存在，请使用其他值");
      } else {
        setErrorMessage("保存失败: " + (err?.message || "未知错误"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublished(page: PageItem) {
    const newValue = !page.is_published;

    setPages((prev) =>
      prev.map((p) => (p.id === page.id ? { ...p, is_published: newValue } : p))
    );

    const { error } = await supabase
      .from("pages")
      .update({ is_published: newValue })
      .eq("id", page.id);

    if (error) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id ? { ...p, is_published: !newValue } : p
        )
      );
    }
  }

  async function deletePage(page: PageItem) {
    if (!window.confirm(`确定要删除页面 "${page.title}" 吗？`)) return;

    try {
      const urlsToDelete = page.content_html
        ? extractSupabaseStorageUrlsFromHtml(page.content_html)
        : [];

      const { error } = await supabase.from("pages").delete().eq("id", page.id);
      if (error) throw error;

      // 静默删除存储文件，不阻断主流程
      try {
        if (urlsToDelete.length > 0) {
          await deleteStorageFiles(urlsToDelete);
        }
      } catch (e) {
        console.warn("Failed to delete page storage files", e);
      }

      setPages((prev) => prev.filter((p) => p.id !== page.id));
    } catch (err: any) {
      console.error("Failed to delete page:", err);
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    }
  }

  return (
    <div className="page-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">页面管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理静态页面内容</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          新建页面
        </button>
      </div>

      {errorMessage && !showModal && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="min-w-[200px] flex-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="搜索标题/slug..."
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部类型</option>
          {pageTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg
            className="h-8 w-8 animate-spin text-amber-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">暂无页面</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">标题</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredPages.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-[#181824]">
                  <td className="px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{p.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">ID: {p.id}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{p.slug}</td>
                  <td className="px-4 py-4 text-zinc-300">
                    {getPageTypeLabel(p.page_type)}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {formatDate(p.updated_at || p.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => togglePublished(p)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        p.is_published
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {p.is_published ? "已发布" : "已下架"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/page/${p.slug}`}
                        target="_blank"
                        className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="预览"
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
                      </Link>
                      <button
                        onClick={() => openEditModal(p)}
                        className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="编辑"
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deletePage(p)}
                        className="rounded p-2 text-red-400 transition-colors hover:bg-red-500/20"
                        title="删除"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "编辑页面" : "新建页面"}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-400 transition-colors hover:text-white"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    页面标题 *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    onBlur={() => {
                      if (!form.slug.trim() && form.title.trim()) {
                        setForm((p) => ({ ...p, slug: generateSlug(p.title) }));
                      }
                    }}
                    type="text"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">Slug *</label>
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, slug: e.target.value }))
                    }
                    type="text"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">类型</label>
                  <select
                    value={form.page_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, page_type: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {pageTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                      checked={form.is_published}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, is_published: e.target.checked }))
                      }
                    />
                    发布
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  内容（HTML）
                  <span className="ml-2 text-xs text-zinc-500">
                    后续可替换为富文本编辑器
                  </span>
                </label>
                <textarea
                  value={form.content_html}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, content_html: e.target.value }))
                  }
                  rows={12}
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 font-mono text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Meta 标题
                  </label>
                  <input
                    value={form.meta_title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, meta_title: e.target.value }))
                    }
                    type="text"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Meta 描述
                  </label>
                  <textarea
                    value={form.meta_description}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, meta_description: e.target.value }))
                    }
                    rows={2}
                    className="w-full resize-none rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-zinc-800 p-6">
              <button
                onClick={closeModal}
                className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-white transition-colors hover:bg-zinc-700"
              >
                取消
              </button>
              <button
                onClick={savePage}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
