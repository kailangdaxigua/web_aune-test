/**
 * Supabase Client Configuration
 * Aune Audio CMS
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Storage bucket names
export const STORAGE_BUCKETS = {
  PRODUCTS: 'products',
  DOWNLOADS: 'downloads',
  NEWS: 'news',
  GENERAL: 'general',
  VIDEOS: 'videos',
  CAROUSEL: 'carousel',
  PAGES: 'pages',
}

// File size limits (in bytes)
// 注意：前端限制应与 Supabase Storage Bucket 设置保持一致
// 若要调整，请同时修改 Supabase Dashboard > Storage > [bucket] > Settings
export const FILE_LIMITS = {
  IMAGE: 5 * 1024 * 1024,       // 5MB
  VIDEO: 1024 * 1024 * 1024,    // 1GB (首页视频，需在 Supabase 设置对应 bucket)
  DOWNLOAD: 100 * 1024 * 1024,  // 100MB
  CAROUSEL: 10 * 1024 * 1024,   // 10MB
}

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  DOWNLOAD: [
    'application/zip',
    'application/x-rar-compressed',
    'application/pdf',
    'application/octet-stream',
    '.bin', '.zip', '.rar', '.pdf', '.exe', '.dmg'
  ],
}

/**
 * Upload file to Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @param {File} file - File to upload
 * @returns {Promise<{data: object, error: object}>}
 */
export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
  
  if (error) {
    console.error('Upload error:', error)
    return { data: null, error }
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return { 
    data: { 
      ...data, 
      publicUrl: urlData.publicUrl 
    }, 
    error: null 
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<{data: object, error: object}>}
 */
export async function deleteFile(bucket, path) {
  return await supabase.storage
    .from(bucket)
    .remove([path])
}

/**
 * Get public URL for a file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {string}
 */
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  return data.publicUrl
}

