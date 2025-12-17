"use client";

import { useEffect, useMemo, useState } from "react";
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
  slug: string;
  category_id: number | null;
  cover_image?: string | null;
  is_hot?: boolean | null;
  is_new?: boolean | null;
  is_active: boolean;
  category?: Category | null;
};

type ProductRow = Omit<Product, "category"> & {
  category: { id: number; name: string }[] | null;
};

export default function ProductsManagePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          supabase
            .from("products")
            .select(
              `id, name, model, slug, category_id, cover_image, is_hot, is_new, is_active,
               category:categories(id, name)`
            )
            .order("sort_order"),
          supabase
            .from("categories")
            .select("id, name")
            .order("sort_order"),
        ]);

        if (cancelled) return;

        if (!productsRes.error && productsRes.data) {
          const rows = productsRes.data as ProductRow[];
          const mapped: Product[] = rows.map((row) => ({
            ...row,
            category: row.category && row.category.length > 0 ? row.category[0] : null,
          }));
          setProducts(mapped);
        }
        if (!categoriesRes.error && categoriesRes.data) {
          setCategories(categoriesRes.data as Category[]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filterCategory !== "all") {
      const cid = Number(filterCategory);
      result = result.filter((p) => p.category_id === cid);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => {
        const name = p.name?.toLowerCase?.() || "";
        const model = p.model?.toLowerCase?.() || "";
        return name.includes(q) || model.includes(q);
      });
    }

    return result;
  }, [products, filterCategory, searchQuery]);

  async function toggleActive(product: Product) {
    const newValue = !product.is_active;
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              is_active: newValue,
            }
          : p
      )
    );

    const { error } = await supabase
      .from("products")
      .update({ is_active: newValue })
      .eq("id", product.id);

    if (error) {
      // revert on error
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? {
                ...p,
                is_active: !newValue,
              }
            : p
        )
      );
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`确定要删除产品 "${product.name}" 吗？`)) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    }
  }

  return (
    <div className="product-manager">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">产品管理</h1>
          <p className="mt-1 text-sm text-zinc-400">管理所有产品信息</p>
        </div>

        <Link
          href="/Manage/products/new"
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
              d="M12 6v12m6-6H6"
            />
          </svg>
          添加产品
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="搜索产品..."
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-[#11111a] px-4 py-2 text-sm text-white outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="all">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#11111a]">
        {loading ? (
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
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#161621] text-xs text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-left font-medium">产品</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">标签</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="transition-colors hover:bg-[#181824]"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {product.cover_image ? (
                        <img
                          src={product.cover_image}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
                          <svg
                            className="h-6 w-6 text-zinc-500"
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
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {product.name}
                        </p>
                        <p className="text-xs text-zinc-400">{product.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-zinc-300">
                    {product.category?.name || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      {product.is_hot && (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          HOT
                        </span>
                      )}
                      {product.is_new && (
                        <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                          NEW
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleActive(product)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        product.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {product.is_active ? "已上架" : "已下架"}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/Manage/products/${product.id}`}
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
                      </Link>
                      <button
                        onClick={() => deleteProduct(product)}
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

              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-zinc-500"
                  >
                    暂无产品
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
