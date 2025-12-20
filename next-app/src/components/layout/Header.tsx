"use client";

import { useEffect, useState } from "react";
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

export default function Header() {
  const [categoryGroups, setCategoryGroups] = useState<
    { category: Category; products: NavProduct[] }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: categoriesData, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order");

      if (error) {
        console.error("Failed to fetch categories:", error.message);
        return;
      }

      const categories = categoriesData || [];
      if (!categories.length) {
        if (!cancelled) setCategoryGroups([]);
        return;
      }

      const { data: productsData } = await supabase
        .from("products")
        .select(
          "id, name, slug, cover_image, nav_thumbnail, category_id"
        )
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

      if (!cancelled) {
        setCategoryGroups(
          categories.map((c) => ({
            category: c,
            products: byCategory[c.id] || [],
          }))
        );
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return <HeaderClient categoryGroups={categoryGroups} />;
}
