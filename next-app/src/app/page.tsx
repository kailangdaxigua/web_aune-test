import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HeroCarouselClient from "@/components/home/HeroCarouselClient";

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
      <section className="relative h-[calc(100vh)] min-h-[640px] overflow-hidden border-b border-zinc-800/80 bg-black">
        {carouselItems.length > 0 ? (
          <HeroCarouselClient items={carouselItems} />
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

      <main className=" sm:px-6 lg:px-8">
        {/* Hot Products Section */}
        <section className=" md:py-3">

          {hotProducts.length > 0 ? (
            <>
              <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-2">
                {hotProducts.slice(0, 4).map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="relative h-full min-h-[260px] overflow-hidden bg-zinc-900">
                      {product.cover_image ? (
                        // 这里先用普通 img，后续可以改成 next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.cover_image}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-4xl font-bold text-zinc-700">
                            AUNE
                          </span>
                        </div>
                      )}

                      {/* Text overlay */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          {product.category && (
                            <p className="mb-2 text-xs font-medium tracking-[0.3em] text-zinc-300 sm:text-sm">
                              {product.category.name}
                            </p>
                          )}
                          <h3 className="text-xl font-semibold text-white transition-colors sm:text-2xl">
                            {product.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
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
