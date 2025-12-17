-- ============================================
-- Aune Audio CMS Database Schema Enhancement
-- Version: 1.1.0
-- Description: 页脚管理、轮播图、首页视频、导航缩略图增强
-- ============================================

-- ============================================
-- 1. 视频来源类型枚举
-- ============================================
CREATE TYPE video_source_type AS ENUM ('local', 'external');

-- ============================================
-- 2. 页脚链接分组枚举
-- ============================================
CREATE TYPE footer_link_group AS ENUM (
    'purchase_channels',   -- 购买渠道
    'about_aune',          -- 关于aune
    'service_support',     -- 服务支持
    'official_platforms'   -- 官方平台
);

-- ============================================
-- 3. footer_links 页脚链接独立表
-- 支持 CRUD 管理，关联 pages 表实现富文本内容
-- ============================================
CREATE TABLE footer_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 分组
    link_group footer_link_group NOT NULL,
    
    -- 链接信息
    label VARCHAR(100) NOT NULL,
    url TEXT,                          -- 外部链接URL
    page_id UUID REFERENCES pages(id) ON DELETE SET NULL,  -- 关联内部页面
    is_external BOOLEAN DEFAULT false, -- 是否外部链接
    
    -- 显示控制
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- 图标（用于官方平台等需要显示图标的链接）
    icon_url TEXT,
    icon_class VARCHAR(100),           -- CSS图标类名，如 'icon-weibo'
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_footer_links_group ON footer_links(link_group);
CREATE INDEX idx_footer_links_sort ON footer_links(link_group, sort_order);
CREATE INDEX idx_footer_links_active ON footer_links(is_active) WHERE is_active = true;

-- 添加触发器
CREATE TRIGGER update_footer_links_updated_at BEFORE UPDATE ON footer_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认页脚链接
-- 购买渠道
INSERT INTO footer_links (link_group, label, url, is_external, sort_order) VALUES
    ('purchase_channels'::footer_link_group, '天猫旗舰店', 'https://aune.tmall.com', true, 1),
    ('purchase_channels'::footer_link_group, '试听体验店', '/dealers', false, 2),
    ('purchase_channels'::footer_link_group, '授权网络店', '/authorized-stores', false, 3);

-- 关于aune（关联pages表，需要先插入pages）
INSERT INTO pages (title, slug, page_type, content_html, is_published) VALUES
    ('了解aune', 'about-aune', 'static', '<h2>关于我们</h2><p>aune是一家专注于高端音频设备的品牌...</p>', true),
    ('加入我们', 'careers', 'static', '<h2>加入我们</h2><p>我们正在寻找优秀的人才...</p>', true),
    ('联系我们', 'contact', 'static', '<h2>联系我们</h2><p>客服热线：027-85420526</p>', true)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

-- 服务支持页面
INSERT INTO pages (title, slug, page_type, content_html, is_published) VALUES
    ('自助服务', 'self-service', 'static', '<h2>自助服务</h2><p>常见问题自助解答...</p>', true),
    ('热门问题', 'faq', 'static', '<h2>热门问题</h2><p>FAQ内容...</p>', true),
    ('售后政策', 'warranty', 'static', '<h2>售后政策</h2><p>售后政策详情...</p>', true)
ON CONFLICT (slug) DO UPDATE SET updated_at = NOW();

-- 关联页脚链接到pages
INSERT INTO footer_links (link_group, label, page_id, is_external, sort_order)
SELECT 'about_aune'::footer_link_group, '了解aune', id, false, 1 FROM pages WHERE slug = 'about-aune'
UNION ALL
SELECT 'about_aune'::footer_link_group, '加入我们', id, false, 2 FROM pages WHERE slug = 'careers'
UNION ALL
SELECT 'about_aune'::footer_link_group, '联系我们', id, false, 3 FROM pages WHERE slug = 'contact'
UNION ALL
SELECT 'about_aune'::footer_link_group, '新闻资讯', NULL, false, 4;  -- 新闻资讯链接到 /news

-- 更新新闻资讯的URL
UPDATE footer_links SET url = '/news' WHERE label = '新闻资讯' AND link_group = 'about_aune'::footer_link_group;

-- 服务支持
INSERT INTO footer_links (link_group, label, page_id, is_external, sort_order)
SELECT 'service_support'::footer_link_group, '自助服务', id, false, 1 FROM pages WHERE slug = 'self-service'
UNION ALL
SELECT 'service_support'::footer_link_group, '热门问题', id, false, 2 FROM pages WHERE slug = 'faq'
UNION ALL
SELECT 'service_support'::footer_link_group, '相关下载', NULL, false, 3
UNION ALL
SELECT 'service_support'::footer_link_group, '售后政策', id, false, 4 FROM pages WHERE slug = 'warranty';

-- 更新相关下载的URL
UPDATE footer_links SET url = '/downloads' WHERE label = '相关下载' AND link_group = 'service_support'::footer_link_group;

-- 官方平台
INSERT INTO footer_links (link_group, label, url, is_external, icon_class, sort_order) VALUES
    ('official_platforms'::footer_link_group, '新浪微博', 'https://weibo.com/auneaudio', true, 'icon-weibo', 1),
    ('official_platforms'::footer_link_group, '官方微信', '#', true, 'icon-wechat', 2),
    ('official_platforms'::footer_link_group, '百度贴吧', 'https://tieba.baidu.com/f?kw=aune', true, 'icon-tieba', 3),
    ('official_platforms'::footer_link_group, 'QQ群', '#', true, 'icon-qq', 4);

-- ============================================
-- 4. home_carousel 首页轮播图独立表
-- ============================================
CREATE TABLE home_carousel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 轮播图内容
    title VARCHAR(255),                -- 标题（可选，用于后台识别）
    image_url TEXT NOT NULL,           -- 图片URL
    mobile_image_url TEXT,             -- 移动端图片（可选）
    
    -- 链接
    link_url TEXT,                     -- 点击跳转链接
    link_target VARCHAR(20) DEFAULT '_self',  -- _self 或 _blank
    
    -- 叠加文字（可选）
    overlay_title TEXT,                -- 叠加标题
    overlay_subtitle TEXT,             -- 叠加副标题
    overlay_position VARCHAR(20) DEFAULT 'center',  -- left, center, right
    
    -- 显示控制
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- 定时发布
    start_at TIMESTAMPTZ,              -- 开始显示时间
    end_at TIMESTAMPTZ,                -- 结束显示时间
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_carousel_sort ON home_carousel(sort_order);
CREATE INDEX idx_carousel_active ON home_carousel(is_active) WHERE is_active = true;
CREATE INDEX idx_carousel_schedule ON home_carousel(start_at, end_at);

-- 添加触发器
CREATE TRIGGER update_carousel_updated_at BEFORE UPDATE ON home_carousel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. home_videos 首页视频管理表
-- 支持本地上传和外部链接两种模式
-- ============================================
CREATE TABLE home_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本信息
    title VARCHAR(255) NOT NULL,       -- 视频标题
    description TEXT,                  -- 视频描述
    
    -- 视频来源
    source_type video_source_type NOT NULL DEFAULT 'external',
    video_url TEXT NOT NULL,           -- 视频URL（本地存储路径或外部链接）
    
    -- 外部平台信息（用于嵌入式播放）
    external_platform VARCHAR(50),     -- 'bilibili', 'youtube', 'youku' 等
    external_embed_code TEXT,          -- 嵌入代码（iframe等）
    
    -- 视频封面
    poster_url TEXT,                   -- 封面图URL
    
    -- 视频属性
    duration INTEGER,                  -- 时长（秒）
    aspect_ratio VARCHAR(20) DEFAULT '16:9',  -- 宽高比
    
    -- 播放设置
    autoplay BOOLEAN DEFAULT true,     -- 自动播放
    muted BOOLEAN DEFAULT true,        -- 静音
    loop BOOLEAN DEFAULT true,         -- 循环播放
    show_controls BOOLEAN DEFAULT false, -- 显示控制条
    
    -- 显示控制
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,  -- 是否为首页主视频
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_videos_active ON home_videos(is_active) WHERE is_active = true;
CREATE INDEX idx_videos_primary ON home_videos(is_primary) WHERE is_primary = true;
CREATE INDEX idx_videos_sort ON home_videos(sort_order);

-- 添加触发器
CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON home_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 确保只有一个主视频的触发器
CREATE OR REPLACE FUNCTION ensure_single_primary_video()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE home_videos SET is_primary = false WHERE id != NEW.id AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_primary_video
    BEFORE INSERT OR UPDATE ON home_videos
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_video();

-- ============================================
-- 6. 扩展 products 表
-- 添加导航栏缩略图字段
-- ============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS nav_thumbnail TEXT;

-- 添加注释
COMMENT ON COLUMN products.nav_thumbnail IS '导航栏下拉框中显示的缩略图/图标';

-- ============================================
-- 7. 扩展 site_config 表
-- 添加客服热线等配置字段
-- ============================================
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS hotline VARCHAR(50) DEFAULT '027-85420526';
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS copyright_text TEXT DEFAULT '© 2024 Aune Audio. All rights reserved.';
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS icp_number VARCHAR(100);
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS company_address TEXT;

-- ============================================
-- 8. 创建获取活跃轮播图的函数
-- ============================================
CREATE OR REPLACE FUNCTION get_active_carousel()
RETURNS SETOF home_carousel AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM home_carousel
    WHERE is_active = true
        AND (start_at IS NULL OR start_at <= NOW())
        AND (end_at IS NULL OR end_at >= NOW())
    ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 9. 创建获取首页主视频的函数
-- ============================================
CREATE OR REPLACE FUNCTION get_primary_home_video()
RETURNS home_videos AS $$
DECLARE
    result home_videos;
BEGIN
    SELECT * INTO result
    FROM home_videos
    WHERE is_active = true AND is_primary = true
    LIMIT 1;
    
    -- 如果没有主视频，返回第一个活跃视频
    IF result IS NULL THEN
        SELECT * INTO result
        FROM home_videos
        WHERE is_active = true
        ORDER BY sort_order
        LIMIT 1;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 10. 创建页脚链接视图（方便前端查询）
-- ============================================
CREATE OR REPLACE VIEW footer_links_view AS
SELECT 
    fl.*,
    p.title as page_title,
    p.slug as page_slug,
    CASE 
        WHEN fl.page_id IS NOT NULL THEN '/page/' || p.slug
        WHEN fl.url IS NOT NULL THEN fl.url
        ELSE '#'
    END as resolved_url
FROM footer_links fl
LEFT JOIN pages p ON fl.page_id = p.id
WHERE fl.is_active = true
ORDER BY fl.link_group, fl.sort_order;

-- ============================================
-- 11. 创建分组获取页脚链接的函数
-- ============================================
CREATE OR REPLACE FUNCTION get_footer_links_by_group(group_name footer_link_group)
RETURNS TABLE (
    id UUID,
    label VARCHAR(100),
    url TEXT,
    is_external BOOLEAN,
    icon_class VARCHAR(100),
    page_slug VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fl.id,
        fl.label,
        CASE 
            WHEN fl.page_id IS NOT NULL THEN '/page/' || p.slug
            WHEN fl.url IS NOT NULL THEN fl.url
            ELSE '#'
        END as url,
        fl.is_external,
        fl.icon_class,
        p.slug as page_slug
    FROM footer_links fl
    LEFT JOIN pages p ON fl.page_id = p.id
    WHERE fl.link_group = group_name AND fl.is_active = true
    ORDER BY fl.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE footer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_videos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- footer_links RLS 策略
-- ============================================
-- 所有人可读激活的链接
CREATE POLICY "footer_links_read_active" ON footer_links
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "footer_links_admin_read_all" ON footer_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "footer_links_admin_write" ON footer_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- home_carousel RLS 策略
-- ============================================
-- 所有人可读激活的轮播图
CREATE POLICY "carousel_read_active" ON home_carousel
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "carousel_admin_read_all" ON home_carousel
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "carousel_admin_write" ON home_carousel
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- home_videos RLS 策略
-- ============================================
-- 所有人可读激活的视频
CREATE POLICY "videos_read_active" ON home_videos
    FOR SELECT USING (is_active = true);

-- 管理员可读所有
CREATE POLICY "videos_admin_read_all" ON home_videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可写
CREATE POLICY "videos_admin_write" ON home_videos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- 完成提示
-- ============================================
COMMENT ON SCHEMA public IS 'Aune Audio CMS Database Schema - v1.1.0 Enhanced';

