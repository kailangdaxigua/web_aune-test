import { createClient } from "@supabase/supabase-js";

// 使用 NEXT_PUBLIC_ 前缀，保证在客户端也可用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 在构建/运行时提示（不会中断应用）
  console.warn(
    "Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const STORAGE_BUCKETS = {
  PRODUCTS: "products",
  DOWNLOADS: "downloads",
  NEWS: "news",
  GENERAL: "general",
  VIDEOS: "videos",
  CAROUSEL: "carousel",
  PAGES: "pages",
} as const;

export const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,
  VIDEO: 1024 * 1024 * 1024,
  DOWNLOAD: 100 * 1024 * 1024,
  CAROUSEL: 10 * 1024 * 1024,
} as const;

export const ALLOWED_FILE_TYPES = {
  IMAGE: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  VIDEO: ["video/mp4", "video/webm", "video/quicktime"],
  DOWNLOAD: [
    "application/zip",
    "application/x-rar-compressed",
    "application/pdf",
    "application/octet-stream",
    ".bin",
    ".zip",
    ".rar",
    ".pdf",
    ".exe",
    ".dmg",
  ],
} as const;
