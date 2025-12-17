import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NewsItem = {
  id: number;
  title: string;
  slug: string;
  cover_image?: string | null;
  content_banner_url?: string | null;
  news_type?: "corporate" | "review" | "exhibition" | null;
  product_series?: "desktop" | "portable" | null;
  excerpt?: string | null;
  published_at?: string | null;
};

type SearchParams = {
  type?: string;
  series?: string;
};

type PageProps = {
  searchParams:
    | Promise<SearchParams>
    | SearchParams;
};

const MAIN_TABS = [
  { value: "corporate", label: "企业动态" },
  { value: "review", label: "产品测评", hasSubTabs: true },
  { value: "exhibition", label: "线下展示" },
] as const;

const SUB_TABS = [
  { value: "all", label: "全部" },
  { value: "desktop", label: "桌面系列" },
  { value: "portable", label: "便携系列" },
] as const;

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
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

async function getNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch news:", error.message);
    return [];
  }

  return (data || []) as NewsItem[];
}

export default async function NewsListPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const initialType =
    searchParams.type === "corporate" ||
    searchParams.type === "review" ||
    searchParams.type === "exhibition"
      ? searchParams.type
      : "corporate";

  const initialSeries =
    searchParams.series === "desktop" ||
    searchParams.series === "portable"
      ? searchParams.series
      : "all";

  const allNews = await getNews();

  // 在服务端按当前 URL 参数做一次过滤，保证首屏数据正确
  let filtered = allNews;

  if (initialType) {
    filtered = filtered.filter((n) => n.news_type === initialType);
  }

  if (initialType === "review" && initialSeries !== "all") {
    filtered = filtered.filter((n) => n.product_series === initialSeries);
  }

  const hasSubTabs = initialType === "review";

  return (
    <div className="news-page min-h-screen bg-[#050509] pt-20 text-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
              新闻资讯
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-400 sm:text-lg">
              了解 AUNE 最新动态
            </p>
          </div>
        </div>
      </section>

      {/* Main tabs */}
      <section className="sticky top-20 z-30 border-y border-zinc-800/60 bg-[#11111a]/80 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {MAIN_TABS.map((tab) => {
              const active = initialType === tab.value;
              const href =
                tab.value === "corporate"
                  ? "/news?type=corporate"
                  : tab.value === "review"
                  ? `/news?type=review&${
                      initialSeries && initialSeries !== "all"
                        ? `series=${initialSeries}`
                        : ""
                    }`
                  : "/news?type=exhibition";

              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-colors sm:text-base ${
                    active
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                      : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sub tabs for review */}
      {hasSubTabs && (
        <section className="border-b border-zinc-900/60 bg-[#050509] py-3">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUB_TABS.map((sub) => {
                const active = initialSeries === sub.value;
                const href =
                  sub.value === "all"
                    ? "/news?type=review"
                    : `/news?type=review&series=${sub.value}`;

                return (
                  <Link
                    key={sub.value}
                    href={href}
                    className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors sm:text-sm ${
                      active
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
                    }`}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* News grid */}
      <section className="bg-[#050509] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
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
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-medium text-white sm:text-lg">
                暂无相关内容
              </h3>
              <p className="text-sm text-zinc-500 sm:text-base">敬请期待</p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((news, index) => (
                <Link
                  key={news.id}
                  href={`/news/${news.slug}`}
                  className="group cursor-pointer"
                >
                  <article className="h-full">
                    <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-xl bg-zinc-900">
                      {news.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={news.cover_image}
                          alt={news.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg
                            className="h-12 w-12 text-zinc-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                          </svg>
                        </div>
                      )}

                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        {news.news_type && (
                          <span className="rounded-lg bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                            {getNewsTypeLabel(news.news_type)}
                          </span>
                        )}
                        {news.product_series && (
                          <span className="rounded-lg bg-amber-500/85 px-2.5 py-1 text-xs text-white">
                            {getSeriesLabel(news.product_series)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <time className="text-xs text-amber-400 sm:text-sm">
                        {formatDate(news.published_at)}
                      </time>
                      <h3 className="mt-2 mb-2 line-clamp-2 text-base font-medium text-white transition-colors group-hover:text-amber-400 sm:text-lg">
                        {news.title}
                      </h3>
                      {news.excerpt && (
                        <p className="line-clamp-2 text-sm text-zinc-400">
                          {news.excerpt}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

