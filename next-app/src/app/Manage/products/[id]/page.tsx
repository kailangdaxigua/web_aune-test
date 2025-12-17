"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  model: string;
  slug: string | null;
  category_id: number | null;
  cover_image: string | null;
  is_hot: boolean | null;
  is_new: boolean | null;
  is_active: boolean;
  sort_order: number | null;
  summary: string | null;
};

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    model: "",
    slug: "",
    category_id: "",
    cover_image: "",
    is_hot: false,
    is_new: false,
    is_active: true,
    sort_order: 0,
    summary: "",
  });

  useEffect(() => {
    if (!id || Number.isNaN(id)) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [categoriesRes, productRes] = await Promise.all([
          supabase
            .from("categories")
            .select("id, name")
            .order("sort_order"),
          supabase
            .from("products")
            .select(
              "id, name, model, slug, category_id, cover_image, is_hot, is_new, is_active, sort_order, summary"
            )
            .eq("id", id)
            .single(),
        ]);

        if (cancelled) return;

        if (!categoriesRes.error && categoriesRes.data) {
          setCategories(categoriesRes.data as Category[]);
        }

        if (!productRes.error && productRes.data) {
          const p = productRes.data as Product;
          setProduct(p);
          setForm({
            name: p.name || "",
            model: p.model || "",
            slug: p.slug || "",
            category_id: p.category_id ? String(p.category_id) : "",
            cover_image: p.cover_image || "",
            is_hot: !!p.is_hot,
            is_new: !!p.is_new,
            is_active: p.is_active,
            sort_order: p.sort_order ?? 0,
            summary: p.summary || "",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setError(null);
    setSaving(true);

    try {
      if (!form.name.trim()) {
        setError("请填写产品名称");
        return;
      }
      if (!form.model.trim()) {
        setError("请填写型号");
        return;
      }

      const payload: any = {
        name: form.name.trim(),
        model: form.model.trim(),
        slug: form.slug.trim() || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        cover_image: form.cover_image || null,
        is_hot: form.is_hot,
        is_new: form.is_new,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
        summary: form.summary || null,
      };

      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", product.id);

      if (error) {
        console.error(error);
        setError(error.message || "保存失败");
        return;
      }

      router.push("/Manage/products");
    } finally {
      setSaving(false);
    }
  }

  if (!id || Number.isNaN(id)) {
    return (
      <div className="text-sm text-red-400">无效的产品 ID</div>
    );
  }

  if (loading && !product) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        加载中...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        未找到该产品
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">编辑产品</h1>
          <p className="mt-1 text-sm text-zinc-400">
            修改产品基础信息并保存
          </p>
        </div>
        <Link
          href="/Manage/products"
          className="text-sm text-zinc-400 transition-colors hover:text-white"
        >
          返回列表
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-zinc-800 bg-[#11111a] p-6"
      >
        {error && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              产品名称
            </label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              型号
            </label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              value={form.model}
              onChange={(e) => updateField("model", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              URL Slug（选填）
            </label>
            <input
              className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              分类
            </label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              value={form.category_id}
              onChange={(e) => updateField("category_id", e.target.value)}
            >
              <option value="">未分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            封面图地址
          </label>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
            value={form.cover_image}
            onChange={(e) => updateField("cover_image", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              排序值
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
              value={form.sort_order}
              onChange={(e) => updateField("sort_order", Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                checked={form.is_hot}
                onChange={(e) => updateField("is_hot", e.target.checked)}
              />
              HOT
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                checked={form.is_new}
                onChange={(e) => updateField("is_new", e.target.checked)}
              />
              NEW
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-600 bg-[#0b0b12] text-amber-500"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
              />
              已上架
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            简要描述
          </label>
          <textarea
            className="h-24 w-full rounded-lg border border-zinc-700 bg-[#0b0b12] px-3 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
            value={form.summary}
            onChange={(e) => updateField("summary", e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/Manage/products"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            返回
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-amber-500/40 transition-colors hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}
