import { supabase } from "@/lib/supabase";
import HeaderClient from "./HeaderClient";

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type NavProduct = {
  id: number;
  name: string;
  slug: string;
  cover_image?: string | null;
  nav_thumbnail?: string | null;
};

async function getCategoriesWithProducts() {
  const { data: categoriesData, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch categories:", error.message);
    return [] as { category: Category; products: NavProduct[] }[];
  }

  const categories = categoriesData || [];

  if (!categories.length) return [];

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, slug, cover_image, nav_thumbnail, category_id")
    .eq("is_active", true)
    .order("sort_order");

  const byCategory: Record<number, NavProduct[]> = {};
  (productsData || []).forEach((p: any) => {
    const cid = p.category_id as number | null;
    if (!cid) return;
    if (!byCategory[cid]) byCategory[cid] = [];
    if (byCategory[cid].length >= 6) return;
    byCategory[cid].push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      cover_image: p.cover_image,
      nav_thumbnail: p.nav_thumbnail,
    });
  });

  return categories.map((c) => ({
    category: c,
    products: byCategory[c.id] || [],
  }));
}

export default async function Header() {
  const categoryGroups = await getCategoriesWithProducts();

  return (
    <HeaderClient categoryGroups={categoryGroups} />
  );
}
