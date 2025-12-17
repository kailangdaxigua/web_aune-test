import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

type News = {
  id: number;
  title: string;
  slug: string;
  content_html?: string | null;
  cover_image?: string | null;
  content_banner_url?: string | null;
  news_type?: "corporate" | "review" | "exhibition" | null;
  product_series?: "desktop" | "portable" | null;
  published_at?: string | null;
  meta_title?: string | null;
};

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getNewsTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    corporate: "企业动态",
    review: "产品测评",
    exhibition: "线下展示",
  };
  return (type && labels[type]) || "";
}

function getSeriesLabel(series?: string | null) {
  const labels: Record<string, string> = {
    desktop: "桌面系列",
    portable: "便携系列",
  };
  return (series && labels[series]) || "";
}

async function getNewsBySlug(slug: string) {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single<News>();

  if (error || !data) {
    return null;
  }

  // 增加浏览量（忽略错误，不影响主流程）
  try {
    await supabase.rpc("increment_news_view_count", { news_id: data.id });
  } catch (e) {
    console.warn("Failed to increment news view count", e);
  }

  return data;
}

type MetadataProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const resolved = await params;
  const slug = resolved.slug;

  const news = await getNewsBySlug(slug);
  if (!news) {
    return { title: "新闻未找到 - AUNE Audio" };
  }

  const title = news.meta_title || news.title;

  // 从 HTML 内容中提取一段简短摘要
  let description = "AUNE Audio 新闻资讯";
  if (news.content_html) {
    const text = news.content_html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      description = text.slice(0, 100) + (text.length > 100 ? "…" : "");
    }
  }

  const ogImage = news.content_banner_url || news.cover_image || null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "article",
    },
  };
}

export default async function NewsDetailPage(props: PageProps) {
  const params = await props.params;
  const slug = params.slug;

  const news = await getNewsBySlug(slug);

  if (!news) {
    notFound();
  }

  const bannerImage = news.content_banner_url || news.cover_image;
  const newsTypeLabel = getNewsTypeLabel(news.news_type);
  const seriesLabel = getSeriesLabel(news.product_series);

  const backHref = news.news_type
    ? `/news?type=${news.news_type}`
    : "/news";

  return (
    <div className="news-detail-page min-h-screen bg-[#050509] pt-20 text-white">
      {/* Hero / banner */}
      <section className="relative">
        {bannerImage ? (
          <div className="relative h-[40vh] overflow-hidden md:h-[50vh] lg:h-[60vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerImage}
              alt={news.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050509] via-[#050509]/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 pb-10">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center gap-2">
                  {newsTypeLabel && (
                    <span className="rounded-lg bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
                      {newsTypeLabel}
                    </span>
                  )}
                  {seriesLabel && (
                    <span className="rounded-lg bg-amber-500/85 px-3 py-1 text-sm text-white">
                      {seriesLabel}
                    </span>
                  )}
                </div>
                <time className="text-sm text-amber-400">
                  {formatDate(news.published_at)}
                </time>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
                  {news.title}
                </h1>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-16">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
              <div className="mb-4 flex items-center justify-center gap-2">
                {newsTypeLabel && (
                  <span className="rounded-lg bg-zinc-800 px-3 py-1 text-sm text-zinc-200">
                    {newsTypeLabel}
                  </span>
                )}
                {seriesLabel && (
                  <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-sm text-amber-400">
                    {seriesLabel}
                  </span>
                )}
              </div>
              <time className="text-sm text-amber-400">
                {formatDate(news.published_at)}
              </time>
              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
                {news.title}
              </h1>
            </div>
          </div>
        )}
      </section>

      {/* Content */}
      <section className="bg-[#050509] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div
            className="prose prose-lg prose-invert max-w-none text-zinc-200"
            dangerouslySetInnerHTML={{
              __html: news.content_html || "",
            }}
          />

          <div className="mt-12 border-t border-zinc-800 pt-8">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-400"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              返回新闻列表
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

