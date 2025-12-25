"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const categoryOptions = [
  { value: "news", label: "新闻动态" },
  { value: "product", label: "产品资讯" },
  { value: "event", label: "活动公告" },
  { value: "tech", label: "技术分享" },
] as const;

type NewsItem = {
  id: number;
  title: string;
  slug: string;
  cover_image: string | null;
  excerpt: string | null;
  content_html: string | null;
  category: string | null;
  tags: string[] | null;
  is_published: boolean;
  is_featured: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at?: string | null;
  view_count?: number | null;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getCategoryLabel(value?: string | null) {
  if (!value) return "-";
  return categoryOptions.find((c) => c.value === value)?.label || value;
}

function parseStorageUrl(url: string) {
  if (!url) return null;
  try {
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

async function deleteStorageFile(url: string) {
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  await supabase.storage.from(parsed.bucket).remove([parsed.path]);
}

function generateSlug(title: string) {
  const timestamp = Date.now().toString(36);
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
  return `${base}-${timestamp}`;
}

export default function ManageNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    cover_image: "",
    excerpt: "",
    content_html: "",
    category: "news",
    tagsText: "",
    is_published: false,
    is_featured: false,
    published_at: "",
    meta_title: "",
    meta_description: "",
  });

  async function fetchNews() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setNews((data || []) as NewsItem[]);
    } catch (err: any) {
      console.error("Failed to fetch news:", err);
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredNews = useMemo(() => {
    let result = [...news];

    if (filterCategory !== "all") {
      result = result.filter((n) => (n.category || "news") === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => {
        const title = n.title?.toLowerCase?.() || "";
        const slug = n.slug?.toLowerCase?.() || "";
        const excerpt = n.excerpt?.toLowerCase?.() || "";
        return title.includes(q) || slug.includes(q) || excerpt.includes(q);
      });
    }

    return result;
  }, [news, filterCategory, searchQuery]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      cover_image: "",
      excerpt: "",
      content_html: "",
      category: "news",
      tagsText: "",
      is_published: false,
      is_featured: false,
      published_at: "",
      meta_title: "",
      meta_description: "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(article: NewsItem) {
    setEditingId(article.id);
    setForm({
      title: article.title || "",
      slug: article.slug || "",
      cover_image: article.cover_image || "",
      excerpt: article.excerpt || "",
      content_html: article.content_html || "",
      category: article.category || "news",
      tagsText: (article.tags || []).join(","),
      is_published: !!article.is_published,
      is_featured: !!article.is_featured,
      published_at: article.published_at ? article.published_at.slice(0, 16) : "",
      meta_title: article.meta_title || "",
      meta_description: article.meta_description || "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
    setIsUploading(false);
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("请上传图片文件");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `news_cover_${timestamp}.${ext}`;

      const { error } = await supabase.storage
        .from("news")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("news")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, cover_image: urlData.publicUrl }));
    } catch (err: any) {
      console.error("Upload failed:", err);
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveNews() {
    if (!form.title.trim()) {
      setErrorMessage("请输入文章标题");
      return;
    }

    const slug = (form.slug.trim() || generateSlug(form.title)).toLowerCase();

    if (!form.content_html.trim()) {
      setErrorMessage("请输入文章内容");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const tags = form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const newsData: any = {
        title: form.title.trim(),
        slug,
        cover_image: form.cover_image || null,
        excerpt: form.excerpt.trim() || null,
        content_html: form.content_html,
        category: form.category,
        tags,
        is_published: form.is_published,
        is_featured: form.is_featured,
        published_at: form.is_published
          ? form.published_at || new Date().toISOString()
          : null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("news")
          .update(newsData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news").insert(newsData);
        if (error) throw error;
      }

      await fetchNews();
      closeModal();
    } catch (err: any) {
      console.error("Failed to save news:", err);
      if (String(err?.code) === "23505") {
        setErrorMessage("Slug 已存在，请使用其他值");
      } else {
        setErrorMessage("保存失败: " + (err?.message || "未知错误"));
      }
    } finally {
      setIsSaving(false);
    }
  }

  function deleteNewsItem(article: NewsItem) {
    setDeleteTarget(article);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      if (deleteTarget.cover_image) {
        await deleteStorageFile(deleteTarget.cover_image);
      }

      setNews((prev) => prev.filter((n) => n.id !== deleteTarget.id));
    } catch (err: any) {
      console.error("Failed to delete news:", err);
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function togglePublished(article: NewsItem) {
    const newValue = !article.is_published;
    const updates: any = {
      is_published: newValue,
      published_at: newValue ? new Date().toISOString() : article.published_at,
    };

    setNews((prev) =>
      prev.map((n) => (n.id === article.id ? { ...n, ...updates } : n))
    );

    const { error } = await supabase
      .from("news")
      .update(updates)
      .eq("id", article.id);

    if (error) {
      setNews((prev) =>
        prev.map((n) =>
          n.id === article.id
            ? { ...n, is_published: !newValue }
            : n
        )
      );
    }
  }

  async function toggleFeatured(article: NewsItem) {
    const newValue = !article.is_featured;

    setNews((prev) =>
      prev.map((n) => (n.id === article.id ? { ...n, is_featured: newValue } : n))
    );

    const { error } = await supabase
      .from("news")
      .update({ is_featured: newValue })
      .eq("id", article.id);

    if (error) {
      setNews((prev) =>
        prev.map((n) =>
          n.id === article.id ? { ...n, is_featured: !newValue } : n
        )
      );
    }
  }

  return (
    <div className="news-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">新闻管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理新闻资讯文章</p>
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
          发布文章
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
            placeholder="搜索标题/slug/摘要..."
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部分类</option>
          {categoryOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
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
      ) : news.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">
          暂无新闻文章
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((article) => (
            <div
              key={article.id}
              className="flex gap-4 rounded-xl border border-zinc-800 bg-[#11111a] p-4 transition-colors hover:border-zinc-600"
            >
              <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {article.cover_image ? (
                  <img
                    src={article.cover_image}
                    alt={article.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-8 w-8 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="truncate font-medium text-white">
                        {article.title}
                      </h3>
                      {article.is_featured && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                          置顶
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{getCategoryLabel(article.category)}</span>
                      <span className="text-zinc-700">|</span>
                      <span>
                        {formatDate(article.published_at || article.created_at)}
                      </span>
                      <span className="text-zinc-700">|</span>
                      <span>{article.view_count || 0} 阅读</span>
                    </div>
                    {article.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                        {article.excerpt}
                      </p>
                    )}
                  </div>

                  <span
                    className={`flex-shrink-0 rounded px-2 py-1 text-xs font-medium ${
                      article.is_published
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {article.is_published ? "已发布" : "草稿"}
                  </span>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                {article.is_published && (
                  <Link
                    href={`/news/${article.slug}`}
                    target="_blank"
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                    title="预览"
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                )}

                <button
                  onClick={() => toggleFeatured(article)}
                  className={`rounded-lg p-2 transition-colors ${
                    article.is_featured
                      ? "text-amber-300 hover:bg-amber-500/20"
                      : "text-zinc-500 hover:bg-zinc-900"
                  }`}
                  title="置顶"
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
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => togglePublished(article)}
                  className={`rounded-lg p-2 transition-colors ${
                    article.is_published
                      ? "text-green-400 hover:bg-green-500/20"
                      : "text-zinc-500 hover:bg-zinc-900"
                  }`}
                  title={article.is_published ? "取消发布" : "发布"}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => openEditModal(article)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
                  title="编辑"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                <button
                  onClick={() => deleteNewsItem(article)}
                  className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/20"
                  title="删除"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "编辑文章" : "发布文章"}
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

              {/* Title */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  文章标题 *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  onBlur={() => {
                    if (!form.slug.trim() && form.title.trim()) {
                      setForm((p) => ({ ...p, slug: generateSlug(p.title) }));
                    }
                  }}
                  type="text"
                  placeholder="输入文章标题"
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">Slug *</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  type="text"
                  placeholder="留空将自动生成"
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Cover */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">封面图片</label>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-40 overflow-hidden rounded-lg bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.cover_image ? (
                      <img
                        src={form.cover_image}
                        alt="cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        无封面
                      </div>
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white">
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
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {isUploading ? "上传中..." : form.cover_image ? "更换封面" : "上传封面"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleCoverUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">摘要</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, excerpt: e.target.value }))
                  }
                  rows={3}
                  placeholder="文章简短摘要"
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Category & Tags */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">分类</label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, category: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">
                    Tags（逗号分隔）
                  </label>
                  <input
                    value={form.tagsText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, tagsText: e.target.value }))
                    }
                    type="text"
                    placeholder="例如：评测,展会"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">内容 *</label>
                <textarea
                  value={form.content_html}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, content_html: e.target.value }))
                  }
                  rows={10}
                  placeholder="输入 HTML 内容（后续可替换为富文本编辑器）"
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 font-mono text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Publish & Featured */}
              <div className="flex flex-wrap items-center gap-6">
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
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, is_featured: e.target.checked }))
                    }
                  />
                  置顶
                </label>
              </div>

              {/* published_at */}
              <div>
                <label className="mb-2 block text-sm text-zinc-200">
                  发布时间（可选）
                </label>
                <input
                  value={form.published_at}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, published_at: e.target.value }))
                  }
                  type="datetime-local"
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* SEO */}
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
                    placeholder="留空则使用文章标题"
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
                    placeholder="页面描述（用于搜索引擎）"
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
                onClick={saveNews}
                disabled={isSaving || isUploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "上传中..." : isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="bg-card text-muted-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除文章
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-2 text-sm">
              <p>
                确定要删除文章
                <span className="mx-1 font-medium text-foreground">
                  {deleteTarget.title}
                </span>
                吗？
              </p>
              <p className="text-xs text-muted-foreground">
                此操作不可撤销，将同时删除关联的封面图文件。
              </p>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              disabled={deleting}
              className="bg-white text-black hover:bg-zinc-100"
              onClick={() => {
                if (!deleting) setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={deleting}
              className="bg-white text-red-600 hover:bg-red-50"
              onClick={confirmDelete}
            >
              {deleting ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
