import { supabase } from "@/lib/supabase";
import { DownloadsClient, DownloadItem } from "./DownloadsClient";

async function getDownloads(): Promise<DownloadItem[]> {
  const { data, error } = await supabase
    .from("downloads")
    .select(
      `*,
       product:products(id, name, model)`
    )
    .eq("is_active", true)
    .order("download_category")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch downloads:", error.message);
    return [];
  }

  return (data || []) as DownloadItem[];
}

export default async function DownloadsPage() {
  const downloads = await getDownloads();

  return <DownloadsClient initialDownloads={downloads} />;
}

