-- ============================================
-- 006 经销商系统 + FAQ管理
-- 1. 经销商表（线下体验店 + 线上授权店）
-- 2. FAQ表
-- 3. 视频存储桶大小限制更新
-- ============================================

-- ============================================
-- 0. 创建 update_updated_at 函数（如果不存在）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. 经销商类型枚举
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dealer_type_enum') THEN
        CREATE TYPE dealer_type_enum AS ENUM ('offline', 'online');
    END IF;
END $$;

-- ============================================
-- 2. 经销商表
-- ============================================
CREATE TABLE IF NOT EXISTS dealers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 类型：线下体验店 / 线上授权店
    dealer_type dealer_type_enum NOT NULL DEFAULT 'offline',
    
    -- 基本信息
    name VARCHAR(255) NOT NULL,
    
    -- 线下店铺：省市地址
    province VARCHAR(50),
    city VARCHAR(50),
    address TEXT,
    
    -- 联系方式
    phone VARCHAR(50),
    contact_person VARCHAR(100),
    
    -- 线上店铺：平台和链接
    platform VARCHAR(50),           -- 京东/淘宝/天猫/拼多多等
    store_url TEXT,
    
    -- 店铺图片
    logo_url TEXT,
    cover_image TEXT,
    
    -- 营业信息
    business_hours VARCHAR(100),    -- 营业时间
    description TEXT,
    
    -- 排序和状态
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_dealers_type ON dealers(dealer_type);
CREATE INDEX IF NOT EXISTS idx_dealers_province ON dealers(province) WHERE dealer_type = 'offline';
CREATE INDEX IF NOT EXISTS idx_dealers_city ON dealers(city) WHERE dealer_type = 'offline';
CREATE INDEX IF NOT EXISTS idx_dealers_platform ON dealers(platform) WHERE dealer_type = 'online';
CREATE INDEX IF NOT EXISTS idx_dealers_active ON dealers(is_active) WHERE is_active = true;

-- 添加注释
COMMENT ON TABLE dealers IS '经销商管理表';
COMMENT ON COLUMN dealers.dealer_type IS '经销商类型：offline=线下体验店，online=线上授权店';
COMMENT ON COLUMN dealers.province IS '省份（仅线下店）';
COMMENT ON COLUMN dealers.city IS '城市（仅线下店）';
COMMENT ON COLUMN dealers.platform IS '电商平台（仅线上店）：京东/淘宝/天猫等';

-- ============================================
-- 3. FAQ表
-- ============================================
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 问答内容
    question TEXT NOT NULL,
    answer_html TEXT NOT NULL,
    
    -- 分类（可选）
    category VARCHAR(100),
    
    -- 排序和状态
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- 统计
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_faqs_sort ON faqs(sort_order);

-- 添加注释
COMMENT ON TABLE faqs IS 'FAQ常见问题管理表';

-- ============================================
-- 4. 自动更新 updated_at 触发器
-- ============================================
CREATE TRIGGER update_dealers_updated_at 
    BEFORE UPDATE ON dealers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_faqs_updated_at 
    BEFORE UPDATE ON faqs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. RLS 策略
-- ============================================

-- Dealers RLS
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

-- 公开读取活跃的经销商
CREATE POLICY "dealers_read_active" ON dealers
    FOR SELECT USING (is_active = true);

-- 管理员完全访问
CREATE POLICY "dealers_admin_all" ON dealers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- FAQs RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- 公开读取活跃的 FAQ
CREATE POLICY "faqs_read_active" ON faqs
    FOR SELECT USING (is_active = true);

-- 管理员完全访问
CREATE POLICY "faqs_admin_all" ON faqs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- 6. 更新视频存储桶大小限制为 500MB
-- ============================================
UPDATE storage.buckets 
SET file_size_limit = 524288000  -- 500MB
WHERE id = 'videos';

-- ============================================
-- 7. 添加全局配置字段
-- ============================================
ALTER TABLE site_config 
    ADD COLUMN IF NOT EXISTS qq_service_link TEXT DEFAULT 'https://wpa.qq.com/msgrd?v=3&uin=123456789',
    ADD COLUMN IF NOT EXISTS dealer_apply_page_slug TEXT DEFAULT 'dealer-apply';

COMMENT ON COLUMN site_config.qq_service_link IS 'QQ在线客服链接';
COMMENT ON COLUMN site_config.dealer_apply_page_slug IS '代理招纳页面的slug';

-- ============================================
-- 8. 插入示例数据
-- ============================================

-- 示例线下体验店
INSERT INTO dealers (dealer_type, name, province, city, address, phone, business_hours, is_active, sort_order)
VALUES 
    ('offline', 'aune武汉旗舰店', '湖北省', '武汉市', '武汉市洪山区光谷大道77号金融港B11栋', '027-85420526', '10:00-22:00', true, 1),
    ('offline', 'aune北京体验中心', '北京市', '北京市', '北京市海淀区中关村南大街5号理工科技大厦', '010-12345678', '10:00-21:00', true, 2),
    ('offline', 'aune上海旗舰店', '上海市', '上海市', '上海市浦东新区陆家嘴环路1000号恒生银行大厦', '021-87654321', '10:00-22:00', true, 3),
    ('offline', 'aune深圳体验店', '广东省', '深圳市', '深圳市南山区科技园南区高新南一道中科大厦', '0755-23456789', '10:00-21:30', true, 4),
    ('offline', 'aune成都体验店', '四川省', '成都市', '成都市高新区天府大道北段1700号环球中心', '028-34567890', '10:00-22:00', true, 5)
ON CONFLICT DO NOTHING;

-- 示例线上授权店
INSERT INTO dealers (dealer_type, name, platform, store_url, is_active, sort_order)
VALUES 
    ('online', 'aune官方旗舰店', '天猫', 'https://aune.tmall.com', true, 1),
    ('online', 'aune京东自营店', '京东', 'https://aune.jd.com', true, 2),
    ('online', 'aune官方淘宝店', '淘宝', 'https://shop.taobao.com/aune', true, 3),
    ('online', 'aune拼多多旗舰店', '拼多多', 'https://aune.pinduoduo.com', true, 4)
ON CONFLICT DO NOTHING;

-- 示例 FAQ
INSERT INTO faqs (question, answer_html, category, sort_order, is_active)
VALUES 
    ('如何连接蓝牙设备？', '<p>请按照以下步骤操作：</p><ol><li>确保设备已开机</li><li>长按蓝牙按钮3秒进入配对模式</li><li>在手机/电脑蓝牙设置中搜索并连接</li></ol>', '使用指南', 1, true),
    ('产品保修期是多久？', '<p>aune所有产品均享受<strong>一年质保</strong>服务。</p><p>保修期内，因产品质量问题导致的故障，我们提供免费维修或更换服务。</p>', '售后服务', 2, true),
    ('如何升级固件？', '<p>固件升级步骤：</p><ol><li>前往<a href="/downloads">下载中心</a>下载最新固件</li><li>将固件文件复制到设备存储根目录</li><li>安全弹出设备后重新开机</li><li>设备会自动检测并安装更新</li></ol>', '技术支持', 3, true),
    ('支持哪些音频格式？', '<p>aune设备支持以下格式：</p><ul><li>无损格式：FLAC, APE, WAV, AIFF, DSD</li><li>有损格式：MP3, AAC, OGG, WMA</li><li>高清格式：支持最高 32bit/768kHz PCM 和 DSD512</li></ul>', '技术支持', 4, true),
    ('产品出现杂音怎么办？', '<p>如果遇到杂音问题，请尝试：</p><ol><li>检查音频线缆是否连接牢固</li><li>尝试更换音频线</li><li>检查音源设备是否正常</li><li>重启设备</li></ol><p>如问题持续，请联系客服。</p>', '故障排查', 5, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 版本标记
-- ============================================
COMMENT ON SCHEMA public IS 'Dealers & FAQs System - v1.0.6';

