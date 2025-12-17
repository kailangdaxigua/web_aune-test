-- ============================================
-- Video Storage Bucket RLS 策略配置
-- 支持首页视频本地上传功能
-- ============================================

-- 创建 videos 存储桶
-- 允许更大的文件大小（100MB）用于视频上传
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('videos', 'videos', true, 104857600, ARRAY[
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-ms-wmv'
    ]::text[])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 创建 carousel 存储桶（用于轮播图）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('carousel', 'carousel', true, 10485760, ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif'
    ]::text[])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 创建 pages 存储桶（用于静态页面富文本中的图片）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('pages', 'pages', true, 5242880, ARRAY[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ]::text[])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- videos 存储桶策略
-- ============================================

-- 所有人可以读取（公开访问）
CREATE POLICY "videos_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'videos');

-- 管理员可以上传
CREATE POLICY "videos_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'videos'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "videos_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'videos'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "videos_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'videos'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- carousel 存储桶策略
-- ============================================

-- 所有人可以读取
CREATE POLICY "carousel_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'carousel');

-- 管理员可以上传
CREATE POLICY "carousel_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'carousel'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "carousel_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'carousel'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "carousel_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'carousel'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- pages 存储桶策略
-- ============================================

-- 所有人可以读取
CREATE POLICY "pages_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'pages');

-- 管理员可以上传
CREATE POLICY "pages_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'pages'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "pages_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'pages'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "pages_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'pages'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- 完成提示
-- ============================================
COMMENT ON SCHEMA public IS 'Storage RLS Policies - Videos, Carousel, Pages - v1.0.2';

