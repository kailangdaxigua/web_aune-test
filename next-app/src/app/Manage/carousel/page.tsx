"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const positionOptions = [
  { value: "left", label: "左对齐" },
  { value: "center", label: "居中" },
  { value: "right", label: "右对齐" },
] as const;

const targetOptions = [
  { value: "_self", label: "当前窗口" },
  { value: "_blank", label: "新窗口" },
] as const;

type Slide = {
  id: number;
  title: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  link_target: string | null;
  overlay_title: string | null;
  overlay_subtitle: string | null;
  overlay_position: string | null;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
};

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

async function deleteStorageFiles(urls: string[]) {
  const byBucket: Record<string, string[]> = {};
  for (const url of urls) {
    if (!url) continue;
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    if (!byBucket[parsed.bucket]) byBucket[parsed.bucket] = [];
    byBucket[parsed.bucket].push(parsed.path);
  }
  for (const [bucket, paths] of Object.entries(byBucket)) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

export default function ManageCarouselPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    image_url: "",
    mobile_image_url: "",
    link_url: "",
    link_target: "_self",
    overlay_title: "",
    overlay_subtitle: "",
    overlay_position: "center",
    sort_order: 0,
    is_active: true,
    start_at: "",
    end_at: "",
  });

  async function fetchSlides() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("home_carousel")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      setSlides((data || []) as Slide[]);
    } catch (err: any) {
      console.error("Failed to fetch slides:", err);
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSlides();
  }, []);

  const orderedSlides = useMemo(() => {
    return [...slides].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [slides]);

  function openCreateModal() {
    setEditingId(null);
    setForm({
      title: "",
      image_url: "",
      mobile_image_url: "",
      link_url: "",
      link_target: "_self",
      overlay_title: "",
      overlay_subtitle: "",
      overlay_position: "center",
      sort_order: slides.length,
      is_active: true,
      start_at: "",
      end_at: "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function openEditModal(slide: Slide) {
    setEditingId(slide.id);
    setForm({
      title: slide.title || "",
      image_url: slide.image_url || "",
      mobile_image_url: slide.mobile_image_url || "",
      link_url: slide.link_url || "",
      link_target: slide.link_target || "_self",
      overlay_title: slide.overlay_title || "",
      overlay_subtitle: slide.overlay_subtitle || "",
      overlay_position: slide.overlay_position || "center",
      sort_order: slide.sort_order ?? 0,
      is_active: slide.is_active,
      start_at: slide.start_at ? slide.start_at.slice(0, 16) : "",
      end_at: slide.end_at ? slide.end_at.slice(0, 16) : "",
    });
    setErrorMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setErrorMessage("");
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "image_url" | "mobile_image_url"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setErrorMessage("图片大小不能超过 10MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("请上传图片文件");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `carousel_${timestamp}_${field}.${ext}`;

      const { error } = await supabase.storage
        .from("carousel")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("carousel")
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, [field]: urlData.publicUrl } as any));
    } catch (err: any) {
      console.error("Upload failed:", err);
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveSlide() {
    if (!form.image_url) {
      setErrorMessage("请上传轮播图片");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        title: form.title.trim() || null,
        image_url: form.image_url,
        mobile_image_url: form.mobile_image_url || null,
        link_url: form.link_url.trim() || null,
        link_target: form.link_target,
        overlay_title: form.overlay_title.trim() || null,
        overlay_subtitle: form.overlay_subtitle.trim() || null,
        overlay_position: form.overlay_position,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("home_carousel")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_carousel").insert(payload);
        if (error) throw error;
      }

      await fetchSlides();
      closeModal();
    } catch (err: any) {
      console.error("Failed to save slide:", err);
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSlide(slide: Slide) {
    if (!window.confirm("确定要删除这张轮播图吗？")) return;

    try {
      const urls = [slide.image_url, slide.mobile_image_url].filter(Boolean) as string[];

      const { error } = await supabase
        .from("home_carousel")
        .delete()
        .eq("id", slide.id);
      if (error) throw error;

      try {
        if (urls.length) await deleteStorageFiles(urls);
      } catch (e) {
        console.warn("Failed to delete carousel files", e);
      }

      await fetchSlides();
    } catch (err: any) {
      console.error("Failed to delete slide:", err);
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    }
  }

  async function toggleActive(slide: Slide) {
    const newValue = !slide.is_active;

    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, is_active: newValue } : s))
    );

    const { error } = await supabase
      .from("home_carousel")
      .update({ is_active: newValue })
      .eq("id", slide.id);

    if (error) {
      setSlides((prev) =>
        prev.map((s) =>
          s.id === slide.id ? { ...s, is_active: !newValue } : s
        )
      );
    }
  }

  async function swapOrder(fromIndex: number, toIndex: number) {
    const fromItem = orderedSlides[fromIndex];
    const toItem = orderedSlides[toIndex];
    if (!fromItem || !toItem) return;

    try {
      await Promise.all([
        supabase
          .from("home_carousel")
          .update({ sort_order: toIndex })
          .eq("id", fromItem.id),
        supabase
          .from("home_carousel")
          .update({ sort_order: fromIndex })
          .eq("id", toItem.id),
      ]);
      await fetchSlides();
    } catch (err: any) {
      console.error("Failed to swap order:", err);
      setErrorMessage("排序失败: " + (err?.message || "未知错误"));
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    await swapOrder(index, index - 1);
  }

  async function moveDown(index: number) {
    if (index === orderedSlides.length - 1) return;
    await swapOrder(index, index + 1);
  }

  return (
    <div className="carousel-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">轮播图管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理首页轮播图内容</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          添加轮播
        </button>
      </div>

      {errorMessage && !showModal && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">加载中...</div>
        ) : orderedSlides.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">暂无轮播图</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">图片</th>
                <th className="px-4 py-3 text-left font-medium">标题/文案</th>
                <th className="px-4 py-3 text-left font-medium">链接</th>
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">排序</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orderedSlides.map((s, idx) => (
                <tr key={s.id} className="transition-colors hover:bg-[#181824]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.image_url}
                        alt={s.title || "slide"}
                        className="h-14 w-24 rounded-lg object-cover"
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.mobile_image_url ? (
                        <img
                          src={s.mobile_image_url}
                          alt={s.title || "mobile"}
                          className="h-14 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-14 w-10 rounded-lg bg-zinc-900" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-white">{s.title || "-"}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {s.overlay_title || ""} {s.overlay_subtitle || ""}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {s.link_url ? (
                      <a
                        href={s.link_url}
                        target={s.link_target || "_self"}
                        rel="noreferrer"
                        className="text-xs text-amber-300 hover:underline"
                      >
                        {s.link_url}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-zinc-400">
                    <div>
                      <div>开始：{s.start_at ? s.start_at.slice(0, 16).replace("T", " ") : "-"}</div>
                      <div>结束：{s.end_at ? s.end_at.slice(0, 16).replace("T", " ") : "-"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-300">{s.sort_order}</span>
                      <button
                        onClick={() => moveUp(idx)}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="上移"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="下移"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(s)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        s.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {s.is_active ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                        title="编辑"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteSlide(s)}
                        className="rounded p-2 text-red-400 transition-colors hover:bg-red-500/20"
                        title="删除"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "编辑轮播" : "添加轮播"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
              {errorMessage && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">标题（可选）</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">排序值</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">桌面端图片 *</label>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.image_url ? (
                      <img src={form.image_url} alt="desktop" className="h-16 w-28 rounded-lg object-cover" />
                    ) : (
                      <div className="h-16 w-28 rounded-lg bg-zinc-900" />
                    )}
                    <label className="cursor-pointer rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white">
                      {isUploading ? "上传中..." : form.image_url ? "更换" : "上传"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleImageUpload(e, "image_url")}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">移动端图片（可选）</label>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.mobile_image_url ? (
                      <img src={form.mobile_image_url} alt="mobile" className="h-16 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-16 w-12 rounded-lg bg-zinc-900" />
                    )}
                    <label className="cursor-pointer rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white">
                      {isUploading ? "上传中..." : form.mobile_image_url ? "更换" : "上传"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleImageUpload(e, "mobile_image_url")}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">链接地址</label>
                  <input
                    value={form.link_url}
                    onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))}
                    placeholder="https://... 或 /products/..."
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">打开方式</label>
                  <select
                    value={form.link_target}
                    onChange={(e) => setForm((p) => ({ ...p, link_target: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {targetOptions.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">Overlay 标题</label>
                  <input
                    value={form.overlay_title}
                    onChange={(e) => setForm((p) => ({ ...p, overlay_title: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">Overlay 副标题</label>
                  <input
                    value={form.overlay_subtitle}
                    onChange={(e) => setForm((p) => ({ ...p, overlay_subtitle: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">Overlay 位置</label>
                  <select
                    value={form.overlay_position}
                    onChange={(e) => setForm((p) => ({ ...p, overlay_position: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {positionOptions.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                      checked={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    />
                    启用
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">开始时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm((p) => ({ ...p, start_at: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">结束时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm((p) => ({ ...p, end_at: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-zinc-700 px-5 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                取消
              </button>
              <button
                onClick={saveSlide}
                disabled={isSaving || isUploading}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "上传中..." : isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
