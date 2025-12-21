"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type FeaturedItem = {
  id: number;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  is_external: boolean | null;
  link_target: string | null;
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
};

type FeaturedFormState = {
  title: string;
  subtitle: string;
  image_url: string;
  mobile_image_url: string;
  link_url: string; // 对应表里的 target_url
  is_external: boolean;
  link_target: "_self" | "_blank";
  sort_order: number;
  is_active: boolean;
  start_at: string;
  end_at: string;
};

const EMPTY_FORM: FeaturedFormState = {
  title: "",
  subtitle: "",
  image_url: "",
  mobile_image_url: "",
  link_url: "",
  is_external: false,
  link_target: "_self",
  sort_order: 0,
  is_active: true,
  start_at: "",
  end_at: "",
};

export default function ManageFeaturedPage() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<"desktop" | "mobile" | null>(
    null
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeaturedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("home_featured")
        .select(
          "id, title, subtitle, image_url, mobile_image_url, target_url, is_external, link_target, sort_order, is_active, start_at, end_at"
        )
        .order("sort_order");

      if (error) throw error;

      setItems((data || []) as FeaturedItem[]);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // 允许按 ESC 关闭弹窗
  useEffect(() => {
    if (!showFormModal) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowFormModal(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError(null);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFormModal]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowFormModal(true);
  }

  function startEdit(item: FeaturedItem) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      image_url: item.image_url || "",
      mobile_image_url: item.mobile_image_url || "",
      link_url: item.target_url || "",
      is_external: !!item.is_external,
      link_target: (item.link_target as "_self" | "_blank") || "_self",
      sort_order: item.sort_order,
      is_active: item.is_active,
      start_at: item.start_at || "",
      end_at: item.end_at || "",
    });
    setError(null);
    setShowFormModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.image_url.trim()) {
        setError("请先上传或填写推荐位图片地址");
        return;
      }

      if (!form.link_url.trim()) {
        setError("请填写跳转链接（例如 /product/x8 或 https://...）");
        return;
      }

      const payload: any = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        image_url: form.image_url || null,
        mobile_image_url: form.mobile_image_url || null,
        target_url: form.link_url || null,
        is_external: !!form.is_external,
        link_target: form.link_target || null,
        sort_order: Number.isFinite(form.sort_order)
          ? form.sort_order
          : 0,
        is_active: !!form.is_active,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
      };

      if (editingId == null) {
        const { error } = await supabase.from("home_featured").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("home_featured")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      }

      await load();
      setEditingId(null);
      setForm(EMPTY_FORM);
      setShowFormModal(false);
    } catch (e: any) {
      setError(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "desktop" | "mobile"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingField(field);
    try {
      const bucket = "images"; // 请在 Supabase 中创建名为 images 的公共存储桶，或改成实际 bucket 名称
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `home-featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setForm((prev) =>
        field === "desktop"
          ? { ...prev, image_url: publicUrl }
          : { ...prev, mobile_image_url: publicUrl }
      );
    } catch (e: any) {
      setError(e?.message || "图片上传失败，请稍后重试");
    } finally {
      setUploadingField(null);
      // 清空 input，避免同一文件无法再次触发 change
      e.target.value = "";
    }
  }

  async function toggleActive(item: FeaturedItem) {
    const next = !item.is_active;
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, is_active: next } : it))
    );

    const { error } = await supabase
      .from("home_featured")
      .update({ is_active: next })
      .eq("id", item.id);

    if (error) {
      // revert
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, is_active: item.is_active } : it))
      );
    }
  }

  function remove(item: FeaturedItem) {
    setDeleteTarget(item);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    const { error } = await supabase
      .from("home_featured")
      .delete()
      .eq("id", deleteTarget.id);

    if (!error) {
      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
    }

    setDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">首页精选推荐</h1>
          <p className="mt-1 text-sm text-zinc-400">
            配置首页白色区域的精选图片（建议 4 张，按排序展示），前台展示会按 2×2 栅格自适应显示。
          </p>
        </div>

        <button
          onClick={startCreate}
          className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
        >
          新建推荐
        </button>
      </div>

      {/* Form modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId == null ? "新建推荐" : "编辑推荐"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setError(null);
                }}
                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[82vh] space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    标题（可选）
                  </label>
                  <input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    副标题（可选）
                  </label>
                  <input
                    value={form.subtitle ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Time range */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    开始时间（可选）
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    结束时间（可选）
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Desktop image dropzone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">
                  推荐位图片（必填）
                </label>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1">
                    <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-[#0b0b12] px-4 text-center text-xs text-zinc-400 sm:h-32 sm:text-sm">
                      <div>
                        <div className="mb-2 text-zinc-300">点击选择图片上传，或粘贴地址</div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 hover:border-amber-500 hover:text-amber-300">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUpload(e, "desktop")}
                            />
                            {uploadingField === "desktop" ? "上传中..." : "点击选择图片"}
                          </label>
                        </div>
                        <input
                          value={form.image_url}
                          onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                          placeholder="或直接粘贴图片地址：https://...（桌面端大图）"
                          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 sm:text-sm"
                        />
                        <p className="mt-1 text-[11px] text-zinc-500">
                          支持 image/*，建议宽图（例如 2400x1200），文件请先上传到图床后粘贴地址
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full md:mt-0 md:w-64">
                    <div className="mb-1 text-xs font-medium text-zinc-300">预览</div>
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 sm:h-32">
                      {form.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url}
                          alt="desktop preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">暂无图片</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile image dropzone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">
                  移动端图片（可选）
                </label>
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="flex-1">
                    <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-[#0b0b12] px-4 text-center text-xs text-zinc-400 sm:h-28 sm:text-sm">
                      <div>
                        <div className="mb-2 text-zinc-300">点击选择图片上传，或粘贴地址</div>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 hover:border-amber-500 hover:text-amber-300">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUpload(e, "mobile")}
                            />
                            {uploadingField === "mobile" ? "上传中..." : "点击选择图片"}
                          </label>
                        </div>
                        <input
                          value={form.mobile_image_url}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, mobile_image_url: e.target.value }))
                          }
                          placeholder="或直接粘贴图片地址：https://...（移动端纵向图，可选）"
                          className="mt-2 w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40 sm:text-sm"
                        />
                        <p className="mt-1 text-[11px] text-zinc-500">
                          未填写时前台会自动使用上方桌面图片
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 w-full md:mt-0 md:w-40">
                    <div className="mb-1 text-xs font-medium text-zinc-300">移动端预览</div>
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 sm:h-28">
                      {form.mobile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.mobile_image_url}
                          alt="mobile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : form.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url}
                          alt="fallback mobile preview"
                          className="h-full w-full object-cover opacity-70"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">暂无图片</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    链接地址（必填）
                  </label>
                  <input
                    value={form.link_url ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                    placeholder="/product/x8 或 https://..."
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    链接选项
                  </label>
                  <div className="space-y-2 rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white">
                    <label className="flex items-center gap-2 text-xs text-zinc-200">
                      <input
                        type="checkbox"
                        checked={form.is_external}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            is_external: e.target.checked,
                            link_target: e.target.checked ? "_blank" : f.link_target,
                          }))
                        }
                        className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                      />
                      外部链接（新窗口打开）
                    </label>
                    <select
                      value={form.link_target ?? "_self"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          link_target: e.target.value as "_self" | "_blank",
                        }))
                      }
                      className="mt-2 w-full rounded-lg border border-zinc-700 bg-black/30 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="_self">当前窗口</option>
                      <option value="_blank">新窗口</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">
                    排序（数字越小越靠前）
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                  />
                  启用（显示在首页）
                </label>
                <div className="flex flex-col items-end gap-1 text-right">
                  {error && (
                    <div className="max-w-xs text-xs text-red-400">{error}</div>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black disabled:opacity-60"
                  >
                    {saving ? "保存中..." : editingId == null ? "创建" : "保存修改"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List as cards */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#11111a] p-10 text-center text-sm text-zinc-400">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#11111a] p-10 text-center text-sm text-zinc-400">
          暂无推荐，先在上方表单创建一条。
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#11111a] shadow-sm"
            >
              {/* 图片预览 */}
              <div className="relative">
                <div className="h-40 w-full overflow-hidden bg-zinc-900">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title || "preview"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                      无图片
                    </div>
                  )}
                </div>

                {/* 状态标签 */}
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      item.is_active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-700/60 text-zinc-300"
                    }`}
                  >
                    {item.is_active ? "已启用" : "未启用"}
                  </span>
                </div>

                {/* 序号 */}
                <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-medium text-white">
                  {index + 1}
                </div>
              </div>

              {/* 文案 & 信息 */}
              <div className="flex flex-1 flex-col border-t border-zinc-800 bg-[#11111a] px-4 py-3 text-xs text-zinc-400">
                <div className="mb-2 min-h-[40px]">
                  <p className="truncate text-sm font-medium text-white" title={item.title || undefined}>
                    {item.title || "(未命名推荐)"}
                  </p>
                  {item.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.subtitle}</p>
                  )}
                </div>

                <div className="mb-2 space-y-1 text-[11px] text-zinc-500">
                  {item.target_url && (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-400">链接：</span>
                      <a
                        href={item.target_url}
                        target={item.link_target || "_self"}
                        rel="noreferrer"
                        className="truncate text-[11px] text-amber-300 hover:underline"
                        title={item.target_url}
                      >
                        {item.target_url}
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-400">展示时间：</span>
                    <span>
                      {item.start_at
                        ? item.start_at.slice(0, 16).replace("T", " ")
                        : "不限"}
                      {"  ~  "}
                      {item.end_at
                        ? item.end_at.slice(0, 16).replace("T", " ")
                        : "不限"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400">排序：</span>
                    <span>{item.sort_order}</span>
                  </div>
                </div>

                <div className="mt-auto border-t border-zinc-800 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        item.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {item.is_active ? "停用" : "启用"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center rounded-lg bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="inline-flex items-center rounded-lg bg-zinc-900 px-2 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="删除精选推荐"
        description={
          deleteTarget && (
            <>
              <p className="mb-2">
                确定要删除精选推荐
                <span className="mx-1 font-medium text-white">
                  {deleteTarget.title || "未命名"}
                </span>
                吗？
              </p>
              <p className="text-xs text-zinc-500">此操作不可撤销，请谨慎操作。</p>
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
