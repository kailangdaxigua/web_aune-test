-- ============================================
-- 009 - Home Featured Section Table
-- 首页热门推荐/广告位表
-- ============================================

-- ============================================
-- home_featured 首页精选推荐表
-- 支持自由添加图片 + 跳转链接（可以是内部页面或外部 URL）
-- ============================================
CREATE TABLE IF NOT EXISTS home_featured (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 图片信息
    image_url TEXT NOT NULL,                    -- 图片 URL
    mobile_image_url TEXT,                      -- 移动端图片 URL（可选）

    -- 链接信息
    target_url TEXT NOT NULL,                   -- 跳转链接（内部路径或外部 URL）
    is_external BOOLEAN DEFAULT false,          -- 是否外部链接
    link_target VARCHAR(20) DEFAULT '_self',    -- 链接打开方式：_self / _blank

    -- 可选的文字覆盖层
    title VARCHAR(255),                         -- 标题（可选）
    subtitle TEXT,                              -- 副标题（可选）

    -- 排序和状态
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- 有效期（可选）
    start_at TIMESTAMPTZ,                       -- 开始时间
    end_at TIMESTAMPTZ,                         -- 结束时间

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_home_featured_sort
    ON home_featured(sort_order);

CREATE INDEX IF NOT EXISTS idx_home_featured_active
    ON home_featured(is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_home_featured_date_range
    ON home_featured(start_at, end_at);

-- 自动更新 updated_at（依赖已有的 update_updated_at_column() 函数）
DROP TRIGGER IF EXISTS update_home_featured_updated_at ON home_featured;

CREATE TRIGGER update_home_featured_updated_at
    BEFORE UPDATE ON home_featured
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS 策略
-- ============================================

-- 启用 RLS
ALTER TABLE home_featured ENABLE ROW LEVEL SECURITY;

-- 所有人可读激活的记录（考虑有效期）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'home_featured'
          AND policyname = 'home_featured_read_active'
    ) THEN
        CREATE POLICY "home_featured_read_active" ON home_featured
            FOR SELECT USING (
                is_active = true
                AND (start_at IS NULL OR start_at <= NOW())
                AND (end_at IS NULL OR end_at >= NOW())
            );
    END IF;
END
$$;

-- 管理员可读所有
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'home_featured'
          AND policyname = 'home_featured_admin_read_all'
    ) THEN
        CREATE POLICY "home_featured_admin_read_all" ON home_featured
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM admin_users
                    WHERE admin_users.id = auth.uid()
                      AND admin_users.is_active = true
                )
            );
    END IF;
END
$$;

-- 管理员可写
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'home_featured'
          AND policyname = 'home_featured_admin_write'
    ) THEN
        CREATE POLICY "home_featured_admin_write" ON home_featured
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM admin_users
                    WHERE admin_users.id = auth.uid()
                      AND admin_users.is_active = true
                )
            );
    END IF;
END
$$;

-- ============================================
-- 完成提示
-- ============================================
COMMENT ON TABLE home_featured IS '首页热门推荐/广告位表 - 支持图片+跳转链接';

-- 1. 删除旧的只允许 is_active = true 的策略
DROP POLICY IF EXISTS "carousel_read_active" ON home_carousel;

-- 2. 新建更宽松的读取策略：
--    - 显式为 false 的才挡掉
--    - NULL 当成启用处理，兼容老数据
CREATE POLICY "carousel_read_active" ON home_carousel
    FOR SELECT USING (
        is_active IS DISTINCT FROM false
    );