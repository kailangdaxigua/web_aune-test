"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type DealerItem = {
  id: number;
  name: string;
  dealer_type: "offline" | "online" | string;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  business_hours?: string | null;
  is_featured?: boolean | null;
  description?: string | null;
  platform?: string | null;
  store_url?: string | null;
};

const TABS = [
  {
    value: "offline" as const,
    label: "视听体验店",
  },
  {
    value: "online" as const,
    label: "授权网络店",
  },
];

export function DealersClient({
  dealers,
  dealerApplyLink,
}: {
  dealers: DealerItem[];
  dealerApplyLink: string;
}) {
  const [activeTab, setActiveTab] = useState<"offline" | "online">("offline");
  const [selectedProvince, setSelectedProvince] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const provinces = useMemo(() => {
    const offline = dealers.filter((d) => d.dealer_type === "offline");
    const unique = Array.from(
      new Set(offline.map((d) => d.province).filter(Boolean) as string[])
    );
    return [
      { value: "all", label: "全部省份" },
      ...unique.map((p) => ({ value: p, label: p })),
    ];
  }, [dealers]);

  const cities = useMemo(() => {
    if (selectedProvince === "all") {
      return [{ value: "all", label: "全部城市" }];
    }
    const offline = dealers.filter(
      (d) => d.dealer_type === "offline" && d.province === selectedProvince
    );
    const unique = Array.from(
      new Set(offline.map((d) => d.city).filter(Boolean) as string[])
    );
    return [
      { value: "all", label: "全部城市" },
      ...unique.map((c) => ({ value: c, label: c })),
    ];
  }, [dealers, selectedProvince]);

  const offlineDealers = useMemo(() => {
    let result = dealers.filter((d) => d.dealer_type === "offline");
    if (selectedProvince !== "all") {
      result = result.filter((d) => d.province === selectedProvince);
    }
    if (selectedCity !== "all") {
      result = result.filter((d) => d.city === selectedCity);
    }
    return result;
  }, [dealers, selectedProvince, selectedCity]);

  const onlineDealers = useMemo(
    () => dealers.filter((d) => d.dealer_type === "online"),
    [dealers]
  );

  return (
    <div className="dealers-page min-h-screen bg-[#050509] pt-20 text-zinc-900">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0b0b11] to-[#050509] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
              经销商网络
            </h1>
            <p className="mx-auto max-w-2xl text-base text-zinc-400 sm:text-lg">
              遍布全国的专业视听体验店与授权网络店
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="sticky top-20 z-30 border-y border-zinc-200 bg-white py-4 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-medium transition-colors sm:text-base ${
                  activeTab === tab.value
                    ? "border-zinc-900 bg-zinc-100 text-zinc-900"
                    : "border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {activeTab === "offline" ? (
            <>
              {/* Filters */}
              <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <span className="text-sm text-zinc-700">筛选地区：</span>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedCity("all");
                  }}
                  className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/60"
                >
                  {provinces.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  disabled={selectedProvince === "all"}
                  className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/60"
                >
                  {cities.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <span className="ml-auto text-xs text-zinc-500 sm:text-sm">
                  共 {offlineDealers.length} 家体验店
                </span>
              </div>

              {offlineDealers.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
                    <svg
                      className="h-10 w-10 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-base font-medium text-zinc-900 sm:text-lg">
                    该地区暂无体验店
                  </h3>
                  <p className="text-sm text-zinc-500 sm:text-base">
                    请选择其他省市或联系我们了解详情
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {offlineDealers.map((dealer) => (
                    <div
                      key={dealer.id}
                      className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-900 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <h3 className="text-lg font-medium text-zinc-900 transition-colors group-hover:text-zinc-950">
                          {dealer.name}
                        </h3>
                        {dealer.is_featured && (
                          <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                            推荐
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 text-sm text-zinc-700">
                        <div className="flex items-start gap-2">
                          <svg
                            className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span>
                            {dealer.province} {dealer.city}
                          </span>
                        </div>

                        {dealer.address && (
                          <div className="flex items-start gap-2">
                            <svg
                              className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                              />
                            </svg>
                            <span>{dealer.address}</span>
                          </div>
                        )}

                        {dealer.phone && (
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 flex-shrink-0 text-zinc-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            <a
                              href={`tel:${dealer.phone}`}
                              className="hover:text-zinc-900"
                            >
                              {dealer.phone}
                            </a>
                          </div>
                        )}

                        {dealer.business_hours && (
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 flex-shrink-0 text-zinc-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>{dealer.business_hours}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {onlineDealers.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                    <svg
                      className="h-8 w-8 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 sm:text-base">
                    暂无授权网络店
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                  <table className="w-full text-sm text-zinc-900">
                    <thead className="bg-zinc-50 text-xs text-zinc-500">
                      <tr>
                        <th className="px-6 py-4 text-left font-medium">店铺名称</th>
                        <th className="px-6 py-4 text-left font-medium">授权平台</th>
                        <th className="px-6 py-4 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {onlineDealers.map((dealer) => (
                        <tr
                          key={dealer.id}
                          className="transition-colors hover:bg-zinc-50"
                        >
                          <td className="px-6 py-4 align-top">
                            <div>
                              <p className="font-medium text-zinc-900">
                                {dealer.name}
                              </p>
                              {dealer.description && (
                                <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                                  {dealer.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-top text-zinc-700">
                            {dealer.platform}
                          </td>
                          <td className="px-6 py-4 text-right align-top">
                            {dealer.store_url && (
                              <a
                                href={dealer.store_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 sm:text-sm"
                              >
                                前往店铺
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
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Dealer apply CTA */}
      <Link
        href={dealerApplyLink}
        className="fixed bottom-8 right-8 z-40"
      >
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-4 text-sm font-medium text-white shadow-2xl shadow-amber-500/40 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 004 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-xs text-white/80">诚邀您的加入</p>
            <p className="text-sm font-semibold">申请成为经销商</p>
          </div>
          <svg
            className="h-5 w-5 transition-transform group-hover:translate-x-1"
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
      </Link>
    </div>
  );
}
