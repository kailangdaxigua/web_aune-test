"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, X, Power, Pencil, Trash2 } from "lucide-react";

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

  async function moveItem(item: FeaturedItem, direction: "up" | "down") {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((it) => it.id === item.id);
    if (index === -1) return;

    const offset = direction === "up" ? -1 : 1;
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const other = sorted[targetIndex];
    const currentOrder = item.sort_order;
    const otherOrder = other.sort_order;

    // 本地先交换顺序，提升响应速度
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.id === item.id) return { ...it, sort_order: otherOrder };
          if (it.id === other.id) return { ...it, sort_order: currentOrder };
          return it;
        })
        .sort((a, b) => a.sort_order - b.sort_order)
    );

    // 落库
    const { error } = await supabase
      .from("home_featured")
      .upsert([
        { id: item.id, sort_order: otherOrder },
        { id: other.id, sort_order: currentOrder },
      ]);

    if (error) {
      // 还原并重新加载
      await load();
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
    <div className="space-y-6 text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">首页精选推荐</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            配置首页白色区域的精选图片。
          </p>
        </div>

        <Button
          onClick={startCreate}
          className="px-4 py-2 text-sm font-medium bg-white text-black shadow-lg shadow-primary/20 transition-colors hover:bg-gradient-to-r hover:from-white hover:to-zinc-200"
        >
          新建推荐
        </Button>
      </div>

      {/* Form modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">
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
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/20"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[82vh] space-y-4 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    标题（可选）
                  </label>
                  <Input
                    value={form.title ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    副标题（可选）
                  </label>
                  <Input
                    value={form.subtitle ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              {/* Time range */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    开始时间（可选）
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    结束时间（可选）
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              {/* Desktop image uploader + preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  推荐位图片
                </label>
                <div className="grid gap-3 md:grid-cols-2 items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e, "desktop")}
                      />
                      {uploadingField === "desktop" ? "上传中..." : "点击选择图片"}
                    </label>
                  </div>
                  <div className="mt-2 w-full md:mt-0 md:w-full md:max-w-xs">
                    <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:h-32">
                      {form.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url}
                          alt="desktop preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">暂无图片</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile image uploader + preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  移动端图片
                </label>
                <div className="grid gap-3 md:grid-cols-2 items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-black/40 px-3 py-1.5 text-xs text-zinc-100 hover:border-zinc-300 hover:text-white">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e, "mobile")}
                      />
                      {uploadingField === "mobile" ? "上传中..." : "点击选择图片"}
                    </label>
                  </div>
                  <div className="mt-2 w-full md:mt-0 md:w-full md:max-w-[180px]">
                    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:h-28">
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

              <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,0.9fr)_minmax(0,1.6fr)]">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    链接地址（必填）
                  </label>
                  <Input
                    value={form.link_url ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
                    placeholder="/product/x8 或 https://..."
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-2 md:max-w-[120px]">
                  <label className="block text-sm font-medium text-foreground">
                    排序
                  </label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                    }
                    className="w-full border-border bg-background text-sm text-foreground focus-visible:ring-primary/40"
                  />
                </div>

                <div className="space-y-1 md:pl-2">
                  <label className="block text-sm font-medium text-foreground">
                    链接选项
                  </label>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.is_external}
                        onCheckedChange={(checked) =>
                          setForm((f) => ({
                            ...f,
                            is_external: Boolean(checked),
                            link_target: checked ? "_blank" : f.link_target,
                          }))
                        }
                        className="h-4 w-4 border-border"
                      />
                      <span className="whitespace-nowrap">外部链接（新窗口打开）</span>
                    </label>
                    <Select
                      value={form.link_target ?? "_self"}
                      onValueChange={(value: "_self" | "_blank") =>
                        setForm((f) => ({ ...f, link_target: value }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-8 w-[120px] border-border bg-background px-3 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_self">当前窗口</SelectItem>
                        <SelectItem value="_blank">新窗口</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Switch
                    checked={!!form.is_active}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, is_active: Boolean(checked) }))
                    }
                  />
                  <span>启用（显示在首页）</span>
                </div>
                {error && (
                  <div className="max-w-xs text-xs text-destructive">{error}</div>
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium shadow-md shadow-primary/10 disabled:opacity-60"
                >
                  {saving ? "保存中..." : editingId == null ? "创建" : "保存修改"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List as cards */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          暂无推荐，先在上方表单创建一条。
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-primary/60"
            >
              {/* 图片预览 + 悬浮操作 */}
              <div className="relative">
                <div className="h-40 w-full overflow-hidden bg-muted">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title || "preview"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      无图片
                    </div>
                  )}
                </div>

                {/* 顶部状态 + 序号 */}
                <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${item.is_active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {item.is_active ? "已启用" : "未启用"}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-xs font-medium text-foreground">
                    {index + 1}
                  </span>
                </div>

                {/* 悬浮操作层 */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:bg-background/70 group-hover:opacity-100">
                  <div className="flex items-center gap-4 text-xs">
                    {/* 启用 / 停用 */}
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      title={item.is_active ? "停用此推荐" : "启用此推荐"}
                      className="inline-flex min-w-[96px] items-center justify-center gap-2.5 rounded-full bg-background/90 px-4 py-2 text-[11px] font-medium text-foreground hover:bg-background"
                    >
                      <Power
                        className={`h-6 w-6 ${item.is_active ? "text-muted-foreground" : "text-emerald-400"
                          }`}
                      />
                      <span>{item.is_active ? "停用" : "启用"}</span>
                    </button>

                    {/* 编辑 */}
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      title="编辑推荐"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-background"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>

                    {/* 删除 */}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      title="删除推荐"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 文案 & 信息 + 底部操作 */}
              <div className="flex flex-1 flex-col border-t border-border bg-card px-4 pb-3 pt-3 text-xs text-muted-foreground">

                <p className="truncate text-sm font-semibold text-foreground" title={item.title || undefined}>
                  {item.title || "(未命名推荐)"}
                </p>
                {item.subtitle && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</p>
                )}
                <div className="mt-2 mb-2 space-y-1 text-[11px] text-muted-foreground">
                  {item.target_url && (
                    <div className="flex items-center gap-1">
                      <span className="text-foreground">链接：</span>
                      <a
                        href={item.target_url}
                        target={item.link_target || "_self"}
                        rel="noreferrer"
                        className="truncate text-[11px] text-foreground hover:underline"
                        title={item.target_url}
                      >
                        {item.target_url}
                      </a>
                    </div>
                  )}
                  <div>
                    <span className="text-foreground">展示时间：</span>
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
                    <span className="text-foreground">排序：</span>
                    <span className="text-foreground">{item.sort_order}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              删除精选推荐
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                确定要删除精选推荐
                <span className="mx-1 font-medium text-foreground">
                  {deleteTarget.title || "未命名"}
                </span>
                吗？
              </p>
              <p className="text-xs text-muted-foreground">
                此操作不可撤销，请谨慎操作。
              </p>
            </div>
          )}
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => {
                if (!deleting) setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
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
