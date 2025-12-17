import { supabase } from "@/lib/supabase";
import { SupportClient, FaqItem, SupportConfig } from "./SupportClient";

async function getSupportData(): Promise<{
  faqs: FaqItem[];
  config: SupportConfig;
}> {
  const [{ data: faqData, error }, { data: configData }] = await Promise.all([
    supabase
      .from("faqs")
      .select("*")
      .eq("is_active", true)
      .order("sort_order") as any,
    supabase
      .from("site_config")
      .select("hotline, qq_service_link")
      .single<{ hotline?: string | null; qq_service_link?: string | null }>(),
  ]);

  if (error) {
    console.error("Failed to fetch FAQs:", error.message);
  }

  const hotline = configData?.hotline || "027-85420526";
  const qq_service_link =
    configData?.qq_service_link ||
    "https://wpa.qq.com/msgrd?v=3&uin=123456789&site=qq&menu=yes";

  return {
    faqs: (faqData || []) as FaqItem[],
    config: {
      hotline,
      qq_service_link,
    },
  };
}

export default async function SupportPage() {
  const { faqs, config } = await getSupportData();

  return <SupportClient faqs={faqs} config={config} />;
}

