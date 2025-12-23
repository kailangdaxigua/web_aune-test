import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  model?: string | null;
  slug: string;
  cover_image?: string | null;
  short_description?: string | null;
  is_hot?: boolean;
  is_new?: boolean;
};

type Category = {
  id: number;
  name: string;
  description?: string | null;
  slug: string;
};

type PageProps = {
  params: Promise<{ category: string }> | { category: string };
};

async function getCategoryAndProducts(categorySlug: string) {
  let activeCategory: Category | null = null;

  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (categorySlug && categorySlug !== "all") {
    const { data: catData } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", categorySlug)
      .single<Category>();

    activeCategory = catData ?? null;

    if (catData) {
      productQuery = productQuery.eq("category_id", catData.id);
    }
  }

  const { data: products, error } = await productQuery;

  if (error) {
    console.error("Failed to fetch products:", error.message);
  }

  return {
    category: activeCategory,
    products: (products || []) as Product[],
  };
}

export default async function ProductListPage(props: PageProps) {
  const params = await props.params;
  const categorySlug = params.category;

  const { category, products } = await getCategoryAndProducts(categorySlug);

  return (
    <div className="product-list-page pt-15 bg-[#050509] text-white min-h-screen">
      {/* Hero section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-3xl text-slate-950 font-bold sm:text-4xl md:text-5xl">
              {category?.name || "全部产品"}
            </h1>
            {category?.description && (
              <p className="mx-auto max-w-2xl text-base text-zinc-400 sm:text-lg">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Products grid */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Empty state */}
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
                <svg
                  className="h-10 w-10 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-medium text-white sm:text-lg">
                暂无产品
              </h3>
              <p className="text-sm text-zinc-500 sm:text-base">
                该分类下暂无产品
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative mb-4 aspect-4/3 overflow-hidden rounded-2xl bg-zinc-900">
                      {product.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.cover_image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            className="h-20 w-20 text-zinc-700"
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

                      {/* Badges */}
                      <div className="absolute left-3 top-3 flex gap-2">
                        {product.is_hot && (
                          <span className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                            HOT
                          </span>
                        )}
                        {product.is_new && (
                          <span className="rounded bg-green-500 px-2 py-1 text-xs font-medium text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="mb-6 ml-6 flex items-center gap-2 text-sm font-medium text-white">
                          查看详情
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
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-1 text-lg font-medium text-white transition-colors group-hover:text-white sm:text-xl">
                        {product.name}
                      </h3>
                      {product.model && (
                        <p className="mb-2 text-sm text-zinc-400">
                          {product.model}
                        </p>
                      )}
                      {product.short_description && (
                        <p className="line-clamp-2 text-sm text-zinc-500">
                          {product.short_description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Result count */}
              <div className="mt-12 text-center text-sm text-zinc-500">
                共 {products.length} 个产品
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

