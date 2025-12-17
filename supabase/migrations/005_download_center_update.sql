-- ============================================
-- 005 下载中心重构
-- 1. 添加 original_filename 字段保存原始文件名
-- 2. 添加 download_category 枚举和字段
-- ============================================

-- 创建下载分类枚举
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'download_category_enum') THEN
        CREATE TYPE download_category_enum AS ENUM ('desktop', 'portable', 'history');
    END IF;
END $$;

-- 添加新字段到 downloads 表
ALTER TABLE downloads 
    ADD COLUMN IF NOT EXISTS original_filename TEXT,
    ADD COLUMN IF NOT EXISTS download_category download_category_enum DEFAULT 'desktop';

-- 添加注释
COMMENT ON COLUMN downloads.original_filename IS '上传时的原始文件名，用于下载时恢复文件名';
COMMENT ON COLUMN downloads.download_category IS '下载分类：desktop(桌面系列)、portable(便携系列)、history(历史产品)';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_downloads_category ON downloads(download_category);

-- ============================================
-- 更新 videos 存储桶以支持图片格式（用于封面图上传）
-- ============================================
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif'
]::text[]
WHERE id = 'videos';

-- ============================================
-- 创建原始文件名下载函数（可选，用于生成带原始文件名的下载URL）
-- ============================================
CREATE OR REPLACE FUNCTION get_download_url_with_filename(
    p_file_url TEXT,
    p_original_filename TEXT
) RETURNS TEXT AS $$
BEGIN
    -- 如果原始文件名存在，附加到URL作为下载参数
    IF p_original_filename IS NOT NULL AND p_original_filename != '' THEN
        IF POSITION('?' IN p_file_url) > 0 THEN
            RETURN p_file_url || '&download=' || p_original_filename;
        ELSE
            RETURN p_file_url || '?download=' || p_original_filename;
        END IF;
    END IF;
    RETURN p_file_url;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 版本标记
-- ============================================
COMMENT ON SCHEMA public IS 'Download Center Update - v1.0.5';

