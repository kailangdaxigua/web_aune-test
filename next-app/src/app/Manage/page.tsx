import { supabase } from "@/lib/supabase";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { data: visits },
    { data: recentVisits },
    { count: productsCount },
    { count: downloadsCount },
    { data: topDownloads },
  ] = await Promise.all([
    supabase
      .from("visit_logs")
      .select("ip_address", { count: "exact" })
      .gte("visited_at", today.toISOString()),
    supabase
      .from("visit_logs")
      .select(
        "page_url, device_type, browser, os, ip_address, visited_at"
      )
      .order("visited_at", { ascending: false })
      .limit(20),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("downloads")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("downloads")
      .select("title, download_count")
      .eq("is_active", true)
      .order("download_count", { ascending: false })
      .limit(5),
  ]);

  const todayPV = visits?.length ?? 0;
  const todayUV = new Set((visits || []).map((v) => v.ip_address)).size;

  return {
    todayPV,
    todayUV,
    totalProducts: productsCount ?? 0,
    totalDownloads: downloadsCount ?? 0,
    recentVisits: (recentVisits || []) as {
      page_url: string;
      device_type?: string | null;
      browser?: string | null;
      os?: string | null;
      ip_address?: string | null;
      visited_at?: string | null;
    }[],
    topDownloads: (topDownloads || []) as {
      title: string;
      download_count?: number | null;
    }[],
  };
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDeviceLabel(type?: string | null) {
  if (!type) return "desktop";
  if (type === "mobile") return "mobile";
  if (type === "tablet") return "tablet";
  return "desktop";
}

export default async function ManageHomePage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
          <p className="mb-1 text-sm text-zinc-400">今日浏览量 (PV)</p>
          <p className="text-3xl font-bold text-white">
            {data.todayPV.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
          <p className="mb-1 text-sm text-zinc-400">今日访客数 (UV)</p>
          <p className="text-3xl font-bold text-white">
            {data.todayUV.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
          <p className="mb-1 text-sm text-zinc-400">在线产品数</p>
          <p className="text-3xl font-bold text-white">{data.totalProducts}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-[#11111a] p-6">
          <p className="mb-1 text-sm text-zinc-400">下载资源数</p>
          <p className="text-3xl font-bold text-white">{data.totalDownloads}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-[#11111a]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">最近访问</h2>
            <span className="text-xs text-zinc-500">最近 20 条</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#161621] text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                  <th className="px-4 py-3 text-left font-medium">页面</th>
                  <th className="px-4 py-3 text-left font-medium">设备</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.recentVisits.map((v, idx) => (
                  <tr key={idx} className="hover:bg-[#181824]">
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {formatTime(v.visited_at)}
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      <span className="block max-w-[320px] truncate" title={v.page_url}>
                        {v.page_url}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {(v.browser || "-") + " / " + (v.os || "-")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {getDeviceLabel(v.device_type)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {v.ip_address || "-"}
                    </td>
                  </tr>
                ))}

                {data.recentVisits.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-zinc-500"
                    >
                      暂无访问记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-[#11111a]">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">热门下载</h2>
            <span className="text-xs text-zinc-500">Top 5</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#161621] text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">资源</th>
                  <th className="px-4 py-3 text-right font-medium">下载次数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.topDownloads.map((d, idx) => (
                  <tr key={idx} className="hover:bg-[#181824]">
                    <td className="px-4 py-3 text-zinc-200">
                      <span className="block max-w-[420px] truncate" title={d.title}>
                        {d.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {(d.download_count || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {data.topDownloads.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-10 text-center text-sm text-zinc-500"
                    >
                      暂无下载数据
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
