import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: number;
  name: string;
  model?: string | null;
  slug: string;
  cover_image?: string | null;
  // 暂时放宽类型，以兼容 Supabase 返回的关联字段结构
  // 后续可以根据实际返回结构再精细化
  category?: any;
};

type CarouselItem = {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  mobile_image_url?: string | null;
  overlay_position?: "left" | "center" | "right" | null;
  link_url?: string | null;
  link_target?: string | null;
};

type HomeVideo = {
  id: number;
  title?: string | null;
  description?: string | null;
  video_url?: string | null;
  poster_url?: string | null;
  source_type?: "local" | "external" | null;
  external_embed_code?: string | null;
  is_active?: boolean | null;
};

async function getHotProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, model, slug, cover_image,
       category:categories(id, name, slug)`
    )
    .eq("is_hot", true)
    .eq("is_active", true)
    .order("sort_order")
    .limit(limit);

  if (error) {
    console.error("Failed to fetch hot products:", error.message);
    return [];
  }

  return data ?? [];
}

async function getCarouselItems(): Promise<CarouselItem[]> {
  type CarouselRow = {
    id: number;
    overlay_title?: string | null;
    overlay_subtitle?: string | null;
    image_url?: string | null;
    mobile_image_url?: string | null;
    overlay_position?: "left" | "center" | "right" | null;
    link_url?: string | null;
    link_target?: string | null;
    is_active?: boolean | null;
    start_at?: string | null;
    end_at?: string | null;
  };

  const { data, error } = await supabase
    .from("home_carousel")
    .select(
      "id, overlay_title, overlay_subtitle, image_url, mobile_image_url, overlay_position, link_url, link_target, is_active, start_at, end_at"
    )
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch carousel items:", error.message);
    return [];
  }

  const now = new Date();

  return ((data || []) as CarouselRow[])
    .filter((row) => {
      if (!row.is_active) return false;
      const startOk = !row.start_at || new Date(row.start_at) <= now;
      const endOk = !row.end_at || new Date(row.end_at) >= now;
      return startOk && endOk;
    })
    .map<CarouselItem>((row) => ({
      id: row.id,
      title: row.overlay_title,
      subtitle: row.overlay_subtitle,
      image_url: row.image_url,
      mobile_image_url: row.mobile_image_url,
      overlay_position: row.overlay_position ?? "center",
      link_url: row.link_url,
      link_target: row.link_target,
    }));
}

async function getPrimaryVideo(): Promise<HomeVideo | null> {
  const { data, error } = await supabase
    .from("home_videos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch home video:", error.message);
    return null;
  }

  return data ?? null;
}

export default async function Home() {
  const [carouselItems, primaryVideo, hotProducts] = await Promise.all([
    getCarouselItems(),
    getPrimaryVideo(),
    getHotProducts(8),
  ]);

  return (
    <div className="min-h-screen bg-[#050509]">
      {/* Hero Carousel */}
      <section className="relative h-[80vh] min-h-[480px] overflow-hidden border-b border-zinc-800/80 bg-black">
        {carouselItems.length > 0 ? (
          <div className="relative h-full w-full">
            {/* 先渲染第一张，后续如需再做自动轮播可以改成客户端组件 */}
            {(() => {
              const item = carouselItems[0];
              return (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url || ""}
                    alt={item.title || "AUNE"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-black/40 to-transparent" />
                  {(item.title || item.subtitle) && (
                    <div className="absolute bottom-24 left-0 right-0 px-4 sm:px-6 lg:px-8">
                      <div className="mx-auto max-w-7xl">
                        <h1 className="mb-4 text-3xl font-bold text-white sm:text-5xl md:text-6xl">
                          {item.title}
                        </h1>
                        {item.subtitle && (
                          <p className="max-w-xl text-sm text-zinc-300 sm:text-lg">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {item.link_url && (
                    <Link
                      href={item.link_url}
                      target={item.link_target || "_self"}
                      className="absolute inset-0"
                    />
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-900 via-black to-zinc-950">
            <div className="px-4 text-center">
              <h1 className="mb-4 text-4xl font-bold text-white sm:text-6xl">
                AUNE<span className="text-amber-500">.</span>
              </h1>
              <p className="mx-auto max-w-xl text-sm text-zinc-300 sm:text-lg">
                追求极致音质，感受纯粹音乐
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Home video */}
      {primaryVideo && primaryVideo.is_active && (
        <section className="relative bg-black">
          <div className="relative mx-auto h-[60vh] max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="absolute inset-0 overflow-hidden rounded-2xl border border-zinc-800/80">
              {primaryVideo.source_type === "external" && primaryVideo.external_embed_code ? (
                <div
                  className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{
                    __html: primaryVideo.external_embed_code,
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <video
                  src={primaryVideo.video_url || undefined}
                  poster={primaryVideo.poster_url || undefined}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050509] via-transparent to-black/40" />
            </div>

            {(primaryVideo.title || primaryVideo.description) && (
              <div className="relative z-10 flex h-full items-end pb-8">
                <div className="max-w-xl">
                  {primaryVideo.title && (
                    <h2 className="mb-2 text-2xl font-semibold text-white sm:text-3xl">
                      {primaryVideo.title}
                    </h2>
                  )}
                  {primaryVideo.description && (
                    <p className="text-sm text-zinc-300 sm:text-base">
                      {primaryVideo.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hot Products Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              热门产品
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
              精选人气产品，感受卓越音质
            </p>
          </div>

          {hotProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {hotProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-zinc-900">
                      {product.cover_image ? (
                        // 这里先用普通 img，后续可以改成 next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.cover_image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-4xl font-bold text-zinc-700">
                            AUNE
                          </span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="mb-4 ml-4 flex items-center gap-2 text-xs font-medium text-amber-400">
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

                      {/* HOT badge */}
                      <div className="absolute left-3 top-3 rounded bg-red-500 px-2 py-1 text-xs font-medium text-white">
                        HOT
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="text-sm font-medium text-white transition-colors group-hover:text-amber-400 sm:text-base">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                          {product.category.name}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* View all link */}
              <div className="mt-10 text-center">
                <Link
                  href="/products/all"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500 px-8 py-3 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500 hover:text-white"
                >
                  查看全部产品
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
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-zinc-500">
              暂无热门产品
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
