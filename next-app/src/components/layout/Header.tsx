import Link from "next/link";
import { supabase } from "@/lib/supabase";

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type NavProduct = {
  id: number;
  name: string;
  slug: string;
  cover_image?: string | null;
  nav_thumbnail?: string | null;
};

const FUNCTION_LINKS: { label: string; path?: string; url?: string; external?: boolean }[] = [
  { label: "服务支持", path: "/support" },
  { label: "荣誉墙", path: "/page/honors" },
  { label: "经销商", path: "/dealers" },
  { label: "官方店铺", url: "#", external: true },
];

async function getCategoriesWithProducts() {
  const { data: categoriesData, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch categories:", error.message);
    return [] as { category: Category; products: NavProduct[] }[];
  }

  const categories = categoriesData || [];

  if (!categories.length) return [];

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, slug, cover_image, nav_thumbnail, category_id")
    .eq("is_active", true)
    .order("sort_order");

  const byCategory: Record<number, NavProduct[]> = {};
  (productsData || []).forEach((p: any) => {
    const cid = p.category_id as number | null;
    if (!cid) return;
    if (!byCategory[cid]) byCategory[cid] = [];
    if (byCategory[cid].length >= 6) return;
    byCategory[cid].push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      cover_image: p.cover_image,
      nav_thumbnail: p.nav_thumbnail,
    });
  });

  return categories.map((c) => ({
    category: c,
    products: byCategory[c.id] || [],
  }));
}

export default async function Header() {
  const categoryGroups = await getCategoriesWithProducts();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-zinc-800/80 bg-[#050509]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/aune.png"
              alt="AUNE Logo"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {categoryGroups.map(({ category, products }) => (
              <div key={category.id} className="group relative">
                <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:text-white">
                  <span>{category.name}</span>
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
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div className="invisible absolute left-0 top-full z-40 mt-2 w-80 translate-y-2 rounded-xl border border-zinc-800 bg-[#050509]/95 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {/* View all */}
                  <Link
                    href={`/products/${category.slug}`}
                    className="flex w-full items-center justify-between border-b border-zinc-800 px-4 py-3 text-left text-sm font-medium text-amber-400 transition-colors hover:bg-zinc-900/60"
                  >
                    <span>查看全部 {category.name}</span>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>

                  {/* Products preview */}
                  <div className="max-h-80 space-y-1 overflow-y-auto py-2">
                    {products.length ? (
                      products.map((product) => (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-900/60 hover:text-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {product.nav_thumbnail || product.cover_image ? (
                            <img
                              src={product.nav_thumbnail || product.cover_image || ""}
                              alt={product.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                              AUNE
                            </div>
                          )}
                          <span>{product.name}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-xs text-zinc-500">暂无产品</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {FUNCTION_LINKS.map((link) =>
              link.external && link.url ? (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.path || "#"}
                  className="px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Mobile hamburger (simple version, no dropdowns) */}
          <div className="flex items-center gap-3 lg:hidden">
            <Link
              href="/products/all"
              className="text-sm font-medium text-zinc-200 hover:text-white"
            >
              产品
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
