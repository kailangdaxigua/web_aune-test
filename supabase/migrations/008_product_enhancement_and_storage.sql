-- ============================================
-- 008 产品详情增强 + Storage 配置
-- 
-- 1. products 表新增字段
-- 2. site_config 全局设置确认
-- 3. Storage bucket 大小限制调整
-- ============================================

-- ============================================
-- 1. 扩展 products 表结构
-- ============================================

-- 1.1 购买链接（单个直接跳转链接，比 buy_links JSON 更简洁）
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS buy_link TEXT;

COMMENT ON COLUMN products.buy_link IS '立即购买按钮的跳转链接';

-- 1.2 产品功能 Tab 头图
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS features_header_image TEXT;

COMMENT ON COLUMN products.features_header_image IS '产品功能 Tab 的顶部 Banner 图片 URL';

-- 1.3 技术规格 Tab 头图
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS specs_header_image TEXT;

COMMENT ON COLUMN products.specs_header_image IS '技术规格 Tab 的顶部 Banner 图片 URL';

-- 1.4 沉浸式图文模块 JSONB 数据（DJI 风格）
-- 结构示例:
-- [
--   {
--     "id": "uuid",
--     "type": "immersive",           -- immersive | standard
--     "image_url": "...",
--     "title": "标题",
--     "subtitle": "副标题",
--     "description": "正文描述",
--     "text_align": "left",          -- left | center | right
--     "text_color": "white",         -- white | dark
--     "animation": "fade-up",        -- fade-up | fade-left | fade-right | parallax
--     "overlay_opacity": 0.3         -- 背景遮罩透明度
--   }
-- ]
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS content_modules JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN products.content_modules IS '沉浸式图文模块配置（JSONB），支持 DJI 风格的滚动视差效果';

-- 1.5 产品系列标识（用于新闻测评关联）
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS product_series VARCHAR(50);

COMMENT ON COLUMN products.product_series IS '产品系列：desktop=桌面系列, portable=便携系列';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_products_series ON products(product_series) WHERE product_series IS NOT NULL;

-- ============================================
-- 2. 确保 site_config 有必要字段
-- ============================================

-- 在线客服链接
ALTER TABLE site_config 
    ADD COLUMN IF NOT EXISTS online_service_url TEXT DEFAULT 'https://wpa.qq.com/msgrd?v=3&uin=123456789&site=qq&menu=yes';

COMMENT ON COLUMN site_config.online_service_url IS '全站通用的在线客服跳转链接';

-- 如果已存在 qq_service_link 但没有 online_service_url，则同步
UPDATE site_config 
SET online_service_url = qq_service_link 
WHERE online_service_url IS NULL AND qq_service_link IS NOT NULL;

-- ============================================
-- 3. Storage Bucket 配置（重要！）
-- ============================================

-- 更新 videos 存储桶的大小限制为 1GB
-- 注意：此 SQL 仅在 Supabase 支持时生效，否则需要手动在 Dashboard 设置
UPDATE storage.buckets 
SET file_size_limit = 1073741824  -- 1GB = 1024 * 1024 * 1024 bytes
WHERE id = 'videos';

-- 如果上述 UPDATE 不生效，请按以下步骤手动配置：
-- 
-- 方法 1: Supabase Dashboard
-- 1. 登录 Supabase Dashboard
-- 2. 进入 Storage > videos bucket
-- 3. 点击 Settings / 设置
-- 4. 修改 "File size limit" 为 1073741824 (1GB) 或 524288000 (500MB)
-- 5. 保存设置
--
-- 方法 2: Supabase CLI (本地开发)
-- supabase storage buckets update videos --file-size-limit 1073741824

-- ============================================
-- 4. 扩展 product_media_blocks 表
-- ============================================

-- 添加更多布局和动效选项
ALTER TABLE product_media_blocks
    ADD COLUMN IF NOT EXISTS layout_type VARCHAR(50) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS subtitle TEXT,
    ADD COLUMN IF NOT EXISTS text_color VARCHAR(20) DEFAULT 'white',
    ADD COLUMN IF NOT EXISTS overlay_opacity DECIMAL(3,2) DEFAULT 0.3,
    ADD COLUMN IF NOT EXISTS animation_type VARCHAR(50) DEFAULT 'fade-up',
    ADD COLUMN IF NOT EXISTS enable_parallax BOOLEAN DEFAULT false;

COMMENT ON COLUMN product_media_blocks.layout_type IS '布局类型：standard=标准并排, immersive=沉浸式覆盖, fullwidth=全宽';
COMMENT ON COLUMN product_media_blocks.title IS '模块标题';
COMMENT ON COLUMN product_media_blocks.subtitle IS '模块副标题';
COMMENT ON COLUMN product_media_blocks.text_color IS '文字颜色：white=浅色, dark=深色';
COMMENT ON COLUMN product_media_blocks.overlay_opacity IS '背景遮罩透明度 (0-1)';
COMMENT ON COLUMN product_media_blocks.animation_type IS '动画类型：fade-up, fade-left, fade-right, scale-in, parallax';
COMMENT ON COLUMN product_media_blocks.enable_parallax IS '是否启用滚动视差效果';

-- ============================================
-- 5. 创建辅助函数：获取产品沉浸式模块
-- ============================================
CREATE OR REPLACE FUNCTION get_product_immersive_modules(p_product_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT content_modules INTO result
    FROM products
    WHERE id = p_product_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 版本标记
-- ============================================
COMMENT ON SCHEMA public IS 'Product Enhancement & Storage Config - v1.0.8';

