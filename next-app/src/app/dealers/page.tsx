import { supabase } from "@/lib/supabase";
import { DealersClient, DealerItem } from "./DealersClient";

type SiteConfig = {
  dealer_apply_link?: string | null;
};

async function getDealersAndConfig(): Promise<{
  dealers: DealerItem[];
  dealerApplyLink: string;
}> {
  const [{ data: dealersData, error }, { data: configData }] = await Promise.all([
    supabase
      .from("dealers")
      .select("*")
      .eq("is_active", true)
      .order("sort_order") as any,
    supabase.from("site_config").select("dealer_apply_link").single<SiteConfig>(),
  ]);

  if (error) {
    console.error("Failed to fetch dealers:", error.message);
  }

  const dealerApplyLink =
    configData?.dealer_apply_link || "/page/dealer-apply";

  return {
    dealers: (dealersData || []) as DealerItem[],
    dealerApplyLink,
  };
}

export default async function DealersPage() {
  const { dealers, dealerApplyLink } = await getDealersAndConfig();

  return (
    <DealersClient dealers={dealers} dealerApplyLink={dealerApplyLink} />
  );
}

