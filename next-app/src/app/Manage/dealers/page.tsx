"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const dealerTypes = [
  { value: "offline", label: "线下体验店" },
  { value: "online", label: "线上授权店" },
] as const;

const platforms = ["天猫", "京东", "淘宝", "拼多多", "抖音", "得物", "其他"] as const;

const provinces = [
  "北京市",
  "天津市",
  "上海市",
  "重庆市",
  "河北省",
  "山西省",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "海南省",
  "四川省",
  "贵州省",
  "云南省",
  "陕西省",
  "甘肃省",
  "青海省",
  "台湾省",
  "内蒙古自治区",
  "广西壮族自治区",
  "西藏自治区",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "香港特别行政区",
  "澳门特别行政区",
] as const;

type Dealer = {
  id: number;
  dealer_type: "offline" | "online" | string;
  name: string;
  province: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  contact_person: string | null;
  platform: string | null;
  store_url: string | null;
  logo_url: string | null;
  cover_image: string | null;
  business_hours: string | null;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  is_featured: boolean;
};

function getTypeBadgeClass(type: string) {
  return type === "offline" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400";
}

function sanitizeFileName(fileName: string) {
  const ext = fileName.split(".").pop();
  const name = fileName.replace(/\.[^/.]+$/, "");
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
  return `${sanitized}.${ext}`;
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

export default function ManageDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Dealer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    dealer_type: "offline",
    name: "",
    province: "",
    city: "",
    address: "",
    phone: "",
    contact_person: "",
    platform: "",
    store_url: "",
    logo_url: "",
    cover_image: "",
    business_hours: "",
    description: "",
    sort_order: 0,
    is_active: true,
    is_featured: false,
  });

  async function loadDealers() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("dealers")
        .select("*")
        .order("dealer_type")
        .order("sort_order");
      if (error) throw error;
      setDealers((data || []) as Dealer[]);
    } catch (err: any) {
      setErrorMessage("加载失败: " + (err?.message || "未知错误"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDealers();
  }, []);

  const filteredDealers = useMemo(() => {
    if (filterType === "all") return dealers;
    return dealers.filter((d) => d.dealer_type === filterType);
  }, [dealers, filterType]);

  function openNewForm() {
    setEditingId(null);
    setForm({
      dealer_type: "offline",
      name: "",
      province: "",
      city: "",
      address: "",
      phone: "",
      contact_person: "",
      platform: "",
      store_url: "",
      logo_url: "",
      cover_image: "",
      business_hours: "",
      description: "",
      sort_order: dealers.length,
      is_active: true,
      is_featured: false,
    });
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditForm(dealer: Dealer) {
    setEditingId(dealer.id);
    setForm({
      dealer_type: (dealer.dealer_type as any) || "offline",
      name: dealer.name || "",
      province: dealer.province || "",
      city: dealer.city || "",
      address: dealer.address || "",
      phone: dealer.phone || "",
      contact_person: dealer.contact_person || "",
      platform: dealer.platform || "",
      store_url: dealer.store_url || "",
      logo_url: dealer.logo_url || "",
      cover_image: dealer.cover_image || "",
      business_hours: dealer.business_hours || "",
      description: dealer.description || "",
      sort_order: dealer.sort_order || 0,
      is_active: dealer.is_active,
      is_featured: dealer.is_featured,
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

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo_url" | "cover_image"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_IMAGE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_IMAGE) {
      setErrorMessage("图片大小不能超过 5MB");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const path = `dealers/${timestamp}_${sanitizedName}`;

      // Vue 端使用 STORAGE_BUCKETS.GENERAL
      const { error } = await supabase.storage
        .from("general")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("general")
        .getPublicUrl(path);

      setForm((prev) => ({ ...prev, [field]: urlData.publicUrl } as any));
    } catch (err: any) {
      setErrorMessage("上传失败: " + (err?.message || "未知错误"));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveDealer() {
    if (!form.name.trim()) {
      setErrorMessage("请输入经销商名称");
      return;
    }

    if (form.dealer_type === "offline") {
      if (!form.province || !form.city) {
        setErrorMessage("请选择省份和城市");
        return;
      }
    } else {
      if (!form.platform || !form.store_url) {
        setErrorMessage("请填写平台和店铺链接");
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        dealer_type: form.dealer_type,
        name: form.name,
        province: form.dealer_type === "offline" ? form.province : null,
        city: form.dealer_type === "offline" ? form.city : null,
        address: form.dealer_type === "offline" ? form.address || null : null,
        phone: form.phone || null,
        contact_person: form.contact_person || null,
        platform: form.dealer_type === "online" ? form.platform || null : null,
        store_url: form.dealer_type === "online" ? form.store_url || null : null,
        logo_url: form.logo_url || null,
        cover_image: form.cover_image || null,
        business_hours: form.business_hours || null,
        description: form.description || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        is_featured: form.is_featured,
      };

      if (editingId) {
        const { error } = await supabase
          .from("dealers")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setSuccessMessage("更新成功");
      } else {
        const { error } = await supabase.from("dealers").insert(payload);
        if (error) throw error;
        setSuccessMessage("创建成功");
      }

      await loadDealers();
      closeForm();
    } catch (err: any) {
      setErrorMessage("保存失败: " + (err?.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  }

  function deleteDealer(dealer: Dealer) {
    setDeleteTarget(dealer);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const urls = [deleteTarget.logo_url, deleteTarget.cover_image].filter(Boolean) as string[];

      const { error } = await supabase
        .from("dealers")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;

      try {
        if (urls.length) await deleteStorageFiles(urls);
      } catch (e) {
        console.warn("Failed to delete dealer files", e);
      }

      setSuccessMessage("删除成功");
      await loadDealers();
    } catch (err: any) {
      setErrorMessage("删除失败: " + (err?.message || "未知错误"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleActive(dealer: Dealer) {
    const newValue = !dealer.is_active;
    setDealers((prev) =>
      prev.map((d) => (d.id === dealer.id ? { ...d, is_active: newValue } : d))
    );

    const { error } = await supabase
      .from("dealers")
      .update({ is_active: newValue })
      .eq("id", dealer.id);

    if (error) {
      setDealers((prev) =>
        prev.map((d) =>
          d.id === dealer.id ? { ...d, is_active: !newValue } : d
        )
      );
    }
  }

  return (
    <div className="dealer-manager">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">经销商管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理线下体验店和线上授权店</p>
        </div>

        <button
          onClick={openNewForm}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v12m6-6H6"
            />
          </svg>
          添加经销商
        </button>
      </div>

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

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部类型</option>
          {dealerTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">加载中...</div>
        ) : filteredDealers.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">暂无经销商</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">类型</th>
                <th className="px-4 py-3 text-left font-medium">地区/平台</th>
                <th className="px-4 py-3 text-left font-medium">排序</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredDealers.map((dealer) => (
                <tr key={dealer.id} className="transition-colors hover:bg-[#181824]">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {dealer.logo_url ? (
                        <img
                          src={dealer.logo_url}
                          alt={dealer.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-zinc-900" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{dealer.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">ID: {dealer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getTypeBadgeClass(
                        dealer.dealer_type
                      )}`}
                    >
                      {dealer.dealer_type === "offline" ? "线下" : "线上"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">
                    {dealer.dealer_type === "offline"
                      ? `${dealer.province || ""} ${dealer.city || ""}`.trim() || "-"
                      : dealer.platform || "-"}
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{dealer.sort_order ?? 0}</td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(dealer)}
                      className={`rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                        dealer.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {dealer.is_active ? "启用" : "禁用"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {dealer.store_url && (
                        <a
                          href={dealer.store_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-white"
                          title="打开链接"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => openEditForm(dealer)}
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
                        onClick={() => deleteDealer(dealer)}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b12] shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                {editingId ? "编辑经销商" : "添加经销商"}
              </h2>
              <button
                onClick={closeForm}
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
                  <label className="mb-1 block text-sm text-zinc-200">类型</label>
                  <select
                    value={form.dealer_type}
                    onChange={(e) => setForm((p) => ({ ...p, dealer_type: e.target.value as any }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {dealerTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-zinc-200">名称 *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {form.dealer_type === "offline" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-200">省份 *</label>
                    <select
                      value={form.province}
                      onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    >
                      <option value="">请选择</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-200">城市 *</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-zinc-200">地址</label>
                    <input
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-200">平台 *</label>
                    <select
                      value={form.platform}
                      onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    >
                      <option value="">请选择</option>
                      {platforms.map((pl) => (
                        <option key={pl} value={pl}>
                          {pl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-200">店铺链接 *</label>
                    <input
                      value={form.store_url}
                      onChange={(e) => setForm((p) => ({ ...p, store_url: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-200">Logo</label>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="logo" className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-zinc-900" />
                    )}
                    <label className="cursor-pointer rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white">
                      {isUploading ? "上传中..." : form.logo_url ? "更换" : "上传"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleImageUpload(e, "logo_url")}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-200">封面图</label>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.cover_image ? (
                      <img src={form.cover_image} alt="cover" className="h-14 w-20 rounded-lg object-cover" />
                    ) : (
                      <div className="h-14 w-20 rounded-lg bg-zinc-900" />
                    )}
                    <label className="cursor-pointer rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white">
                      {isUploading ? "上传中..." : form.cover_image ? "更换" : "上传"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleImageUpload(e, "cover_image")}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-200">联系电话</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-200">联系人</label>
                  <input
                    value={form.contact_person}
                    onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-200">营业时间</label>
                  <input
                    value={form.business_hours}
                    onChange={(e) => setForm((p) => ({ ...p, business_hours: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    placeholder="如：10:00-19:00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-zinc-200">排序值</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-200">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="h-28 w-full rounded-lg border border-zinc-700 bg-[#11111a] px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  启用
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-600 bg-[#11111a] text-amber-500"
                    checked={form.is_featured}
                    onChange={(e) => setForm((p) => ({ ...p, is_featured: e.target.checked }))}
                  />
                  推荐
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
                onClick={saveDealer}
                disabled={isSaving || isUploading}
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "上传中..." : isSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

            <ConfirmDialog
        open={!!deleteTarget}
        title="删除经销商"
        description={
          deleteTarget && (
            <>
              <p className="mb-2">
                确定要删除经销商
                <span className="mx-1 font-medium text-white">{deleteTarget.name}</span>
                吗？
              </p>
              <p className="text-xs text-zinc-500">
                此操作不可撤销，将同时删除关联的 LOGO 和封面图片文件。
              </p>
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
