"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const downloadCategories = [
  { value: "desktop", label: "桌面系列" },
  { value: "portable", label: "便携系列" },
  { value: "history", label: "历史产品" },
] as const;

const fileTypes = [
  { value: "firmware", label: "固件" },
  { value: "driver", label: "驱动程序" },
  { value: "manual", label: "使用说明" },
  { value: "software", label: "软件工具" },
  { value: "other", label: "其他" },
] as const;

type ProductRef = {
  id: number;
  name: string;
  model?: string | null;
};

type Download = {
  id: number;
  title: string;
  file_url: string;
  file_size?: number | null;
  file_type: string;
  file_extension?: string | null;
  original_filename?: string | null;
  download_category: string;
  description_html?: string | null;
  product_id?: number | null;
  version?: string | null;
  is_active: boolean;
  download_count?: number | null;
  product?: ProductRef | null;
};

type ProductOption = {
  id: number;
  name: string;
  model?: string | null;
};

function formatSize(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTypeLabel(type: string) {
  return fileTypes.find((t) => t.value === type)?.label || type;
}

function getCategoryLabel(category: string) {
  return (
    downloadCategories.find((c) => c.value === category)?.label || category
  );
}

function getTypeBadgeClass(type: string) {
  const classes: Record<string, string> = {
    firmware: "bg-blue-500/20 text-blue-400",
    driver: "bg-purple-500/20 text-purple-400",
    manual: "bg-green-500/20 text-green-400",
    software: "bg-orange-500/20 text-orange-400",
    other: "bg-gray-500/20 text-gray-400",
  };
  return classes[type] || classes.other;
}

function getCategoryBadgeClass(category: string) {
  const classes: Record<string, string> = {
    desktop: "bg-cyan-500/20 text-cyan-400",
    portable: "bg-pink-500/20 text-pink-400",
    history: "bg-amber-500/20 text-amber-400",
  };
  return classes[category] || "bg-gray-500/20 text-gray-400";
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

function sanitizeFileName(fileName: string) {
  const ext = fileName.split(".").pop();
  const name = fileName.replace(/\.[^/.]+$/, "");
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  return `${sanitized}.${ext}`;
}

export default function ManageDownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Download | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    file_url: "",
    file_size: 0,
    file_type: "firmware",
    file_extension: "",
    original_filename: "",
    download_category: "desktop",
    description_html: "",
    product_id: "",
    version: "",
    is_active: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [downloadsRes, productsRes] = await Promise.all([
          supabase
            .from("downloads")
            .select(
              `*,
               product:products(id, name, model)`
            )
            .order("download_category")
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("id, name, model")
            .eq("is_active", true)
            .order("name"),
        ]);

        if (cancelled) return;

        if (!downloadsRes.error && downloadsRes.data) {
          setDownloads(downloadsRes.data as unknown as Download[]);
        }
        if (!productsRes.error && productsRes.data) {
          setProducts(productsRes.data as ProductOption[]);
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

  const filteredDownloads = useMemo(() => {
    let result = [...downloads];

    if (filterCategory !== "all") {
      result = result.filter((d) => d.download_category === filterCategory);
    }

    if (filterType !== "all") {
      result = result.filter((d) => d.file_type === filterType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((d) => {
        return (
          d.title.toLowerCase().includes(query) ||
          (d.version && d.version.toLowerCase().includes(query)) ||
          (d.original_filename &&
            d.original_filename.toLowerCase().includes(query))
        );
      });
    }

    return result;
  }, [downloads, filterCategory, filterType, searchQuery]);

  function openNewForm() {
    setEditingId(null);
    setForm({
      title: "",
      file_url: "",
      file_size: 0,
      file_type: "firmware",
      file_extension: "",
      original_filename: "",
      download_category: "desktop",
      description_html: "",
      product_id: "",
      version: "",
      is_active: true,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(download: Download) {
    setEditingId(download.id);
    setForm({
      title: download.title,
      file_url: download.file_url,
      file_size: download.file_size || 0,
      file_type: download.file_type,
      file_extension: download.file_extension || "",
      original_filename: download.original_filename || "",
      download_category: download.download_category || "desktop",
      description_html: download.description_html || "",
      product_id: download.product_id ? String(download.product_id) : "",
      version: download.version || "",
      is_active: download.is_active,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      setErrorMessage("文件大小不能超过 100MB");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const path = `resources/${timestamp}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from("downloads")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error(error);
        setErrorMessage("上传失败: " + error.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("downloads")
        .getPublicUrl(path);

      setForm((prev) => ({
        ...prev,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_extension: file.name.split(".").pop() || "",
        original_filename: file.name,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } catch (err: any) {
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveDownload() {
    if (!form.title.trim()) {
      setErrorMessage("请输入标题");
      return;
    }
    if (!form.file_url) {
      setErrorMessage("请上传文件");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        title: form.title.trim(),
        file_url: form.file_url,
        file_size: form.file_size || null,
        file_type: form.file_type,
        file_extension: form.file_extension || null,
        original_filename: form.original_filename || null,
        download_category: form.download_category,
        description_html: form.description_html || null,
        product_id: form.product_id ? Number(form.product_id) : null,
        version: form.version || null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("downloads")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("downloads").insert(payload);
        if (error) throw error;
      }

      const { data, error } = await supabase
        .from("downloads")
        .select(
          `*,
           product:products(id, name, model)`
        )
        .order("download_category")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setDownloads(data as unknown as Download[]);
      }

      setSuccessMessage(editingId ? "更新成功" : "创建成功");
      closeForm();
    } catch (err: any) {
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  function deleteDownload(download: Download) {
    setDeleteTarget(download);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("downloads")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      if (deleteTarget.file_url) {
        await deleteStorageFile(deleteTarget.file_url);
      }

      setDownloads((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    } catch (err: any) {
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleActive(download: Download) {
    const newValue = !download.is_active;
    setDownloads((prev) =>
      prev.map((d) =>
        d.id === download.id ? { ...d, is_active: newValue } : d
      )
    );

    const { error } = await supabase
      .from("downloads")
      .update({ is_active: newValue })
      .eq("id", download.id);

    if (error) {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === download.id ? { ...d, is_active: !newValue } : d
        )
      );
    }
  }

  return (
    <div className="download-manager">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">资源下载管理</h1>
          <p className="mt-1 text-sm text-zinc-400">
            管理固件、驱动、说明书等下载资源
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          添加资源
        </button>
      </div>

      {/* Messages */}
      {successMessage && !showForm && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {errorMessage && !showForm && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
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
            placeholder="搜索资源..."
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部分类</option>
          {downloadCategories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部类型</option>
          {fileTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            <svg
              className="mx-auto h-8 w-8 animate-spin text-amber-500"
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
            <p className="mt-2">加载中...</p>
          </div>
        ) : filteredDownloads.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            暂无下载资源
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">资源</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">大小</th>
                <th className="px-4 py-3 text-left font-medium">下载</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredDownloads.map((download) => (
                <tr
                  key={download.id}
                  className="transition-colors hover:bg-[#181824]"
                >
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {download.title}
                      </p>
                      {download.version && (
                        <p className="text-xs text-zinc-400">
                          v{download.version}
                        </p>
                      )}
                      {download.original_filename && (
                        <p className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-zinc-500">
                          {download.original_filename}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getCategoryBadgeClass(
                        download.download_category
                      )}`}
                    >
                      {getCategoryLabel(download.download_category)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeBadgeClass(
                        download.file_type
                      )}`}
                    >
                      {getTypeLabel(download.file_type)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-300">
                    {formatSize(download.file_size)}
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-300">
                    {download.download_count || 0}
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(download)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        download.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {download.is_active ? "已发布" : "已下架"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={download.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="下载"
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
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4-4 4m0 0-4-4m4 4V4"
                          />
                        </svg>
                      </a>
                      <button
                        onClick={() => openEditForm(download)}
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
                        onClick={() => deleteDownload(download)}
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
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "编辑资源" : "添加资源"}
              </h2>
              <button
                onClick={closeForm}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {errorMessage}
                </div>
              )}

              {/* File upload */}
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  上传文件 <span className="text-red-400">*</span>
                </label>
                <label className="block cursor-pointer">
                  <div
                    className={`rounded-xl border-2 border-dashed p-6 text-center text-sm transition-all ${
                      isUploading
                        ? "border-amber-500/60 bg-amber-500/10"
                        : "border-zinc-700 bg-[#050509] hover:border-zinc-500"
                    }`}
                  >
                    {!isUploading ? (
                      <>
                        <svg
                          className="mx-auto mb-2 h-10 w-10 text-zinc-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <p className="text-sm text-white">
                          {form.file_url ? "已上传，点击更换" : "点击或拖拽上传文件"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          支持 .zip, .rar, .bin, .pdf, .exe, .dmg 等，最大 100MB
                        </p>
                      </>
                    ) : (
                      <>
                        <svg
                          className="mx-auto mb-2 h-10 w-10 animate-spin text-amber-500"
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
                        <p className="text-sm text-amber-200">上传中...</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".zip,.rar,.bin,.pdf,.exe,.dmg,.msi,.pkg,.doc,.docx"
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                  />
                </label>

                {form.file_url && (
                  <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
                    <div className="flex items-center gap-2">
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>文件已上传</span>
                    </div>
                    {form.original_filename && (
                      <p className="mt-1 font-mono">
                        原始文件名: {form.original_filename}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Title & Version */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-200">
                    标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    type="text"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                    placeholder="如：X8 固件更新 v2.0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-200">
                    版本号
                  </label>
                  <input
                    value={form.version}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, version: e.target.value }))
                    }
                    type="text"
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                    placeholder="如：2.0.1"
                  />
                </div>
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-200">
                    产品分类 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.download_category}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        download_category: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  >
                    {downloadCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-200">
                    资源类型 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.file_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, file_type: e.target.value }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  >
                    {fileTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product association */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-200">
                  关联产品
                </label>
                <select
                  value={form.product_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, product_id: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                >
                  <option value="">不关联产品</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.model})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description (plain textarea, 后续可换富文本) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-200">
                  详细说明
                  <span className="ml-1 text-xs text-zinc-500">
                    (支持简单 HTML，后续可换成富文本编辑器)
                  </span>
                </label>
                <textarea
                  value={form.description_html}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description_html: e.target.value,
                    }))
                  }
                  className="h-32 w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  placeholder="更新日志 / 安装说明 / 注意事项 等"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                />
                <label htmlFor="is_active" className="text-sm text-zinc-300">
                  发布此资源（取消勾选将隐藏）
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                onClick={closeForm}
                className="rounded-lg border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveDownload}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "保存中..." : editingId ? "保存修改" : "创建资源"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除下载资源"
        description={
          deleteTarget && (
            <>
              <p className="mb-2">
                确定要删除
                <span className="mx-1 font-medium text-white">{deleteTarget.title}</span>
                吗？
              </p>
              <p className="text-xs text-zinc-500">此操作不可撤销，将同时删除存储中的文件。</p>
            </>
          )
        }
        confirmLabel={deleting ? "正在删除..." : "确认删除"}
        cancelLabel="取消"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
