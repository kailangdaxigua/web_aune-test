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

type HomeFeaturedItem = {
  id: number;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  mobile_image_url?: string | null;
  target_url?: string | null;
  is_external?: boolean | null;
  link_target?: string | null;
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

async function getFeaturedItems(): Promise<HomeFeaturedItem[]> {
  const { data, error } = await supabase
    .from("home_featured")
    .select(
      "id, title, subtitle, image_url, mobile_image_url, target_url, is_external, link_target"
    )
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch home featured items:", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image_url: row.image_url,
    mobile_image_url: row.mobile_image_url,
    target_url: row.target_url,
    is_external: row.is_external,
    link_target: row.link_target,
  }));
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
      // 仅当 is_active 显式为 false 时才过滤掉；
      // 老数据中 is_active 可能为 NULL，这里视为启用以兼容旧内容。
      if (row.is_active === false) return false;
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
  const [carouselItems, primaryVideo, featuredItems] = await Promise.all([
    getCarouselItems(),
    getPrimaryVideo(),
    getFeaturedItems(),
  ]);

  return (
    <div className="min-h-screen bg-[#050509]">
      {/* Hero Carousel */}
      <section className="relative w-screen h-[80vh] sm:h-[80vh] md:h-[80vh] lg:h-[80vh] xl:h-[80vh] 2xl:h-[87vh] overflow-hidden border-b border-zinc-800/80 bg-black">
        {carouselItems.length > 0 ? (
          <HeroCarouselClient items={carouselItems} />
        ) : (
          <div className="flex h-full items-center justify-center bg-linear-to-br from-zinc-900 via-black to-zinc-950">
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
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#050509] via-transparent to-black/40" />
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

      <main className="bg-white">
        {/* Home Featured Section */}
        <section className="bg-white py-4 md:py-2">

          {featuredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2">
                {featuredItems.map((item) => {
                  const href = item.target_url || "#";
                  const target =
                    item.link_target || (item.is_external ? "_blank" : "_self");
                  const content = (
                    <div className="relative h-[60vh] sm:h-[60vh] md:h-[65vh] lg:h-[70vh] xl:h-[75vh] 2xl:h-[80vh] overflow-hidden bg-white">
                      {item.image_url ? (
                        // 这里先用普通 img，后续可以改成 next/image
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title || "featured"}
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
                          {item.subtitle && (
                            <p className="mb-2 text-xs font-medium tracking-[0.3em] text-zinc-500 sm:text-sm">
                              {item.subtitle}
                            </p>
                          )}
                          {item.title && (
                            <h3 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
                              {item.title}
                            </h3>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return item.target_url ? (
                    <Link
                      key={item.id}
                      href={href}
                      target={target}
                      className="group cursor-pointer"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id} className="group cursor-default">
                      {content}
                    </div>
                  );
                })}
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
