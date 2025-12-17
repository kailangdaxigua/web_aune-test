"use client";

import { useMemo, useState } from "react";

export type FaqItem = {
  id: number;
  question: string;
  answer_html?: string | null;
  category?: string | null;
};

export type SupportConfig = {
  hotline: string;
  qq_service_link: string;
};

const TABS = [
  { value: "self-service" as const, label: "自助服务" },
  { value: "faq" as const, label: "热门问题" },
];

const SERVICE_ENTRIES = [
  {
    title: "在线客服",
    description: "专业客服为您解答",
    color: "blue" as const,
    action: "qq" as const,
  },
  {
    title: "相关下载",
    description: "固件、驱动、说明书",
    color: "green" as const,
    action: "link" as const,
    link: "/downloads",
  },
  {
    title: "售后政策",
    description: "保修与退换货说明",
    color: "purple" as const,
    action: "link" as const,
    link: "/page/after-sales",
  },
];

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    hover: "hover:border-blue-500/50",
  },
  green: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    hover: "hover:border-green-500/50",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    hover: "hover:border-purple-500/50",
  },
} as const;

export function SupportClient({
  faqs,
  config,
}: {
  faqs: FaqItem[];
  config: SupportConfig;
}) {
  const [activeTab, setActiveTab] = useState<"self-service" | "faq">(
    "self-service"
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter((faq) => {
      return (
        faq.question.toLowerCase().includes(q) ||
        (faq.answer_html && faq.answer_html.toLowerCase().includes(q))
      );
    });
  }, [faqs, searchQuery]);

  function openQQService() {
    window.open(config.qq_service_link, "_blank");
  }

  function handleServiceClick(entry: (typeof SERVICE_ENTRIES)[number]) {
    if (entry.action === "qq") {
      openQQService();
    }
  }

  function formatHotlineDisplay(value: string) {
    return value;
  }

  return (
    <div className="support-page min-h-screen bg-[#050509] pt-20 text-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
              服务支持
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-400 sm:text-lg">
              专业团队为您提供全方位的技术支持与售后服务
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="sticky top-20 z-30 border-y border-zinc-800/60 bg-[#11111a]/80 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition-colors sm:text-base ${
                  activeTab === tab.value
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {activeTab === "self-service" ? (
            <>
              {/* Self service cards */}
              <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICE_ENTRIES.map((entry) => {
                  const color = COLOR_MAP[entry.color];
                  const isLink = entry.action === "link" && entry.link;

                  const content = (
                    <div
                      className={`group flex items-start gap-4 rounded-2xl border p-6 text-left transition-all ${
                        color.border
                      } ${color.hover}`}
                    >
                      <div
                        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${color.bg}`}
                      >
                        <svg
                          className={`h-7 w-7 ${color.text}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {/* 简化：使用通用图标，不逐一还原 path */}
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="mb-1 text-lg font-semibold text-white transition-colors group-hover:text-amber-400">
                          {entry.title}
                        </h3>
                        <p className="text-sm text-zinc-400">
                          {entry.description}
                        </p>
                      </div>
                      <svg
                        className="mt-1 h-5 w-5 flex-shrink-0 text-zinc-500 transition-all group-hover:translate-x-1 group-hover:text-amber-400"
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
                    </div>
                  );

                  if (isLink && entry.link) {
                    return (
                      <a key={entry.title} href={entry.link}>
                        {content}
                      </a>
                    );
                  }

                  return (
                    <button
                      key={entry.title}
                      type="button"
                      onClick={() => handleServiceClick(entry)}
                      className="text-left"
                    >
                      {content}
                    </button>
                  );
                })}
              </div>

              {/* Hotline */}
              <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-600/20 to-amber-500/10 p-8 text-center">
                <p className="mb-2 text-sm text-zinc-300">服务热线</p>
                <a
                  href={`tel:${config.hotline}`}
                  className="text-3xl font-bold text-amber-400 transition-colors hover:text-amber-300 md:text-4xl"
                >
                  {formatHotlineDisplay(config.hotline)}
                </a>
                <p className="mt-2 text-xs text-zinc-400 md:text-sm">
                  工作日 9:00 - 18:00
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Search */}
              <div className="mb-8">
                <div className="relative mx-auto max-w-xl">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    type="text"
                    placeholder="搜索问题..."
                    className="w-full rounded-2xl border border-zinc-700 bg-[#11111a] py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/60"
                  />
                  <svg
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-[#11111a] py-16 text-center">
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
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-medium text-white sm:text-lg">
                    未找到相关问题
                  </h3>
                  <p className="text-sm text-zinc-500 sm:text-base">
                    请尝试其他关键词或联系客服
                  </p>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-4">
                  {filteredFaqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#11111a]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFaq((prev) =>
                            prev === faq.id ? null : faq.id
                          )
                        }
                        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[#181824]"
                      >
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                            expandedFaq === faq.id
                              ? "bg-amber-500/20"
                              : "bg-zinc-900"
                          }`}
                        >
                          <svg
                            className={`h-5 w-5 transition-colors ${
                              expandedFaq === faq.id
                                ? "text-amber-400"
                                : "text-zinc-400"
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3
                            className={`text-sm font-medium transition-colors sm:text-base ${
                              expandedFaq === faq.id
                                ? "text-amber-400"
                                : "text-white"
                            }`}
                          >
                            {faq.question}
                          </h3>
                          {faq.category && (
                            <span className="mt-1 text-xs text-zinc-500">
                              {faq.category}
                            </span>
                          )}
                        </div>
                        <svg
                          className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform ${
                            expandedFaq === faq.id ? "rotate-180" : ""
                          }`}
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

                      {expandedFaq === faq.id && (
                        <div className="border-t border-zinc-800 bg-[#0b0b11]">
                          <div className="px-5 pb-5 pt-0">
                            <div className="faq-answer prose prose-sm prose-invert max-w-none text-zinc-200">
                              <div
                                dangerouslySetInnerHTML={{
                                  __html: faq.answer_html || "",
                                }}
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4 text-xs text-zinc-400 sm:text-sm">
                              <span>这个答案对您有帮助吗？</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-green-500/20 hover:text-green-400 sm:text-sm"
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
                                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                    />
                                  </svg>
                                  有帮助
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-red-500/20 hover:text-red-400 sm:text-sm"
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
                                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                                    />
                                  </svg>
                                  没帮助
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Bottom contact online service */}
                  <div className="mt-8 border-t border-zinc-800 pt-6 text-center text-sm text-zinc-400">
                    <p className="mb-4">没有找到您想要的答案？</p>
                    <button
                      type="button"
                      onClick={openQQService}
                      className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition-colors hover:text-amber-300"
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      联系在线客服
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
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
