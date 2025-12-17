-- ============================================
-- Aune Audio CMS Database Schema
-- Supabase PostgreSQL + RLS Policies
-- ============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. 枚举类型定义
-- ============================================

-- 文字位置枚举
CREATE TYPE text_position_type AS ENUM ('left', 'center', 'right');

-- 文件类型枚举
CREATE TYPE file_type_enum AS ENUM ('firmware', 'manual', 'driver', 'software', 'other');

-- ============================================
-- 2. site_config 站点全局配置表（单行记录）
-- ============================================
CREATE TABLE site_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 导航栏结构 (JSONB)
    nav_structure JSONB DEFAULT '[
        {"label": "耳机与耳放", "category_slug": "headphones"},
        {"label": "音响", "category_slug": "speakers"},
        {"label": "音频解码器", "category_slug": "dac"},
        {"label": "时钟", "category_slug": "clock"},
        {"label": "配件", "category_slug": "accessories"}
    ]'::jsonb,
    
    -- 页脚结构 (JSONB)
    footer_structure JSONB DEFAULT '{
        "columns": [
            {
                "title": "购买渠道",
                "links": [
                    {"label": "天猫旗舰店", "url": "#", "external": true},
                    {"label": "试听体验店", "url": "/dealers", "external": false},
                    {"label": "授权网络店", "url": "/authorized-stores", "external": false}
                ]
            },
            {
                "title": "关于aune",
                "links": [
                    {"label": "了解aune", "url": "/about", "external": false},
                    {"label": "加入我们", "url": "/careers", "external": false},
                    {"label": "联系我们", "url": "/contact", "external": false},
                    {"label": "新闻资讯", "url": "/news", "external": false}
                ]
            },
            {
                "title": "服务支持",
                "links": [
                    {"label": "自助服务", "url": "/support/self-service", "external": false},
                    {"label": "热门问题", "url": "/support/faq", "external": false},
                    {"label": "相关下载", "url": "/downloads", "external": false},
                    {"label": "售后政策", "url": "/support/warranty", "external": false}
                ]
            },
            {
                "title": "官方平台",
                "links": [
                    {"label": "新浪微博", "url": "#", "external": true},
                    {"label": "官方微信", "url": "#", "external": true},
                    {"label": "百度贴吧", "url": "#", "external": true},
                    {"label": "QQ群", "url": "#", "external": true}
                ]
            }
        ],
        "hotline": "027-85420526"
    }'::jsonb,
    
    -- 首页轮播图配置 (JSONB)
    carousel_images JSONB DEFAULT '[]'::jsonb,
    
    -- 首页视频配置
    home_video_url TEXT,
    home_video_enabled BOOLEAN DEFAULT false,
    
    -- SEO 配置
    site_title VARCHAR(255) DEFAULT 'Aune Audio - 高端音频设备',
    site_description TEXT DEFAULT '专业高端音频设备制造商',
    site_keywords TEXT DEFAULT '音频,耳机,耳放,解码器,音响',
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 确保只有一行配置记录
CREATE UNIQUE INDEX site_config_singleton ON site_config ((true));

-- 插入默认配置
INSERT INTO site_config (id) VALUES (uuid_generate_v4());

-- ============================================
-- 3. categories 产品分类表
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- 插入默认分类
INSERT INTO categories (name, slug, sort_order) VALUES
    ('耳机与耳放', 'headphones', 1),
    ('音响', 'speakers', 2),
    ('音频解码器', 'dac', 3),
    ('时钟', 'clock', 4),
    ('配件', 'accessories', 5);

-- ============================================
-- 4. products 产品表
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- 基本信息
    name VARCHAR(255) NOT NULL,
    model VARCHAR(100) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    cover_image TEXT,
    
    -- 产品标记
    is_hot BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- 媒体
    video_url TEXT,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    
    -- 富文本内容
    short_description TEXT,
    specs_html TEXT,
    features_html TEXT,
    review_html TEXT,
    
    -- 购买链接
    buy_links JSONB DEFAULT '[]'::jsonb,
    
    -- 排序和元数据
    sort_order INTEGER DEFAULT 0,
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_hot ON products(is_hot) WHERE is_hot = true;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = true;

-- ============================================
-- 5. product_media_blocks 详情页图文动画模块表
-- ============================================
CREATE TABLE product_media_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- 媒体内容
    image_url TEXT NOT NULL,
    text_content TEXT,
    text_position text_position_type DEFAULT 'center',
    
    -- 动画配置
    animation_type VARCHAR(50) DEFAULT 'fade-up',
    animation_delay INTEGER DEFAULT 0,
    
    -- 排序
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_media_blocks_product ON product_media_blocks(product_id);
CREATE INDEX idx_media_blocks_sort ON product_media_blocks(product_id, sort_order);

-- ============================================
-- 6. downloads 下载中心表
-- ============================================
CREATE TABLE downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本信息
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT DEFAULT 0,
    file_type file_type_enum DEFAULT 'other',
    file_extension VARCHAR(20),
    
    -- 详细描述（富文本，用于更新日志/安装说明）
    description_html TEXT,
    
    -- 关联产品（可空）
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- 统计
    download_count INTEGER DEFAULT 0,
    
    -- 版本信息
    version VARCHAR(50),
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    
    -- 排序
    sort_order INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_downloads_product ON downloads(product_id);
CREATE INDEX idx_downloads_type ON downloads(file_type);
CREATE INDEX idx_downloads_active ON downloads(is_active) WHERE is_active = true;

-- ============================================
-- 7. news 新闻资讯表
-- ============================================
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本信息
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    cover_image TEXT,
    excerpt TEXT,
    content_html TEXT NOT NULL,
    
    -- 分类标签
    category VARCHAR(50) DEFAULT 'news',
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- 状态
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    
    -- 统计
    view_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- 发布时间
    published_at TIMESTAMPTZ,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_news_slug ON news(slug);
CREATE INDEX idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX idx_news_featured ON news(is_featured) WHERE is_featured = true;

-- ============================================
-- 8. visit_logs 访问日志表
-- ============================================
CREATE TABLE visit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 访问信息
    ip_address INET NOT NULL,
    page_url TEXT NOT NULL,
    referer TEXT,
    user_agent TEXT,
    
    -- 地理信息（可选，由后端填充）
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- 设备信息
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- 会话标识
    session_id VARCHAR(255),
    
    -- 访问时间
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引（优化查询性能）
CREATE INDEX idx_visit_logs_time ON visit_logs(visited_at DESC);
CREATE INDEX idx_visit_logs_ip ON visit_logs(ip_address);
CREATE INDEX idx_visit_logs_page ON visit_logs(page_url);
-- 注意：基于日期的查询可以使用 idx_visit_logs_time 索引进行范围扫描

-- 分区策略（按月分区，提高大数据量查询性能）
-- 注意：Supabase 免费版可能不支持分区，生产环境可启用

-- ============================================
-- 9. pages 静态页面表（服务支持/荣誉墙/经销商等）
-- ============================================
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本信息
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content_html TEXT,
    
    -- 页面类型
    page_type VARCHAR(50) DEFAULT 'static',
    
    -- 状态
    is_published BOOLEAN DEFAULT true,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_pages_slug ON pages(slug);

-- 插入默认页面
INSERT INTO pages (title, slug, page_type) VALUES
    ('服务支持', 'support', 'static'),
    ('荣誉墙', 'honors', 'static'),
    ('经销商', 'dealers', 'static'),
    ('关于我们', 'about', 'static'),
    ('联系我们', 'contact', 'static');

-- ============================================
-- 10. admin_users 管理员表（扩展 Supabase Auth）
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 管理员信息
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'admin',
    
    -- MFA 配置
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    mfa_verified_at TIMESTAMPTZ,
    
    -- 状态
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 触发器：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加触发器
CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON site_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_blocks_updated_at BEFORE UPDATE ON product_media_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_downloads_updated_at BEFORE UPDATE ON downloads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. 函数：增加下载计数
-- ============================================
CREATE OR REPLACE FUNCTION increment_download_count(download_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE downloads
    SET download_count = download_count + 1
    WHERE id = download_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================
-- 13. 函数：增加新闻浏览量
-- ============================================
CREATE OR REPLACE FUNCTION increment_news_view_count(news_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE news
    SET view_count = view_count + 1
    WHERE id = news_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================
-- 14. 视图：今日访问统计
-- ============================================
CREATE OR REPLACE VIEW today_visit_stats AS
SELECT 
    COUNT(*) as total_visits,
    COUNT(DISTINCT ip_address) as unique_visitors,
    COUNT(DISTINCT page_url) as pages_viewed
FROM visit_logs
WHERE DATE(visited_at) = CURRENT_DATE;

-- ============================================
-- 15. 视图：热门产品（带分类信息）
-- ============================================
CREATE OR REPLACE VIEW hot_products_view AS
SELECT 
    p.*,
    c.name as category_name,
    c.slug as category_slug
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_hot = true AND p.is_active = true
ORDER BY p.sort_order;

-- ============================================
-- RLS (Row Level Security) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_media_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- site_config RLS 策略
-- ============================================
-- 所有人可读
CREATE POLICY "site_config_read_all" ON site_config
    FOR SELECT USING (true);

-- 仅管理员可写
CREATE POLICY "site_config_admin_write" ON site_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- categories RLS 策略
-- ============================================
-- 所有人可读激活的分类
CREATE POLICY "categories_read_active" ON categories
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "categories_admin_read_all" ON categories
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "categories_admin_write" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- products RLS 策略
-- ============================================
-- 所有人可读激活的产品
CREATE POLICY "products_read_active" ON products
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "products_admin_read_all" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "products_admin_write" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- product_media_blocks RLS 策略
-- ============================================
-- 所有人可读
CREATE POLICY "media_blocks_read_all" ON product_media_blocks
    FOR SELECT USING (true);

-- 管理员可写
CREATE POLICY "media_blocks_admin_write" ON product_media_blocks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- downloads RLS 策略
-- ============================================
-- 所有人可读激活的下载
CREATE POLICY "downloads_read_active" ON downloads
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "downloads_admin_read_all" ON downloads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "downloads_admin_write" ON downloads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- news RLS 策略
-- ============================================
-- 所有人可读已发布的新闻
CREATE POLICY "news_read_published" ON news
    FOR SELECT USING (is_published = true);

-- 管理员可读所有
CREATE POLICY "news_admin_read_all" ON news
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "news_admin_write" ON news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- visit_logs RLS 策略
-- ============================================
-- 允许匿名插入（前端记录访问）
CREATE POLICY "visit_logs_insert_anon" ON visit_logs
    FOR INSERT WITH CHECK (true);

-- 管理员可读
CREATE POLICY "visit_logs_admin_read" ON visit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- pages RLS 策略
-- ============================================
-- 所有人可读已发布的页面
CREATE POLICY "pages_read_published" ON pages
    FOR SELECT USING (is_published = true);

-- 管理员可读所有
CREATE POLICY "pages_admin_read_all" ON pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "pages_admin_write" ON pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- admin_users RLS 策略
-- ============================================
-- 管理员只能读取自己的信息
CREATE POLICY "admin_users_read_own" ON admin_users
    FOR SELECT USING (id = auth.uid());

-- 管理员只能更新自己的信息
CREATE POLICY "admin_users_update_own" ON admin_users
    FOR UPDATE USING (id = auth.uid());

-- ============================================
-- Storage Bucket 配置（需要在 Supabase Dashboard 执行）
-- ============================================
-- 创建存储桶：products, downloads, news, general
-- 
-- INSERT INTO storage.buckets (id, name, public) VALUES 
--     ('products', 'products', true),
--     ('downloads', 'downloads', true),
--     ('news', 'news', true),
--     ('general', 'general', true);
--
-- 存储策略需要在 Dashboard 中配置

-- ============================================
-- 完成提示
-- ============================================
COMMENT ON SCHEMA public IS 'Aune Audio CMS Database Schema - v1.0.0';

