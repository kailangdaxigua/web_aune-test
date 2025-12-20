"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
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

  async function remove(item: FeaturedItem) {
    if (!window.confirm(`确定要删除「${item.title || "未命名"}」吗？`)) return;

    const { error } = await supabase
      .from("home_featured")
      .delete()
      .eq("id", item.id);

    if (!error) {
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">首页精选推荐</h1>
          <p className="mt-1 text-sm text-zinc-400">
            配置首页白色区域的精选图片（最多建议 4 张，按排序展示），前台会按 2×2 栅格自适应显示。
          </p>
        </div>

        <button
          onClick={startCreate}
          className="rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
        >
          新建推荐
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-zinc-800 bg-[#11111a] p-6"
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
              <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-[#0b0b12] px-4 text-center text-xs text-zinc-400 sm:h-40 sm:text-sm">
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
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 sm:h-40">
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
              <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-[#0b0b12] px-4 text-center text-xs text-zinc-400 sm:h-32 sm:text-sm">
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
              <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 sm:h-32">
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
                  setForm((f) => ({ ...f, link_target: e.target.value as "_self" | "_blank" }))
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

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {loading ? (
          <div className="p-6 text-center text-sm text-zinc-400">加载中...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-400">暂无推荐</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">预览</th>
                <th className="px-4 py-3 text-left font-medium">标题</th>
                <th className="px-4 py-3 text-left font-medium">链接</th>
                <th className="px-4 py-3 text-left font-medium">排序</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-[#181824]">
                  <td className="px-4 py-3">
                    <div className="h-16 w-28 overflow-hidden rounded-lg bg-zinc-900">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title || "preview"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                          无图
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">
                    <div className="space-y-1">
                      <div>{item.title || "(未命名)"}</div>
                      {item.subtitle && (
                        <div className="text-xs text-zinc-400">{item.subtitle}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-300">
                    {item.target_url || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-200">
                    {item.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        item.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-zinc-700/50 text-zinc-300"
                      }`}
                    >
                      {item.is_active ? "已启用" : "未启用"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-700/60 hover:text-white"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => remove(item)}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
