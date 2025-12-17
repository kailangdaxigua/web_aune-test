-- ============================================
-- 007 新闻资讯重构 + 全局配置增强
-- 1. news 表结构变更（新增分类字段）
-- 2. site_config 表新增客服链接和经销商申请链接
-- ============================================

-- ============================================
-- 1. 新闻类型枚举
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_type_enum') THEN
        CREATE TYPE news_type_enum AS ENUM ('corporate', 'review', 'exhibition');
    END IF;
END $$;

-- ============================================
-- 2. 产品系列枚举（用于产品测评分类）
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_series_enum') THEN
        CREATE TYPE product_series_enum AS ENUM ('desktop', 'portable');
    END IF;
END $$;

-- ============================================
-- 3. 扩展 news 表结构
-- ============================================

-- 新增新闻类型字段
ALTER TABLE news 
    ADD COLUMN IF NOT EXISTS news_type news_type_enum DEFAULT 'corporate';

-- 新增产品系列字段（仅产品测评类型有效）
ALTER TABLE news 
    ADD COLUMN IF NOT EXISTS product_series product_series_enum;

-- 新增详情页顶部大图字段
ALTER TABLE news 
    ADD COLUMN IF NOT EXISTS content_banner_url TEXT;

-- 添加字段注释
COMMENT ON COLUMN news.news_type IS '新闻类型：corporate=企业动态, review=产品测评, exhibition=线下展示';
COMMENT ON COLUMN news.product_series IS '产品系列：desktop=桌面系列, portable=便携系列（仅当 news_type=review 时有效）';
COMMENT ON COLUMN news.content_banner_url IS '详情页顶部大图URL';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_news_type ON news(news_type);
CREATE INDEX IF NOT EXISTS idx_news_product_series ON news(product_series) WHERE news_type = 'review';

-- ============================================
-- 4. 扩展 site_config 表
-- ============================================

-- QQ 在线客服链接
ALTER TABLE site_config 
    ADD COLUMN IF NOT EXISTS qq_service_link TEXT DEFAULT 'https://wpa.qq.com/msgrd?v=3&uin=123456789&site=qq&menu=yes';

-- 经销商申请页面链接
ALTER TABLE site_config 
    ADD COLUMN IF NOT EXISTS dealer_apply_link TEXT DEFAULT '/page/dealer-apply';

-- 添加字段注释
COMMENT ON COLUMN site_config.qq_service_link IS 'QQ在线客服链接（自助服务和FAQ底部共用）';
COMMENT ON COLUMN site_config.dealer_apply_link IS '申请成为经销商的跳转链接';

-- ============================================
-- 5. 更新现有新闻数据（可选，将所有现有新闻设为企业动态）
-- ============================================
UPDATE news 
SET news_type = 'corporate' 
WHERE news_type IS NULL;

-- ============================================
-- 6. 创建按类型获取新闻的函数
-- ============================================
CREATE OR REPLACE FUNCTION get_news_by_type(
    p_news_type news_type_enum DEFAULT NULL,
    p_product_series product_series_enum DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug VARCHAR(255),
    excerpt TEXT,
    cover_image TEXT,
    content_banner_url TEXT,
    news_type news_type_enum,
    product_series product_series_enum,
    published_at TIMESTAMPTZ,
    view_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.title::TEXT,
        n.slug,
        n.excerpt,
        n.cover_image,
        n.content_banner_url,
        n.news_type,
        n.product_series,
        n.published_at,
        n.view_count
    FROM news n
    WHERE n.is_published = true
        AND (p_news_type IS NULL OR n.news_type = p_news_type)
        AND (p_product_series IS NULL OR n.product_series = p_product_series)
    ORDER BY n.published_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 7. 插入示例新闻数据（包含 content_html）
-- ============================================
INSERT INTO news (title, slug, excerpt, content_html, news_type, product_series, is_published, published_at)
VALUES 
    ('aune 2024年度新品发布会圆满落幕', 'aune-2024-annual-launch', '在深圳国际会展中心，aune举办了2024年度新品发布会...', '<h2>精彩回顾</h2><p>在深圳国际会展中心，aune举办了2024年度新品发布会，现场发布了多款重磅新品。</p><p>本次发布会吸引了众多媒体和HiFi爱好者参与，反响热烈。</p>', 'corporate', NULL, true, NOW() - INTERVAL '5 days'),
    ('aune X8 桌面解码耳放一体机深度评测', 'aune-x8-review', '这是一款面向桌面HiFi用户的高端解码耳放一体机...', '<h2>外观设计</h2><p>X8采用全铝合金机身，做工精细，手感出色。</p><h2>声音表现</h2><p>声音通透自然，解析力出色，推力充沛。</p>', 'review', 'desktop', true, NOW() - INTERVAL '10 days'),
    ('aune B1s 便携耳放评测：随身发烧新选择', 'aune-b1s-review', '小巧便携却拥有强劲的推力和优秀的声音表现...', '<h2>便携设计</h2><p>B1s体积小巧，方便随身携带。</p><h2>续航表现</h2><p>内置大容量电池，续航可达10小时以上。</p>', 'review', 'portable', true, NOW() - INTERVAL '15 days'),
    ('aune 广州音响展精彩回顾', 'aune-gz-audio-show-2024', '在刚刚结束的广州国际音响唱片展上，aune展位人气火爆...', '<h2>展会亮点</h2><p>在刚刚结束的广州国际音响唱片展上，aune展位人气火爆，众多发烧友驻足试听。</p><p>感谢各位的支持与厚爱！</p>', 'exhibition', NULL, true, NOW() - INTERVAL '20 days'),
    ('aune 上海国际Hi-Fi展览会展位预告', 'aune-shanghai-hifi-show', '诚邀各位烧友莅临上海国际Hi-Fi展览会aune展位...', '<h2>展会信息</h2><p>诚邀各位烧友莅临上海国际Hi-Fi展览会aune展位，体验最新产品。</p><p>展位号：A101，期待您的光临！</p>', 'exhibition', NULL, true, NOW() - INTERVAL '25 days')
ON CONFLICT (slug) DO UPDATE SET 
    news_type = EXCLUDED.news_type,
    product_series = EXCLUDED.product_series,
    content_html = EXCLUDED.content_html,
    updated_at = NOW();

-- ============================================
-- 版本标记
-- ============================================
COMMENT ON SCHEMA public IS 'News Restructure & Settings Enhancement - v1.0.7';

