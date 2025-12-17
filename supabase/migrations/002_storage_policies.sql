-- ============================================
-- Storage Bucket RLS 策略配置
-- 允许管理员上传、读取和删除文件
-- ============================================

-- 创建存储桶（如果不存在）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]),
    ('downloads', 'downloads', true, 104857600, NULL),
    ('news', 'news', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]),
    ('general', 'general', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- products 存储桶策略
-- ============================================

-- 所有人可以读取（公开访问）
CREATE POLICY "products_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'products');

-- 管理员可以上传
CREATE POLICY "products_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'products'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "products_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'products'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "products_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'products'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- downloads 存储桶策略
-- ============================================

-- 所有人可以读取
CREATE POLICY "downloads_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'downloads');

-- 管理员可以上传
CREATE POLICY "downloads_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'downloads'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "downloads_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'downloads'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "downloads_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'downloads'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- news 存储桶策略
-- ============================================

-- 所有人可以读取
CREATE POLICY "news_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'news');

-- 管理员可以上传
CREATE POLICY "news_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'news'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "news_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'news'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "news_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'news'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- general 存储桶策略
-- ============================================

-- 所有人可以读取
CREATE POLICY "general_read_all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'general');

-- 管理员可以上传
CREATE POLICY "general_admin_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'general'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以更新
CREATE POLICY "general_admin_update" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'general'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 管理员可以删除
CREATE POLICY "general_admin_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'general'
        AND EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- ============================================
-- 完成提示
-- ============================================
COMMENT ON SCHEMA public IS 'Storage RLS Policies Configured - v1.0.1';

